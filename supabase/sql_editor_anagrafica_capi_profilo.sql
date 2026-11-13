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

-- Dopo aver creato un capo in Authentication → Invite user,
-- collega il profilo (esempio):
--
-- SELECT public.user_id_by_email('nuovo.capo@example.com');
-- UPDATE public.profiles
-- SET role = 'leader',
--     active_role = 'leader',
--     unit_id = '<uuid-unità-servizio>',
--     group_role = 'capo_unita',
--     full_name = 'Nome Cognome',
--     first_name = 'Nome',
--     last_name = 'Cognome'
-- WHERE id = public.user_id_by_email('nuovo.capo@example.com');
-- INSERT INTO public.role_memberships (user_id, role)
-- VALUES (public.user_id_by_email('nuovo.capo@example.com'), 'leader')
-- ON CONFLICT DO NOTHING;
