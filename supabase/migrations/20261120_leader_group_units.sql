-- =============================================================================
-- Scout-Up — capi: accesso a tutte le unità del proprio group_id (LC/EG/RS/COCA)
-- Prerequisito: 20261119_coca_comunita_capi.sql
-- COCA resta invisibile a member/parent (policy units/events già con barriera).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_leader_group_unit(p_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- True se auth.uid() è leader e p_unit_id appartiene allo stesso gruppo
  -- dell'unità di servizio (profiles.unit_id).
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

-- same_unit: unità di servizio OPPURE qualsiasi unità del gruppo (solo leader).
-- Sostituisce/amplia is_coca_accessible per LC/EG/RS/COCA del gruppo.
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

-- is_coca_accessible resta usata nelle policy esplicite COCA; allineata al gruppo.
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
