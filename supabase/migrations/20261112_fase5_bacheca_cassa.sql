-- =============================================================================
-- Scout-Up Fase 5 — bacheca/circolari, materiali, cassa/economato
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE public.announcement_audience AS ENUM ('unit', 'subgroup', 'parents');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fee_status AS ENUM ('unpaid', 'paid', 'waived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.cash_entry_kind AS ENUM ('expense', 'reimbursement', 'income');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.announcement_audience IS 'Destinatari: unità, sottogruppo, solo genitori.';
COMMENT ON TYPE public.fee_status IS 'Stato quota annuale.';
COMMENT ON TYPE public.cash_entry_kind IS 'Movimento cassa: spesa, rimborso, entrata.';

-- -----------------------------------------------------------------------------
-- 1. Circolari / bacheca
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id      uuid NOT NULL REFERENCES public.units (id) ON DELETE CASCADE,
  subgroup_id  uuid REFERENCES public.subgroups (id) ON DELETE SET NULL,
  audience     public.announcement_audience NOT NULL DEFAULT 'unit',
  title        text NOT NULL,
  body         text NOT NULL,
  created_by   uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT announcements_subgroup_audience CHECK (
    (audience = 'subgroup' AND subgroup_id IS NOT NULL)
    OR (audience <> 'subgroup')
  )
);

CREATE INDEX IF NOT EXISTS idx_announcements_unit ON public.announcements (unit_id, created_at DESC);

COMMENT ON TABLE public.announcements IS 'Circolari/comunicazioni mirate per unità, sottogruppo o genitori.';

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.announcement_acks (
  announcement_id uuid NOT NULL REFERENCES public.announcements (id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

COMMENT ON TABLE public.announcement_acks IS 'Presa visione di una circolare da parte di un utente.';

CREATE INDEX IF NOT EXISTS idx_announcement_acks_user ON public.announcement_acks (user_id);

-- Helper: può l'utente vedere questa circolare?
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
        -- Capo della stessa unità
        (public.is_leader() AND public.same_unit(a.unit_id))
        -- Member: audience unit (stessa unità) o subgroup del proprio sottogruppo
        OR (
          EXISTS (
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
        -- Parent: audience parents o unit/subgroup se ha figli nel target
        OR (
          public.has_role('parent')
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
  )
$$;

-- -----------------------------------------------------------------------------
-- 2. Materiali (archivio capi) — URL, no storage obbligatorio
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.materials (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id      uuid NOT NULL REFERENCES public.units (id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  file_url     text NOT NULL,
  created_by   uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materials_unit ON public.materials (unit_id, created_at DESC);

COMMENT ON TABLE public.materials IS 'Archivio materiali per capi (titolo, descrizione, URL file).';

DROP TRIGGER IF EXISTS trg_materials_updated_at ON public.materials;
CREATE TRIGGER trg_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Cassa / economato MVP
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.annual_fees (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id      uuid NOT NULL REFERENCES public.units (id) ON DELETE CASCADE,
  member_id    uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title        text NOT NULL,
  amount       numeric(10, 2) NOT NULL CHECK (amount >= 0),
  due_date     date,
  status       public.fee_status NOT NULL DEFAULT 'unpaid',
  notes        text,
  created_by   uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_annual_fees_unit ON public.annual_fees (unit_id);
CREATE INDEX IF NOT EXISTS idx_annual_fees_member ON public.annual_fees (member_id);

COMMENT ON TABLE public.annual_fees IS 'Quote annuali / quote associate al ragazzo.';

DROP TRIGGER IF EXISTS trg_annual_fees_updated_at ON public.annual_fees;
CREATE TRIGGER trg_annual_fees_updated_at
  BEFORE UPDATE ON public.annual_fees
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.cash_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id      uuid NOT NULL REFERENCES public.units (id) ON DELETE CASCADE,
  kind         public.cash_entry_kind NOT NULL,
  title        text NOT NULL,
  amount       numeric(10, 2) NOT NULL CHECK (amount >= 0),
  receipt_url  text,
  member_id    uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  notes        text,
  created_by   uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_entries_unit ON public.cash_entries (unit_id, created_at DESC);

COMMENT ON TABLE public.cash_entries IS 'Spese, rimborsi ed entrate (URL ricevuta opzionale).';

DROP TRIGGER IF EXISTS trg_cash_entries_updated_at ON public.cash_entries;
CREATE TRIGGER trg_cash_entries_updated_at
  BEFORE UPDATE ON public.cash_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements FORCE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_acks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_acks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials FORCE ROW LEVEL SECURITY;
ALTER TABLE public.annual_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_fees FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_entries FORCE ROW LEVEL SECURITY;

-- announcements
DROP POLICY IF EXISTS announcements_select ON public.announcements;
DROP POLICY IF EXISTS announcements_insert ON public.announcements;
DROP POLICY IF EXISTS announcements_update ON public.announcements;
DROP POLICY IF EXISTS announcements_delete ON public.announcements;

CREATE POLICY announcements_select ON public.announcements
  FOR SELECT TO authenticated
  USING (public.can_read_announcement(id));

CREATE POLICY announcements_insert ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_leader() AND public.same_unit(unit_id) AND created_by = auth.uid());

CREATE POLICY announcements_update ON public.announcements
  FOR UPDATE TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id))
  WITH CHECK (public.is_leader() AND public.same_unit(unit_id));

CREATE POLICY announcements_delete ON public.announcements
  FOR DELETE TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id));

-- acks
DROP POLICY IF EXISTS announcement_acks_select ON public.announcement_acks;
DROP POLICY IF EXISTS announcement_acks_insert ON public.announcement_acks;
DROP POLICY IF EXISTS announcement_acks_delete ON public.announcement_acks;

CREATE POLICY announcement_acks_select ON public.announcement_acks
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.is_leader()
      AND EXISTS (
        SELECT 1 FROM public.announcements a
        WHERE a.id = announcement_id AND public.same_unit(a.unit_id)
      )
    )
  );

CREATE POLICY announcement_acks_insert ON public.announcement_acks
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_read_announcement(announcement_id)
  );

CREATE POLICY announcement_acks_delete ON public.announcement_acks
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- materials: solo capi unità
DROP POLICY IF EXISTS materials_select ON public.materials;
DROP POLICY IF EXISTS materials_insert ON public.materials;
DROP POLICY IF EXISTS materials_update ON public.materials;
DROP POLICY IF EXISTS materials_delete ON public.materials;

CREATE POLICY materials_select ON public.materials
  FOR SELECT TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id));

CREATE POLICY materials_insert ON public.materials
  FOR INSERT TO authenticated
  WITH CHECK (public.is_leader() AND public.same_unit(unit_id) AND created_by = auth.uid());

CREATE POLICY materials_update ON public.materials
  FOR UPDATE TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id))
  WITH CHECK (public.is_leader() AND public.same_unit(unit_id));

CREATE POLICY materials_delete ON public.materials
  FOR DELETE TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id));

-- annual fees
DROP POLICY IF EXISTS annual_fees_select ON public.annual_fees;
DROP POLICY IF EXISTS annual_fees_insert ON public.annual_fees;
DROP POLICY IF EXISTS annual_fees_update ON public.annual_fees;
DROP POLICY IF EXISTS annual_fees_delete ON public.annual_fees;

CREATE POLICY annual_fees_select ON public.annual_fees
  FOR SELECT TO authenticated
  USING (
    public.is_leader_of_member(member_id)
    OR member_id = auth.uid()
    OR public.is_parent_of(member_id)
  );

CREATE POLICY annual_fees_insert ON public.annual_fees
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_leader() AND public.same_unit(unit_id) AND created_by = auth.uid()
  );

CREATE POLICY annual_fees_update ON public.annual_fees
  FOR UPDATE TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id))
  WITH CHECK (public.is_leader() AND public.same_unit(unit_id));

CREATE POLICY annual_fees_delete ON public.annual_fees
  FOR DELETE TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id));

-- cash entries: gestione capo; lettura anche parent/member limitata non richiesta — solo capo MVP
DROP POLICY IF EXISTS cash_entries_select ON public.cash_entries;
DROP POLICY IF EXISTS cash_entries_insert ON public.cash_entries;
DROP POLICY IF EXISTS cash_entries_update ON public.cash_entries;
DROP POLICY IF EXISTS cash_entries_delete ON public.cash_entries;

CREATE POLICY cash_entries_select ON public.cash_entries
  FOR SELECT TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id));

CREATE POLICY cash_entries_insert ON public.cash_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_leader() AND public.same_unit(unit_id) AND created_by = auth.uid());

CREATE POLICY cash_entries_update ON public.cash_entries
  FOR UPDATE TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id))
  WITH CHECK (public.is_leader() AND public.same_unit(unit_id));

CREATE POLICY cash_entries_delete ON public.cash_entries
  FOR DELETE TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.announcement_acks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.annual_fees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_entries TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. Seed demo (idempotente, se esistono profili demo)
-- -----------------------------------------------------------------------------
INSERT INTO public.announcements (id, unit_id, subgroup_id, audience, title, body, created_by)
SELECT
  'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  NULL,
  'unit',
  'Benvenuti sulla bacheca Scout-Up',
  'Questa è la prima circolare di prova per tutta l''unità. Confermate la presa visione.',
  '11111111-1111-1111-1111-111111111101'
WHERE EXISTS (
  SELECT 1 FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111101'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title, body = EXCLUDED.body, audience = EXCLUDED.audience;

INSERT INTO public.announcements (id, unit_id, subgroup_id, audience, title, body, created_by)
SELECT
  'dddddddd-dddd-dddd-dddd-ddddddddddd2',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  NULL,
  'parents',
  'Avviso ai genitori — quote associative',
  'Le quote annuali 2025/2026 sono in fase di registrazione. Controllate la sezione Quote.',
  '11111111-1111-1111-1111-111111111101'
WHERE EXISTS (
  SELECT 1 FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111101'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title, body = EXCLUDED.body, audience = EXCLUDED.audience;

INSERT INTO public.materials (id, unit_id, title, description, file_url, created_by)
SELECT
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'Programma campo estate (bozza)',
  'Documento condiviso per lo staff.',
  'https://example.com/scout-up/programma-campo.pdf',
  '11111111-1111-1111-1111-111111111101'
WHERE EXISTS (
  SELECT 1 FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111101'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title, file_url = EXCLUDED.file_url;

INSERT INTO public.annual_fees (id, unit_id, member_id, title, amount, due_date, status, created_by)
SELECT
  'ffffffff-ffff-ffff-ffff-fffffffffff1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  '11111111-1111-1111-1111-111111111301',
  'Quota associativa 2025/2026',
  80.00,
  '2025-12-31',
  'unpaid',
  '11111111-1111-1111-1111-111111111101'
WHERE EXISTS (
  SELECT 1 FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111301'
)
ON CONFLICT (id) DO UPDATE
SET amount = EXCLUDED.amount, status = EXCLUDED.status;

INSERT INTO public.cash_entries (id, unit_id, kind, title, amount, receipt_url, created_by)
SELECT
  'ffffffff-ffff-ffff-ffff-fffffffffff2',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'expense',
  'Materiale cancelleria sede',
  24.50,
  'https://example.com/scout-up/ricevuta-cancelleria.pdf',
  '11111111-1111-1111-1111-111111111101'
WHERE EXISTS (
  SELECT 1 FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111101'
)
ON CONFLICT (id) DO UPDATE
SET amount = EXCLUDED.amount, title = EXCLUDED.title;
