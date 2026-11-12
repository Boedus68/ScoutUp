-- =============================================================================
-- Scout-Up — enum COCA (+ formation) in transaction dedicata
-- Deve restare un file separato: in PostgreSQL <15 (e in migration wrappate)
-- il nuovo valore enum non è usabile nella stessa transaction dell'ADD VALUE.
-- =============================================================================

ALTER TYPE public.scout_branch ADD VALUE IF NOT EXISTS 'COCA';

COMMENT ON TYPE public.scout_branch IS
  'Branca AGESCI-like: LC, EG, RS, COCA (Comunità Capi — solo leader).';

ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'formation';

COMMENT ON TYPE public.event_type IS
  'Tipo evento: meeting, overnight, camp, route, council, formation.';
