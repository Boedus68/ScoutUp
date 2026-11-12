-- =============================================================================
-- Scout-Up Fase 4 — progressione personale AGESCI + note staff
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE public.progression_kind AS ENUM (
    'tappa',
    'specialita',
    'brevetto',
    'punto_strada'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.progression_status AS ENUM (
    'in_progress', -- in corso
    'requested',   -- richiesta verifica/conquista
    'conquered',   -- conquistata
    'rejected'     -- rifiutata dal capo (può essere riproposta)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.progression_kind IS 'Tipo item: tappa, specialità, brevetto, punto strada.';
COMMENT ON TYPE public.progression_status IS 'Stati: in corso, richiesta, conquistata, rifiutata.';

-- Catalogo branch-aware (LC/EG/RS) da cui assegnare / richiedere
CREATE TABLE IF NOT EXISTS public.progression_catalog (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch      public.scout_branch NOT NULL,
  kind        public.progression_kind NOT NULL,
  code        text,
  title       text NOT NULL,
  description text,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_progression_catalog_branch
  ON public.progression_catalog (branch, sort_order);

COMMENT ON TABLE public.progression_catalog IS
  'Catalogo progressione per branca. Gli item dei ragazzi riferiscono opzionalmente qui.';

-- Progressione per ragazzo
CREATE TABLE IF NOT EXISTS public.progression_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  catalog_id    uuid REFERENCES public.progression_catalog (id) ON DELETE SET NULL,
  branch        public.scout_branch NOT NULL,
  kind          public.progression_kind NOT NULL,
  title         text NOT NULL,
  status        public.progression_status NOT NULL DEFAULT 'in_progress',
  staff_comment text,
  requested_at  timestamptz,
  decided_at    timestamptz,
  decided_by    uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  assigned_by   uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_progression_items_member ON public.progression_items (member_id);
CREATE INDEX IF NOT EXISTS idx_progression_items_status ON public.progression_items (status);
CREATE INDEX IF NOT EXISTS idx_progression_items_branch ON public.progression_items (branch);

COMMENT ON TABLE public.progression_items IS
  'Progressione personale del member (tappe/specialità/brevetti/punto strada).';

DROP TRIGGER IF EXISTS trg_progression_items_updated_at ON public.progression_items;
CREATE TRIGGER trg_progression_items_updated_at
  BEFORE UPDATE ON public.progression_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Note educative riservate (solo capi unità)
CREATE TABLE IF NOT EXISTS public.staff_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_notes_member ON public.staff_notes (member_id);

COMMENT ON TABLE public.staff_notes IS
  'Note educative riservate: SELECT/WRITE solo leader della stessa unità del ragazzo.';

DROP TRIGGER IF EXISTS trg_staff_notes_updated_at ON public.staff_notes;
CREATE TRIGGER trg_staff_notes_updated_at
  BEFORE UPDATE ON public.staff_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.progression_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_catalog FORCE ROW LEVEL SECURITY;
ALTER TABLE public.progression_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_notes FORCE ROW LEVEL SECURITY;

-- Catalog: lettura per autenticati (serve a tutti i ruoli per UI branch);
-- scrittura solo leader (gestione catalogo unità/gruppo — MVP semplice)
DROP POLICY IF EXISTS progression_catalog_select ON public.progression_catalog;
DROP POLICY IF EXISTS progression_catalog_write_leader ON public.progression_catalog;

CREATE POLICY progression_catalog_select ON public.progression_catalog
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY progression_catalog_write_leader ON public.progression_catalog
  FOR ALL TO authenticated
  USING (public.is_leader())
  WITH CHECK (public.is_leader());

-- Items
DROP POLICY IF EXISTS progression_items_select ON public.progression_items;
DROP POLICY IF EXISTS progression_items_insert ON public.progression_items;
DROP POLICY IF EXISTS progression_items_update ON public.progression_items;
DROP POLICY IF EXISTS progression_items_delete ON public.progression_items;

CREATE POLICY progression_items_select ON public.progression_items
  FOR SELECT TO authenticated
  USING (
    member_id = auth.uid()
    OR public.is_leader_of_member(member_id)
  );

CREATE POLICY progression_items_insert ON public.progression_items
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      member_id = auth.uid()
      AND status = 'requested'
    )
    OR public.is_leader_of_member(member_id)
  );

CREATE POLICY progression_items_update ON public.progression_items
  FOR UPDATE TO authenticated
  USING (
    member_id = auth.uid()
    OR public.is_leader_of_member(member_id)
  )
  WITH CHECK (
    (
      member_id = auth.uid()
      AND status IN ('requested', 'in_progress')
    )
    OR public.is_leader_of_member(member_id)
  );

CREATE POLICY progression_items_delete ON public.progression_items
  FOR DELETE TO authenticated
  USING (public.is_leader_of_member(member_id));

-- Staff notes: SOLO leader stessa unità
DROP POLICY IF EXISTS staff_notes_select ON public.staff_notes;
DROP POLICY IF EXISTS staff_notes_insert ON public.staff_notes;
DROP POLICY IF EXISTS staff_notes_update ON public.staff_notes;
DROP POLICY IF EXISTS staff_notes_delete ON public.staff_notes;

CREATE POLICY staff_notes_select ON public.staff_notes
  FOR SELECT TO authenticated
  USING (public.is_leader_of_member(member_id));

CREATE POLICY staff_notes_insert ON public.staff_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_leader_of_member(member_id)
    AND author_id = auth.uid()
  );

CREATE POLICY staff_notes_update ON public.staff_notes
  FOR UPDATE TO authenticated
  USING (
    public.is_leader_of_member(member_id)
    AND author_id = auth.uid()
  )
  WITH CHECK (
    public.is_leader_of_member(member_id)
    AND author_id = auth.uid()
  );

CREATE POLICY staff_notes_delete ON public.staff_notes
  FOR DELETE TO authenticated
  USING (
    public.is_leader_of_member(member_id)
    AND author_id = auth.uid()
  );

GRANT SELECT ON public.progression_catalog TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.progression_catalog TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progression_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_notes TO authenticated;

-- Seed catalogo minimo LC / EG / RS
INSERT INTO public.progression_catalog (id, branch, kind, code, title, description, sort_order) VALUES
  -- LC
  ('f1000000-0000-4000-8000-000000000101', 'LC', 'tappa', 'LC-T1', 'Coccinella / Lupetto fedele', 'Prima tappa LC', 10),
  ('f1000000-0000-4000-8000-000000000102', 'LC', 'tappa', 'LC-T2', 'Coccinella / Lupetto concreto', 'Seconda tappa LC', 20),
  ('f1000000-0000-4000-8000-000000000103', 'LC', 'specialita', 'LC-S1', 'Specialità Natura', NULL, 30),
  ('f1000000-0000-4000-8000-000000000104', 'LC', 'specialita', 'LC-S2', 'Specialità Manualità', NULL, 40),
  -- EG
  ('f1000000-0000-4000-8000-000000000201', 'EG', 'tappa', 'EG-T1', 'Noviziato', 'Ingresso in reparto', 10),
  ('f1000000-0000-4000-8000-000000000202', 'EG', 'tappa', 'EG-T2', 'Seconda classe', NULL, 20),
  ('f1000000-0000-4000-8000-000000000203', 'EG', 'tappa', 'EG-T3', 'Prima classe', NULL, 30),
  ('f1000000-0000-4000-8000-000000000204', 'EG', 'brevetto', 'EG-B1', 'Brevetto Guida', NULL, 40),
  ('f1000000-0000-4000-8000-000000000205', 'EG', 'brevetto', 'EG-B2', 'Brevetto Esploratore', NULL, 50),
  ('f1000000-0000-4000-8000-000000000206', 'EG', 'specialita', 'EG-S1', 'Specialità Cucina', NULL, 60),
  ('f1000000-0000-4000-8000-000000000207', 'EG', 'specialita', 'EG-S2', 'Specialità Orientamento', NULL, 70),
  -- RS
  ('f1000000-0000-4000-8000-000000000301', 'RS', 'punto_strada', 'RS-P1', 'Partenza', 'Inizio strada', 10),
  ('f1000000-0000-4000-8000-000000000302', 'RS', 'punto_strada', 'RS-P2', 'Querencia', NULL, 20),
  ('f1000000-0000-4000-8000-000000000303', 'RS', 'punto_strada', 'RS-P3', 'Meteora', NULL, 30),
  ('f1000000-0000-4000-8000-000000000304', 'RS', 'punto_strada', 'RS-P4', 'Sullivan', NULL, 40),
  ('f1000000-0000-4000-8000-000000000305', 'RS', 'specialita', 'RS-S1', 'Competenza Servizio', NULL, 50)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    kind = EXCLUDED.kind,
    branch = EXCLUDED.branch;
