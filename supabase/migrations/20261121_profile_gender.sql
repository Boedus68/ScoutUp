-- Sesso anagrafico per etichette contestuali (lupetto/lupetta, padre/madre, …).
-- Nullable: senza valore si usano forme neutre o doppie (es. lupetto/lupetta).

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

COMMENT ON TYPE public.profile_gender IS
  'Sesso anagrafico del profilo: M = maschile, F = femminile. NULL = non indicato.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender public.profile_gender;

COMMENT ON COLUMN public.profiles.gender IS
  'Sesso anagrafico opzionale. Usato solo per etichette UI (non per RLS).';
