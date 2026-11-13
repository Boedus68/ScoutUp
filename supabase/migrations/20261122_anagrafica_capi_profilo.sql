-- Anagrafica Capi (Co.Ca.) + campi profilo editabili.
-- first_name / last_name / address; RLS update tra capi dello stesso gruppo.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS address text;

COMMENT ON COLUMN public.profiles.first_name IS 'Nome (anagrafica).';
COMMENT ON COLUMN public.profiles.last_name IS 'Cognome (anagrafica).';
COMMENT ON COLUMN public.profiles.address IS 'Indirizzo postale (anagrafica).';

-- Backfill da full_name (primo token = nome, resto = cognome).
UPDATE public.profiles
SET
  first_name = COALESCE(
    first_name,
    NULLIF(trim(split_part(full_name, ' ', 1)), '')
  ),
  last_name = COALESCE(
    last_name,
    NULLIF(
      trim(substr(full_name, length(split_part(full_name, ' ', 1)) + 1)),
      ''
    )
  )
WHERE full_name IS NOT NULL
  AND (first_name IS NULL OR last_name IS NULL);

-- Capo può aggiornare sé, profili della propria unità / senza unità,
-- oppure altri capi dello stesso group_id (anagrafica Co.Ca.).
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
