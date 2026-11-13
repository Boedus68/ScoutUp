-- SQL Editor: colonna gender su profiles + esempi per etichette sidebar.
-- Idempotente. Esegui in Supabase → SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'profile_gender' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.profile_gender AS ENUM ('M', 'F');
  END IF;
END
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender public.profile_gender;

COMMENT ON COLUMN public.profiles.gender IS
  'Sesso anagrafico opzionale. Usato solo per etichette UI (non per RLS).';

-- Esempio Marco (Capo) — adatta gli UUID al tuo DB:
-- UPDATE public.profiles
-- SET gender = 'M'
-- WHERE id = '9cc20f3a-aa62-4c1f-a6d0-1643409f374d';

-- Verifica:
-- SELECT id, full_name, role, gender, group_role FROM public.profiles
-- WHERE id = '9cc20f3a-aa62-4c1f-a6d0-1643409f374d';
