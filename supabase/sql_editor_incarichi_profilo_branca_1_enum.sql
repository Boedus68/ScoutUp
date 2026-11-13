-- =============================================================================
-- Scout-Up — SQL Editor RUN 1/2 (postgres): enum Capo a disposizione
-- Nessun INSERT utenti. Dopo Run, esegui
--   sql_editor_incarichi_profilo_branca_2_colonne.sql
-- Equivalente: supabase/migrations/20261125_coca_group_role_capo_a_disposizione.sql
-- =============================================================================

ALTER TYPE public.coca_group_role ADD VALUE IF NOT EXISTS 'capo_a_disposizione';

COMMENT ON TYPE public.coca_group_role IS
  'Incarico in Comunità Capi / Gruppo: Capo Gruppo, Tesoriere, Segretario, Cambusiere, Maestro dei Novizi, Capo Unità, Capo a disposizione.';
