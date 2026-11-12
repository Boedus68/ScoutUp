-- =============================================================================
-- Scout-Up — CSV import helpers + cataloghi progressione AGESCI estesi
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Lookup auth user by email (solo leader). Non espone altre colonne.
CREATE OR REPLACE FUNCTION public.user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN NULL;
  END IF;
  IF NOT public.is_leader() THEN
    RAISE EXCEPTION 'solo leader';
  END IF;
  SELECT id INTO v_id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.user_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_id_by_email(text) TO authenticated;

COMMENT ON FUNCTION public.user_id_by_email(text) IS
  'Risolve auth.users.id da email. Solo leader. Per import CSV senza creare Auth dal client.';

-- Capo può aggiornare profili della propria unità OPPURE profili senza unità
-- (es. utente Auth appena creato, da assegnare in import censimento).
DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR (
      public.is_leader()
      AND (public.same_unit(unit_id) OR unit_id IS NULL)
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR (
      public.is_leader()
      AND (public.same_unit(unit_id) OR unit_id IS NULL)
    )
  );

-- Import censimento: capo può assegnare ruoli anche a profili senza unità (genitori).
DROP POLICY IF EXISTS role_memberships_insert_leader ON public.role_memberships;
CREATE POLICY role_memberships_insert_leader ON public.role_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (
      public.is_leader()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = user_id
          AND (public.same_unit(p.unit_id) OR p.unit_id IS NULL)
      )
    )
  );

GRANT UPDATE ON public.role_memberships TO authenticated;

-- -----------------------------------------------------------------------------
-- Catalogo progressione AGESCI ampliato (idempotente su id fissi)
-- -----------------------------------------------------------------------------
INSERT INTO public.progression_catalog (id, branch, kind, code, title, description, sort_order) VALUES
  -- LC — tappe
  ('f1000000-0000-4000-8000-000000000101', 'LC', 'tappa', 'LC-T1', 'Coccinella / Lupetto fedele', 'Prima tappa del sentiero LC', 10),
  ('f1000000-0000-4000-8000-000000000102', 'LC', 'tappa', 'LC-T2', 'Coccinella / Lupetto concreto', 'Seconda tappa del sentiero LC', 20),
  ('f1000000-0000-4000-8000-000000000105', 'LC', 'tappa', 'LC-T3', 'Coccinella / Lupetto gioioso', 'Terza tappa del sentiero LC', 25),
  ('f1000000-0000-4000-8000-000000000106', 'LC', 'tappa', 'LC-T4', 'Coccinella / Lupetto sensibile e vivo', 'Quarta tappa del sentiero LC', 28),
  -- LC — specialità
  ('f1000000-0000-4000-8000-000000000103', 'LC', 'specialita', 'LC-S1', 'Specialità Natura', 'Scoperta dell''ambiente', 30),
  ('f1000000-0000-4000-8000-000000000104', 'LC', 'specialita', 'LC-S2', 'Specialità Manualità', 'Lavori creativi e tecnici', 40),
  ('f1000000-0000-4000-8000-000000000107', 'LC', 'specialita', 'LC-S3', 'Specialità Sport', NULL, 45),
  ('f1000000-0000-4000-8000-000000000108', 'LC', 'specialita', 'LC-S4', 'Specialità Espressione', 'Canto, teatro, racconto', 48),
  ('f1000000-0000-4000-8000-000000000109', 'LC', 'specialita', 'LC-S5', 'Specialità Servizio', 'Piccoli gesti per gli altri', 50),
  ('f1000000-0000-4000-8000-000000000110', 'LC', 'specialita', 'LC-S6', 'Specialità Scienza', NULL, 52),

  -- EG — tappe
  ('f1000000-0000-4000-8000-000000000201', 'EG', 'tappa', 'EG-T1', 'Noviziato', 'Ingresso in reparto', 10),
  ('f1000000-0000-4000-8000-000000000202', 'EG', 'tappa', 'EG-T2', 'Seconda classe', 'Competenze di base EG', 20),
  ('f1000000-0000-4000-8000-000000000203', 'EG', 'tappa', 'EG-T3', 'Prima classe', 'Autonomia e responsabilità', 30),
  -- EG — brevetti
  ('f1000000-0000-4000-8000-000000000204', 'EG', 'brevetto', 'EG-B1', 'Brevetto Guida', NULL, 40),
  ('f1000000-0000-4000-8000-000000000205', 'EG', 'brevetto', 'EG-B2', 'Brevetto Esploratore', NULL, 50),
  ('f1000000-0000-4000-8000-000000000208', 'EG', 'brevetto', 'EG-B3', 'Brevetto Sentinella', NULL, 55),
  ('f1000000-0000-4000-8000-000000000209', 'EG', 'brevetto', 'EG-B4', 'Brevetto Pioniere', NULL, 58),
  -- EG — specialità
  ('f1000000-0000-4000-8000-000000000206', 'EG', 'specialita', 'EG-S1', 'Specialità Cucina', NULL, 60),
  ('f1000000-0000-4000-8000-000000000207', 'EG', 'specialita', 'EG-S2', 'Specialità Orientamento', NULL, 70),
  ('f1000000-0000-4000-8000-000000000210', 'EG', 'specialita', 'EG-S3', 'Specialità Primo soccorso', NULL, 72),
  ('f1000000-0000-4000-8000-000000000211', 'EG', 'specialita', 'EG-S4', 'Specialità Natura', NULL, 74),
  ('f1000000-0000-4000-8000-000000000212', 'EG', 'specialita', 'EG-S5', 'Specialità Informatica', NULL, 76),
  ('f1000000-0000-4000-8000-000000000213', 'EG', 'specialita', 'EG-S6', 'Specialità Fotografia', NULL, 78),
  ('f1000000-0000-4000-8000-000000000214', 'EG', 'specialita', 'EG-S7', 'Specialità Escursionismo', NULL, 80),
  ('f1000000-0000-4000-8000-000000000215', 'EG', 'specialita', 'EG-S8', 'Specialità Nautica', NULL, 82),

  -- RS — punti di strada
  ('f1000000-0000-4000-8000-000000000301', 'RS', 'punto_strada', 'RS-P1', 'Partenza', 'Inizio della Strada', 10),
  ('f1000000-0000-4000-8000-000000000302', 'RS', 'punto_strada', 'RS-P2', 'Querencia', NULL, 20),
  ('f1000000-0000-4000-8000-000000000303', 'RS', 'punto_strada', 'RS-P3', 'Meteora', NULL, 30),
  ('f1000000-0000-4000-8000-000000000304', 'RS', 'punto_strada', 'RS-P4', 'Sullivan', NULL, 40),
  -- RS — specialità / competenze
  ('f1000000-0000-4000-8000-000000000305', 'RS', 'specialita', 'RS-S1', 'Competenza Servizio', NULL, 50),
  ('f1000000-0000-4000-8000-000000000306', 'RS', 'specialita', 'RS-S2', 'Competenza Animazione', NULL, 55),
  ('f1000000-0000-4000-8000-000000000307', 'RS', 'specialita', 'RS-S3', 'Competenza Natura e ambiente', NULL, 60),
  ('f1000000-0000-4000-8000-000000000308', 'RS', 'specialita', 'RS-S4', 'Competenza Comunicazione', NULL, 65),
  ('f1000000-0000-4000-8000-000000000309', 'RS', 'specialita', 'RS-S5', 'Competenza Cittadinanza', NULL, 70),
  ('f1000000-0000-4000-8000-000000000310', 'RS', 'specialita', 'RS-S6', 'Competenza Fede', NULL, 75)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    kind = EXCLUDED.kind,
    branch = EXCLUDED.branch,
    code = EXCLUDED.code;
