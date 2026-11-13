-- =============================================================================
-- Scout-Up — SQL Editor: accesso capo a tutte le unità del gruppo
-- Equivalente a supabase/migrations/20261120_leader_group_units.sql
-- Esegui PRIMA di creare/usare LC/RS/COCA nello switcher (dopo migration Co.Ca.).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_leader_group_unit(p_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_leader()
    AND EXISTS (
      SELECT 1
      FROM public.units u
      WHERE u.id = p_unit_id
        AND u.group_id IS NOT NULL
        AND u.group_id IN (SELECT public.leader_service_group_ids())
    );
$$;

COMMENT ON FUNCTION public.is_leader_group_unit(uuid) IS
  'True se il capo può gestire l''unità perché è nello stesso group_id del servizio.';

CREATE OR REPLACE FUNCTION public.same_unit(p_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_unit_id IS NOT NULL
    AND (
      (
        public.current_unit_id() IS NOT NULL
        AND p_unit_id = public.current_unit_id()
      )
      OR public.is_leader_group_unit(p_unit_id)
    );
$$;

COMMENT ON FUNCTION public.same_unit(uuid) IS
  'Unità di servizio del profilo, oppure (solo leader) qualsiasi unità dello stesso gruppo.';

CREATE OR REPLACE FUNCTION public.is_coca_accessible(p_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_leader_group_unit(p_unit_id)
    AND public.is_coca_unit(p_unit_id);
$$;

GRANT EXECUTE ON FUNCTION public.is_leader_group_unit(uuid) TO authenticated;
