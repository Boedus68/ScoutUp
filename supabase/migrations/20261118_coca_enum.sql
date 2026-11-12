-- =============================================================================
-- Scout-Up — enum COCA (+ formation) in transaction dedicata
-- Deve restare un file separato: prima di PostgreSQL 15 il nuovo valore enum
-- non è usabile nella stessa transaction dell'ADD VALUE.
--
-- Supabase SQL Editor: NON incollare insieme a 20261119. Usa lo script unico
--   supabase/sql_editor_coca_comunita_capi.sql
-- (include COMMIT dopo gli ADD VALUE). Oppure esegui questo file, poi 20261119.
-- =============================================================================

ALTER TYPE public.scout_branch ADD VALUE IF NOT EXISTS 'COCA';

COMMENT ON TYPE public.scout_branch IS
  'Branca AGESCI-like: LC, EG, RS, COCA (Comunita Capi - solo leader).';

ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'formation';

COMMENT ON TYPE public.event_type IS
  'Tipo evento: meeting, overnight, camp, route, council, formation.';
