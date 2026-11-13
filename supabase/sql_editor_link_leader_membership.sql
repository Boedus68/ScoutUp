-- =============================================================================
-- Scout-Up — SQL Editor: collega un capo (bypass RLS) + RPC per l'app
--
-- Esegui in Supabase Dashboard → SQL Editor come ruolo **postgres**
-- (default). postgres bypassa RLS: è il percorso admin. Non usare
-- «Run as role» → authenticated (fallirebbe di nuovo su role_memberships).
--
-- user_id_by_email() richiede un JWT leader: da SQL Editor (auth.uid() NULL)
-- solleva «solo leader». Qui si legge auth.users direttamente.
--
-- Nessun enum nuovo: un solo run, idempotente.
-- Equivalente migration: supabase/migrations/20261123_link_leader_by_email.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Workaround IMMEDIATO — boedus@gmail.com come leader/segretario su Co.Ca.
--    Prerequisito: l'utente esiste in Authentication (Invite user già fatto).
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_email text := 'boedus@gmail.com';
  v_unit  uuid := 'e1d0e8fa-8c25-404c-8684-901be769bc28';
  v_id    uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.units WHERE id = v_unit) THEN
    RAISE EXCEPTION 'Unità % assente', v_unit;
  END IF;

  SELECT id INTO v_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_id IS NULL THEN
    RAISE EXCEPTION
      'Utente assente in Auth: Authentication → Users → Invite user: %',
      v_email;
  END IF;

  INSERT INTO public.profiles (
    id, full_name, role, active_role, unit_id, group_role
  )
  VALUES (
    v_id,
    COALESCE(
      (SELECT nullif(trim(full_name), '') FROM public.profiles WHERE id = v_id),
      v_email
    ),
    'leader',
    'leader',
    v_unit,
    'segretario'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'leader',
    active_role = 'leader',
    unit_id = EXCLUDED.unit_id,
    group_role = 'segretario';

  INSERT INTO public.role_memberships (user_id, role)
  VALUES (v_id, 'leader')
  ON CONFLICT DO NOTHING;
END $$;

-- Verifica
SELECT
  au.email,
  p.role,
  p.active_role,
  p.unit_id,
  p.group_role,
  rm.role AS membership_role
FROM auth.users au
JOIN public.profiles p ON p.id = au.id
LEFT JOIN public.role_memberships rm
  ON rm.user_id = p.id AND rm.role = 'leader'
WHERE lower(au.email) = 'boedus@gmail.com';
-- atteso: role=leader, group_role=segretario, unit_id=e1d0e8fa-…, membership_role=leader

-- -----------------------------------------------------------------------------
-- B) RPC per «Collega capo» dall'app (dopo questo run, senza allargare RLS)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_group_anagrafica(p_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_leader()
    AND p_unit_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.units target
      JOIN public.profiles me ON me.id = auth.uid()
      JOIN public.units mine ON mine.id IN (me.unit_id, me.active_unit_id)
      WHERE target.id = p_unit_id
        AND target.group_id IS NOT NULL
        AND mine.group_id IS NOT NULL
        AND target.group_id = mine.group_id
        AND (
          me.group_role IN (
            'capo_gruppo'::public.coca_group_role,
            'capo_unita'::public.coca_group_role
          )
          OR mine.branch::text = 'COCA'
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.link_leader_by_email(
  p_email text,
  p_unit_id uuid,
  p_full_name text,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_group_role public.coca_group_role DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_id uuid;
  v_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non autenticato';
  END IF;

  IF p_email IS NULL OR length(trim(p_email)) = 0 OR position('@' IN p_email) = 0 THEN
    RAISE EXCEPTION 'email non valida';
  END IF;

  IF p_unit_id IS NULL THEN
    RAISE EXCEPTION 'unità non indicata';
  END IF;

  IF NOT public.can_manage_group_anagrafica(p_unit_id) THEN
    RAISE EXCEPTION 'solo un capo del gruppo (Co.Ca. o Capo Gruppo / Capo Unità) può collegare un capo';
  END IF;

  SELECT u.id INTO v_id
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(p_email))
  LIMIT 1;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'utente assente in Auth';
  END IF;

  v_name := nullif(trim(coalesce(p_full_name, '')), '');
  IF v_name IS NULL THEN
    v_name := trim(p_email);
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    first_name,
    last_name,
    phone,
    role,
    active_role,
    unit_id,
    group_role
  )
  VALUES (
    v_id,
    v_name,
    nullif(trim(coalesce(p_first_name, '')), ''),
    nullif(trim(coalesce(p_last_name, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    'leader',
    'leader',
    p_unit_id,
    p_group_role
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    first_name = COALESCE(EXCLUDED.first_name, public.profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.profiles.last_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    role = 'leader',
    active_role = 'leader',
    unit_id = EXCLUDED.unit_id,
    group_role = EXCLUDED.group_role;

  INSERT INTO public.role_memberships (user_id, role)
  VALUES (v_id, 'leader')
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_group_anagrafica(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_group_anagrafica(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.link_leader_by_email(text, uuid, text, text, text, text, public.coca_group_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_leader_by_email(text, uuid, text, text, text, text, public.coca_group_role) TO authenticated;
