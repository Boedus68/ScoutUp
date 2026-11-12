-- =============================================================================
-- Scout-Up Fase 2 — eventi tipizzati, quote, conferma, autorizzazioni
-- Incremental su Fase 1. Idempotente dove pratico.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Enum nuovi / estensione attendance_status con late (Ritardo)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.event_type AS ENUM (
    'meeting',    -- Riunione / Attività
    'overnight',  -- Uscita con pernotto
    'camp',       -- Campo
    'route',      -- Route
    'council'     -- Consiglio Capi
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('unpaid', 'paid', 'waived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.confirmation_status AS ENUM ('pending', 'attending', 'not_attending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.authorization_status AS ENUM ('pending', 'authorized', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Aggiunge 'late' all'enum esistente se manca
DO $$ BEGIN
  ALTER TYPE public.attendance_status ADD VALUE IF NOT EXISTS 'late';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

COMMENT ON TYPE public.event_type IS 'Tipo evento: meeting, overnight, camp, route, council.';
COMMENT ON TYPE public.payment_status IS 'Stato quota: unpaid | paid | waived.';
COMMENT ON TYPE public.confirmation_status IS 'Conferma partecipazione ragazzo/genitore.';
COMMENT ON TYPE public.authorization_status IS 'Autorizzazione digitale genitore.';

-- -----------------------------------------------------------------------------
-- 2. events — tipo, quota, equipaggiamento
-- -----------------------------------------------------------------------------
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_type public.event_type NOT NULL DEFAULT 'meeting',
  ADD COLUMN IF NOT EXISTS fee_amount numeric(10, 2),
  ADD COLUMN IF NOT EXISTS equipment_list text;

COMMENT ON COLUMN public.events.event_type IS 'Tipologia attività scout.';
COMMENT ON COLUMN public.events.fee_amount IS 'Quota economica richiesta (EUR), opzionale.';
COMMENT ON COLUMN public.events.equipment_list IS 'Lista equipaggiamento (testo o URL), MVP.';

CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.events (event_type);

-- -----------------------------------------------------------------------------
-- 3. attendances — pagamento quota (scritto dal capo)
-- -----------------------------------------------------------------------------
ALTER TABLE public.attendances
  ADD COLUMN IF NOT EXISTS payment_status public.payment_status NOT NULL DEFAULT 'unpaid';

COMMENT ON COLUMN public.attendances.payment_status IS 'Pagamento quota per (evento, member). Solo capo in scrittura.';

-- -----------------------------------------------------------------------------
-- 4. event_confirmations — conferma presenza (ragazzo o genitore)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_confirmations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  member_id    uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status       public.confirmation_status NOT NULL DEFAULT 'pending',
  confirmed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_confirmations_event_member_unique UNIQUE (event_id, member_id)
);

COMMENT ON TABLE public.event_confirmations IS
  'Conferma partecipazione a un evento. Scrivibile da member (sé) o parent (figlio).';

CREATE INDEX IF NOT EXISTS idx_event_confirmations_event_id ON public.event_confirmations (event_id);
CREATE INDEX IF NOT EXISTS idx_event_confirmations_member_id ON public.event_confirmations (member_id);

DROP TRIGGER IF EXISTS trg_event_confirmations_updated_at ON public.event_confirmations;
CREATE TRIGGER trg_event_confirmations_updated_at
  BEFORE UPDATE ON public.event_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. event_authorizations — autorizzazione digitale one-tap del genitore
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_authorizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  member_id       uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  parent_id       uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status          public.authorization_status NOT NULL DEFAULT 'authorized',
  authorized_at   timestamptz NOT NULL DEFAULT now(),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_authorizations_event_member_unique UNIQUE (event_id, member_id),
  CONSTRAINT event_authorizations_parent_not_child CHECK (parent_id <> member_id)
);

COMMENT ON TABLE public.event_authorizations IS
  'Autorizzazione digitale genitore per (evento, figlio). Visibile al capo del registro.';

CREATE INDEX IF NOT EXISTS idx_event_authorizations_event_id ON public.event_authorizations (event_id);
CREATE INDEX IF NOT EXISTS idx_event_authorizations_member_id ON public.event_authorizations (member_id);
CREATE INDEX IF NOT EXISTS idx_event_authorizations_parent_id ON public.event_authorizations (parent_id);

DROP TRIGGER IF EXISTS trg_event_authorizations_updated_at ON public.event_authorizations;
CREATE TRIGGER trg_event_authorizations_updated_at
  BEFORE UPDATE ON public.event_authorizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.event_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_confirmations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.event_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_authorizations FORCE ROW LEVEL SECURITY;

-- Confirmations: lettura capo unità / genitore figlio / member sé
DROP POLICY IF EXISTS event_confirmations_select ON public.event_confirmations;
DROP POLICY IF EXISTS event_confirmations_upsert_self ON public.event_confirmations;
DROP POLICY IF EXISTS event_confirmations_insert ON public.event_confirmations;
DROP POLICY IF EXISTS event_confirmations_update ON public.event_confirmations;
DROP POLICY IF EXISTS event_confirmations_delete ON public.event_confirmations;

CREATE POLICY event_confirmations_select ON public.event_confirmations
  FOR SELECT TO authenticated
  USING (
    member_id = auth.uid()
    OR public.is_parent_of(member_id)
    OR (
      public.is_leader()
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id AND public.same_unit(e.unit_id)
      )
    )
  );

CREATE POLICY event_confirmations_insert ON public.event_confirmations
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      member_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.events e
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE e.id = event_id AND e.unit_id = p.unit_id
      )
    )
    OR (
      public.is_parent_of(member_id)
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id AND e.unit_id IN (SELECT public.child_unit_ids())
      )
    )
  );

CREATE POLICY event_confirmations_update ON public.event_confirmations
  FOR UPDATE TO authenticated
  USING (
    member_id = auth.uid()
    OR public.is_parent_of(member_id)
  )
  WITH CHECK (
    member_id = auth.uid()
    OR public.is_parent_of(member_id)
  );

CREATE POLICY event_confirmations_delete ON public.event_confirmations
  FOR DELETE TO authenticated
  USING (
    member_id = auth.uid()
    OR public.is_parent_of(member_id)
    OR (
      public.is_leader()
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id AND public.same_unit(e.unit_id)
      )
    )
  );

-- Authorizations: genitore scrive per i figli; capo/member/parent leggono nel perimetro
DROP POLICY IF EXISTS event_authorizations_select ON public.event_authorizations;
DROP POLICY IF EXISTS event_authorizations_insert ON public.event_authorizations;
DROP POLICY IF EXISTS event_authorizations_update ON public.event_authorizations;
DROP POLICY IF EXISTS event_authorizations_delete ON public.event_authorizations;

CREATE POLICY event_authorizations_select ON public.event_authorizations
  FOR SELECT TO authenticated
  USING (
    parent_id = auth.uid()
    OR member_id = auth.uid()
    OR public.is_parent_of(member_id)
    OR (
      public.is_leader()
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id AND public.same_unit(e.unit_id)
      )
    )
  );

CREATE POLICY event_authorizations_insert ON public.event_authorizations
  FOR INSERT TO authenticated
  WITH CHECK (
    parent_id = auth.uid()
    AND public.is_parent_of(member_id)
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.unit_id IN (SELECT public.child_unit_ids())
    )
  );

CREATE POLICY event_authorizations_update ON public.event_authorizations
  FOR UPDATE TO authenticated
  USING (parent_id = auth.uid() AND public.is_parent_of(member_id))
  WITH CHECK (parent_id = auth.uid() AND public.is_parent_of(member_id));

CREATE POLICY event_authorizations_delete ON public.event_authorizations
  FOR DELETE TO authenticated
  USING (
    parent_id = auth.uid()
    OR (
      public.is_leader()
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id AND public.same_unit(e.unit_id)
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 7. Grants
-- -----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_confirmations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_authorizations TO authenticated;
