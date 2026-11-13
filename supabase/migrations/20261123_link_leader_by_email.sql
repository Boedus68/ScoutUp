-- =============================================================================
-- Scout-Up — collega un capo già in Auth senza INSERT JWT su role_memberships
-- La policy role_memberships_insert_leader richiede same_unit sul profilo
-- target (o unit_id NULL). Un capo in Co.Ca. che assegna un peer a un'unità
-- di servizio (o un profilo non ancora visibile in SELECT) riceve:
--   new row violates row-level security policy for table "role_memberships"
--
-- Non si allarga l'INSERT RLS: si usa un RPC SECURITY DEFINER invocabile
-- solo da un leader dello stesso gruppo in contesto Co.Ca. o con incarico
-- capo_gruppo / capo_unita.
-- SQL Editor (DB reale): supabase/sql_editor_link_leader_membership.sql
-- =============================================================================

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

COMMENT ON FUNCTION public.can_manage_group_anagrafica(uuid) IS
  'True se auth.uid() è leader e può gestire anagrafica capi sull''unità: stesso group_id e (Co.Ca. oppure incarico capo_gruppo/capo_unita).';

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

COMMENT ON FUNCTION public.link_leader_by_email(text, uuid, text, text, text, text, public.coca_group_role) IS
  'Collega un utente Auth esistente come leader sull''unità indicata. Solo capo Co.Ca. / Capo Gruppo / Capo Unità dello stesso gruppo. Non crea utenti Auth.';
