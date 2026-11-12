-- =============================================================================
-- Scout-Up — Comunità Capi (COCA): colonne, RLS, catalogo formativo
-- Prerequisito: 20261118_coca_enum.sql già eseguito E COMMITATO
--   (altrimenti: unsafe use of new value "COCA" / invalid input value for enum).
-- SQL Editor (tutto-in-uno): supabase/sql_editor_coca_comunita_capi.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Incarico Co.Ca. + unità attiva (solo UI; RLS resta capability-based)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.coca_group_role AS ENUM (
    'capo_gruppo',
    'tesoriere',
    'segretario',
    'cambusiere',
    'maestro_novizi',
    'capo_unita'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.coca_group_role IS
  'Incarico in Comunità Capi / Gruppo: Capo Gruppo, Tesoriere, Segretario, Cambusiere, Maestro dei Novizi, Capo Unità.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS group_role public.coca_group_role;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_unit_id uuid REFERENCES public.units (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.group_role IS
  'Incarico Co.Ca./Gruppo del capo (nullable).';
COMMENT ON COLUMN public.profiles.active_unit_id IS
  'Unità attiva in UI (servizio o Co.Ca.). Non determina da sola le capability RLS.';

CREATE INDEX IF NOT EXISTS idx_profiles_active_unit_id
  ON public.profiles (active_unit_id);
CREATE INDEX IF NOT EXISTS idx_profiles_group_role
  ON public.profiles (group_role);

-- -----------------------------------------------------------------------------
-- 2. Progressione: date/luogo tappe formative
-- -----------------------------------------------------------------------------
ALTER TABLE public.progression_items
  ADD COLUMN IF NOT EXISTS held_at date;

ALTER TABLE public.progression_items
  ADD COLUMN IF NOT EXISTS location text;

COMMENT ON COLUMN public.progression_items.held_at IS
  'Data svolgimento tappa formativa (es. CFT/CFM/CFA/Nomina).';
COMMENT ON COLUMN public.progression_items.location IS
  'Luogo della tappa formativa.';

-- -----------------------------------------------------------------------------
-- 3. Helper RLS: accesso COCA solo per leader dello stesso gruppo
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leader_service_group_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT u.group_id
  FROM public.units u
  WHERE u.group_id IS NOT NULL
    AND u.id = public.current_unit_id();
$$;

COMMENT ON FUNCTION public.leader_service_group_ids() IS
  'group_id dell''unità di servizio del profilo corrente (profiles.unit_id).';

CREATE OR REPLACE FUNCTION public.is_coca_unit(p_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.units u
    WHERE u.id = p_unit_id
      AND u.branch::text = 'COCA'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_coca_accessible(p_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Solo leader: member/parent non vedono mai unità COCA.
  SELECT public.is_leader()
    AND public.is_coca_unit(p_unit_id)
    AND EXISTS (
      SELECT 1
      FROM public.units u
      WHERE u.id = p_unit_id
        AND u.group_id IS NOT NULL
        AND u.group_id IN (SELECT public.leader_service_group_ids())
    );
$$;

COMMENT ON FUNCTION public.is_coca_accessible(uuid) IS
  'True se auth.uid() è leader e p_unit_id è COCA nello stesso group_id dell''unità di servizio.';

CREATE OR REPLACE FUNCTION public.same_unit(p_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_unit_id IS NOT NULL
    AND (
      (
        public.current_unit_id() IS NOT NULL
        AND p_unit_id = public.current_unit_id()
      )
      OR public.is_coca_accessible(p_unit_id)
    );
$$;

COMMENT ON FUNCTION public.same_unit(uuid) IS
  'Unità di servizio del profilo, oppure (solo leader) unità COCA dello stesso gruppo.';

CREATE OR REPLACE FUNCTION public.is_leader_peer_in_group(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_leader()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.units u_peer ON u_peer.id = p.unit_id
      WHERE p.id = p_profile_id
        AND EXISTS (
          SELECT 1 FROM public.role_memberships rm
          WHERE rm.user_id = p.id AND rm.role = 'leader'
        )
        AND u_peer.group_id IS NOT NULL
        AND u_peer.group_id IN (SELECT public.leader_service_group_ids())
    );
$$;

COMMENT ON FUNCTION public.is_leader_peer_in_group(uuid) IS
  'True se p_profile_id è un capo nello stesso gruppo dell''unità di servizio.';

CREATE OR REPLACE FUNCTION public.my_group_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT u.group_id
  FROM public.units u
  WHERE u.group_id IS NOT NULL
    AND (
      public.same_unit(u.id)
      OR u.id IN (SELECT public.child_unit_ids())
    );
$$;

-- -----------------------------------------------------------------------------
-- 4. Policy: units / events / attendances / announcements (+ profiles peer)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS units_select ON public.units;
CREATE POLICY units_select ON public.units
  FOR SELECT TO authenticated
  USING (
    (
      public.same_unit(id)
      OR id IN (SELECT public.child_unit_ids())
    )
    AND (
      branch::text <> 'COCA'
      OR public.is_leader()
    )
  );

DROP POLICY IF EXISTS units_insert_leader ON public.units;
CREATE POLICY units_insert_leader ON public.units
  FOR INSERT TO authenticated
  WITH CHECK (public.is_leader());

DROP POLICY IF EXISTS units_update_leader ON public.units;
CREATE POLICY units_update_leader ON public.units
  FOR UPDATE TO authenticated
  USING (public.is_leader() AND public.same_unit(id))
  WITH CHECK (public.is_leader() AND public.same_unit(id));

DROP POLICY IF EXISTS units_delete_leader ON public.units;
CREATE POLICY units_delete_leader ON public.units
  FOR DELETE TO authenticated
  USING (public.is_leader() AND public.same_unit(id));

DROP POLICY IF EXISTS events_select ON public.events;
CREATE POLICY events_select ON public.events
  FOR SELECT TO authenticated
  USING (
    (
      public.same_unit(unit_id)
      OR unit_id IN (SELECT public.child_unit_ids())
    )
    AND (
      NOT public.is_coca_unit(unit_id)
      OR public.is_leader()
    )
  );

DROP POLICY IF EXISTS events_insert_leader ON public.events;
CREATE POLICY events_insert_leader ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_leader()
    AND public.same_unit(unit_id)
    AND created_by = auth.uid()
    AND (
      NOT public.is_coca_unit(unit_id)
      OR public.is_coca_accessible(unit_id)
    )
  );

DROP POLICY IF EXISTS events_update_leader ON public.events;
CREATE POLICY events_update_leader ON public.events
  FOR UPDATE TO authenticated
  USING (
    public.is_leader()
    AND public.same_unit(unit_id)
    AND (
      NOT public.is_coca_unit(unit_id)
      OR public.is_coca_accessible(unit_id)
    )
  )
  WITH CHECK (
    public.is_leader()
    AND public.same_unit(unit_id)
    AND (
      NOT public.is_coca_unit(unit_id)
      OR public.is_coca_accessible(unit_id)
    )
  );

DROP POLICY IF EXISTS events_delete_leader ON public.events;
CREATE POLICY events_delete_leader ON public.events
  FOR DELETE TO authenticated
  USING (
    public.is_leader()
    AND public.same_unit(unit_id)
    AND (
      NOT public.is_coca_unit(unit_id)
      OR public.is_coca_accessible(unit_id)
    )
  );

DROP POLICY IF EXISTS attendances_select ON public.attendances;
CREATE POLICY attendances_select ON public.attendances
  FOR SELECT TO authenticated
  USING (
    member_id = auth.uid()
    OR public.is_parent_of(member_id)
    OR (
      public.is_leader()
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id
          AND public.same_unit(e.unit_id)
          AND (
            NOT public.is_coca_unit(e.unit_id)
            OR public.is_coca_accessible(e.unit_id)
          )
      )
    )
  );

DROP POLICY IF EXISTS attendances_insert_leader ON public.attendances;
CREATE POLICY attendances_insert_leader ON public.attendances
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_leader()
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND public.same_unit(e.unit_id)
        AND (
          NOT public.is_coca_unit(e.unit_id)
          OR public.is_coca_accessible(e.unit_id)
        )
    )
  );

DROP POLICY IF EXISTS attendances_update_leader ON public.attendances;
CREATE POLICY attendances_update_leader ON public.attendances
  FOR UPDATE TO authenticated
  USING (
    public.is_leader()
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND public.same_unit(e.unit_id)
        AND (
          NOT public.is_coca_unit(e.unit_id)
          OR public.is_coca_accessible(e.unit_id)
        )
    )
  )
  WITH CHECK (
    public.is_leader()
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND public.same_unit(e.unit_id)
        AND (
          NOT public.is_coca_unit(e.unit_id)
          OR public.is_coca_accessible(e.unit_id)
        )
    )
  );

DROP POLICY IF EXISTS attendances_delete_leader ON public.attendances;
CREATE POLICY attendances_delete_leader ON public.attendances
  FOR DELETE TO authenticated
  USING (
    public.is_leader()
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND public.same_unit(e.unit_id)
        AND (
          NOT public.is_coca_unit(e.unit_id)
          OR public.is_coca_accessible(e.unit_id)
        )
    )
  );

CREATE OR REPLACE FUNCTION public.can_read_announcement(p_announcement_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.announcements a
    WHERE a.id = p_announcement_id
      AND (
        (
          public.is_leader()
          AND public.same_unit(a.unit_id)
          AND (
            NOT public.is_coca_unit(a.unit_id)
            OR public.is_coca_accessible(a.unit_id)
          )
        )
        OR (
          NOT public.is_coca_unit(a.unit_id)
          AND EXISTS (
            SELECT 1 FROM public.profiles me
            WHERE me.id = auth.uid() AND me.role = 'member' AND me.unit_id = a.unit_id
              AND (
                a.audience = 'unit'
                OR (
                  a.audience = 'subgroup'
                  AND me.subgroup_id IS NOT NULL
                  AND me.subgroup_id = a.subgroup_id
                )
              )
          )
        )
        OR (
          NOT public.is_coca_unit(a.unit_id)
          AND public.has_role('parent')
          AND (
            (
              a.audience = 'parents'
              AND a.unit_id IN (SELECT public.child_unit_ids())
            )
            OR (
              a.audience = 'unit'
              AND a.unit_id IN (SELECT public.child_unit_ids())
            )
            OR (
              a.audience = 'subgroup'
              AND EXISTS (
                SELECT 1
                FROM public.parent_child pc
                JOIN public.profiles c ON c.id = pc.child_id
                WHERE pc.parent_id = auth.uid()
                  AND c.subgroup_id = a.subgroup_id
              )
            )
          )
        )
      )
  );
$$;

DROP POLICY IF EXISTS announcements_select ON public.announcements;
CREATE POLICY announcements_select ON public.announcements
  FOR SELECT TO authenticated
  USING (public.can_read_announcement(id));

DROP POLICY IF EXISTS announcements_insert ON public.announcements;
CREATE POLICY announcements_insert ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_leader()
    AND public.same_unit(unit_id)
    AND created_by = auth.uid()
    AND (
      NOT public.is_coca_unit(unit_id)
      OR public.is_coca_accessible(unit_id)
    )
  );

DROP POLICY IF EXISTS announcements_update ON public.announcements;
CREATE POLICY announcements_update ON public.announcements
  FOR UPDATE TO authenticated
  USING (
    public.is_leader()
    AND public.same_unit(unit_id)
    AND (
      NOT public.is_coca_unit(unit_id)
      OR public.is_coca_accessible(unit_id)
    )
  )
  WITH CHECK (
    public.is_leader()
    AND public.same_unit(unit_id)
    AND (
      NOT public.is_coca_unit(unit_id)
      OR public.is_coca_accessible(unit_id)
    )
  );

DROP POLICY IF EXISTS announcements_delete ON public.announcements;
CREATE POLICY announcements_delete ON public.announcements
  FOR DELETE TO authenticated
  USING (
    public.is_leader()
    AND public.same_unit(unit_id)
    AND (
      NOT public.is_coca_unit(unit_id)
      OR public.is_coca_accessible(unit_id)
    )
  );

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_parent_of(id)
    OR (public.is_leader() AND public.same_unit(unit_id))
    OR public.is_leader_peer_in_group(id)
  );

GRANT EXECUTE ON FUNCTION public.leader_service_group_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coca_unit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coca_accessible(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_leader_peer_in_group(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. Catalogo Iter Formativo Capi (branch = COCA)
-- -----------------------------------------------------------------------------
INSERT INTO public.progression_catalog (id, branch, kind, code, title, description, sort_order)
VALUES
  (
    'f4000000-0000-4000-8000-000000000401',
    'COCA',
    'tappa',
    'COCA-ACC',
    'Accoglienza / Tirocinio in Co.Ca.',
    'Ingresso in Comunità Capi e percorso di tirocinio.',
    10
  ),
  (
    'f4000000-0000-4000-8000-000000000402',
    'COCA',
    'tappa',
    'COCA-CFT',
    'CFT (Campo di Formazione Tirocinanti)',
    'Campo di Formazione Tirocinanti.',
    20
  ),
  (
    'f4000000-0000-4000-8000-000000000403',
    'COCA',
    'tappa',
    'COCA-CFM-LC',
    'CFM L/C (Campo di Formazione Metodologica Lupetti/Coccinelle)',
    'Campo di Formazione Metodologica branca L/C.',
    30
  ),
  (
    'f4000000-0000-4000-8000-000000000404',
    'COCA',
    'tappa',
    'COCA-CFM-EG',
    'CFM E/G (Campo di Formazione Metodologica Esploratori/Guide)',
    'Campo di Formazione Metodologica branca E/G.',
    40
  ),
  (
    'f4000000-0000-4000-8000-000000000405',
    'COCA',
    'tappa',
    'COCA-CFM-RS',
    'CFM R/S (Campo di Formazione Metodologica Rover/Scolte)',
    'Campo di Formazione Metodologica branca R/S.',
    50
  ),
  (
    'f4000000-0000-4000-8000-000000000406',
    'COCA',
    'tappa',
    'COCA-CFA',
    'CFA (Campo di Formazione Associativa)',
    'Campo di Formazione Associativa.',
    60
  ),
  (
    'f4000000-0000-4000-8000-000000000407',
    'COCA',
    'tappa',
    'COCA-NOM',
    'Nomina a Capo (Wood Badge)',
    'Nomina a Capo / Wood Badge.',
    70
  )
ON CONFLICT (id) DO UPDATE
SET branch = EXCLUDED.branch,
    kind = EXCLUDED.kind,
    code = EXCLUDED.code,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;
