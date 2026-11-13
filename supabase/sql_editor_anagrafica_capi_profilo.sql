-- SQL Editor: campi profilo + RLS update tra capi dello stesso gruppo.
-- Idempotente. Esegui in Supabase → SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS address text;

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

-- Collegare un capo (role_memberships): non usare INSERT con JWT leader.
-- SQL Editor come postgres: supabase/sql_editor_link_leader_membership.sql
