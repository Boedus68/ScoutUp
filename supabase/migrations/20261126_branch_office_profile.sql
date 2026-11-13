-- =============================================================================
-- Scout-Up — incarico branca (capo / aiuto + LC|EG|RS) su profiles
-- Prerequisito: 20261125_coca_group_role_capo_a_disposizione.sql già eseguito
--   E COMMITATO (altrimenti unsafe use of new value "capo_a_disposizione").
-- SQL Editor: sql_editor_incarichi_profilo_branca_2_colonne.sql
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.branch_office_kind AS ENUM (
    'capo_branca',
    'aiuto_capo_branca'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.branch_office_kind IS
  'Incarico in branca: Capo branca oppure Aiuto capo branca.';

DO $$ BEGIN
  CREATE TYPE public.youth_branch AS ENUM ('LC', 'EG', 'RS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.youth_branch IS
  'Branca di servizio (senza Co.Ca.): LC, EG, RS.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS branch_office public.branch_office_kind;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_branch public.youth_branch;

COMMENT ON COLUMN public.profiles.branch_office IS
  'Capo branca o Aiuto capo branca. Null se nessuna assegnazione.';
COMMENT ON COLUMN public.profiles.assigned_branch IS
  'Branca L/C, E/G o R/S. Null = Nessuno.';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_branch_assignment_pair;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_branch_assignment_pair CHECK (
    (branch_office IS NULL AND assigned_branch IS NULL)
    OR (branch_office IS NOT NULL AND assigned_branch IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_profiles_assigned_branch
  ON public.profiles (assigned_branch);

-- RLS: id = auth.uid() copre le nuove colonne (update proprio profilo).
DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR (
      public.is_leader()
      AND (
        public.same_unit(unit_id)
        OR unit_id IS NULL
        OR public.is_leader_peer_in_group(id)
      )
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR (
      public.is_leader()
      AND (
        public.same_unit(unit_id)
        OR unit_id IS NULL
        OR public.is_leader_peer_in_group(id)
      )
    )
  );
