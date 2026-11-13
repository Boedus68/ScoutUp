-- =============================================================================
-- Scout-Up — ADD VALUE incarico Co.Ca. «Capo a disposizione»
-- File separato: su PostgreSQL <15 il nuovo valore non è usabile nella stessa
-- transaction. SQL Editor: sql_editor_incarichi_profilo_branca_1_enum.sql
-- poi sql_editor_incarichi_profilo_branca_2_colonne.sql
-- =============================================================================

ALTER TYPE public.coca_group_role ADD VALUE IF NOT EXISTS 'capo_a_disposizione';

COMMENT ON TYPE public.coca_group_role IS
  'Incarico in Comunità Capi / Gruppo: Capo Gruppo, Tesoriere, Segretario, Cambusiere, Maestro dei Novizi, Capo Unità, Capo a disposizione.';
