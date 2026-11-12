-- =============================================================================
-- Scout-Up Fase 3 — scheda sanitaria GDPR (medical_records)
-- Incremental. Idempotente dove pratico.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.medical_records (
  member_id                 uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  food_allergies            text,
  drug_allergies            text,
  intolerances              text,
  ongoing_therapy           text,
  health_card_number        text,
  blood_type                text,
  emergency_contact_name    text,
  emergency_contact_phone   text,
  criticality_flag          boolean NOT NULL DEFAULT false,
  criticality_notes         text,
  updated_by                uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.medical_records IS
  'Scheda sanitaria GDPR del ragazzo. UPDATE solo genitore collegato; SELECT capi unità + genitore.';
COMMENT ON COLUMN public.medical_records.criticality_flag IS
  'Se true, il capo vede un badge allerta nel registro uscite.';
COMMENT ON COLUMN public.medical_records.criticality_notes IS
  'Sintesi criticità mostrata nel badge/modale capo (es. anafilassi).';
COMMENT ON COLUMN public.medical_records.health_card_number IS 'Numero tessera sanitaria.';
COMMENT ON COLUMN public.medical_records.blood_type IS 'Gruppo sanguigno (testo libero MVP).';

CREATE INDEX IF NOT EXISTS idx_medical_records_criticality
  ON public.medical_records (criticality_flag)
  WHERE criticality_flag = true;

DROP TRIGGER IF EXISTS trg_medical_records_updated_at ON public.medical_records;
CREATE TRIGGER trg_medical_records_updated_at
  BEFORE UPDATE ON public.medical_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Helper: capo della stessa unità del member_id
CREATE OR REPLACE FUNCTION public.is_leader_of_member(p_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_leader()
    AND EXISTS (
      SELECT 1 FROM public.profiles m
      WHERE m.id = p_member_id
        AND m.unit_id IS NOT NULL
        AND public.same_unit(m.unit_id)
    )
$$;

COMMENT ON FUNCTION public.is_leader_of_member(uuid) IS
  'True se auth.uid() è leader della stessa unità del member.';

ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS medical_records_select ON public.medical_records;
DROP POLICY IF EXISTS medical_records_insert_parent ON public.medical_records;
DROP POLICY IF EXISTS medical_records_update_parent ON public.medical_records;
DROP POLICY IF EXISTS medical_records_delete_parent ON public.medical_records;

-- SELECT: genitore del ragazzo OPPURE capo della sua unità
CREATE POLICY medical_records_select ON public.medical_records
  FOR SELECT TO authenticated
  USING (
    public.is_parent_of(member_id)
    OR public.is_leader_of_member(member_id)
  );

-- INSERT/UPDATE/DELETE: solo genitore collegato
CREATE POLICY medical_records_insert_parent ON public.medical_records
  FOR INSERT TO authenticated
  WITH CHECK (public.is_parent_of(member_id));

CREATE POLICY medical_records_update_parent ON public.medical_records
  FOR UPDATE TO authenticated
  USING (public.is_parent_of(member_id))
  WITH CHECK (public.is_parent_of(member_id));

CREATE POLICY medical_records_delete_parent ON public.medical_records
  FOR DELETE TO authenticated
  USING (public.is_parent_of(member_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_records TO authenticated;
