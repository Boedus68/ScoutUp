-- =============================================================================
-- Scout-Up — SQL Editor (postgres): incarico proprio + modifica/elimina eventi
-- Idempotente. Nessun INSERT utenti. Esegui dopo sql_editor_link_leader_membership.sql
-- Equivalente: supabase/migrations/20261124_event_manage_own_group_role.sql
-- =============================================================================

-- 1. profiles_update: id = auth.uid() copre tutte le colonne, incluso group_role.
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

COMMENT ON COLUMN public.profiles.group_role IS
  'Incarico Co.Ca./Gruppo del capo (nullable). Il capo può aggiornare il proprio da Il mio profilo.';

-- 2. Eventi: capo può scrivere se ha creato l'evento OPPURE condivide il gruppo.
CREATE OR REPLACE FUNCTION public.leader_shares_unit_group(p_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_leader()
    AND p_unit_id IS NOT NULL
    AND (
      public.same_unit(p_unit_id)
      OR EXISTS (
        SELECT 1
        FROM public.units target
        JOIN public.profiles me ON me.id = auth.uid()
        JOIN public.units mine ON mine.id IN (me.unit_id, me.active_unit_id)
        WHERE target.id = p_unit_id
          AND target.group_id IS NOT NULL
          AND mine.group_id IS NOT NULL
          AND target.group_id = mine.group_id
      )
    );
$$;

COMMENT ON FUNCTION public.leader_shares_unit_group(uuid) IS
  'True se auth.uid() è leader e p_unit_id è same_unit o nello stesso group_id (unit_id o active_unit_id).';

REVOKE ALL ON FUNCTION public.leader_shares_unit_group(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leader_shares_unit_group(uuid) TO authenticated;

DROP POLICY IF EXISTS events_insert_leader ON public.events;
CREATE POLICY events_insert_leader ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_leader()
    AND created_by = auth.uid()
    AND public.leader_shares_unit_group(unit_id)
    AND (
      NOT public.is_coca_unit(unit_id)
      OR public.is_leader()
    )
  );

DROP POLICY IF EXISTS events_update_leader ON public.events;
CREATE POLICY events_update_leader ON public.events
  FOR UPDATE TO authenticated
  USING (
    public.is_leader()
    AND (
      created_by = auth.uid()
      OR public.leader_shares_unit_group(unit_id)
    )
  )
  WITH CHECK (
    public.is_leader()
    AND (
      created_by = auth.uid()
      OR public.leader_shares_unit_group(unit_id)
    )
  );

DROP POLICY IF EXISTS events_delete_leader ON public.events;
CREATE POLICY events_delete_leader ON public.events
  FOR DELETE TO authenticated
  USING (
    public.is_leader()
    AND (
      created_by = auth.uid()
      OR public.leader_shares_unit_group(unit_id)
    )
  );
