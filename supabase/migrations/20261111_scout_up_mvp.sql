-- =============================================================================
-- Scout-Up / DidUp-like — schema MVP (auth + unità + eventi/presenze)
-- Applicare in Supabase Dashboard → SQL Editor (una sola esecuzione).
-- Idempotente dove pratico: tipi via DO/EXCEPTION, tabelle IF NOT EXISTS,
-- policy DROP+CREATE, indici IF NOT EXISTS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Estensioni
-- gen_random_uuid() è in pgcrypto (abilitato di default su Supabase).
-- uuid-ossp resta opzionale se preferisci uuid_generate_v4().
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 2. Enum / tipi
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('leader', 'member', 'parent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.scout_branch AS ENUM ('LC', 'EG', 'RS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'justified');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.app_role IS 'Ruolo utente: leader (capo/staff), member (ragazzo), parent (genitore).';
COMMENT ON TYPE public.scout_branch IS 'Branca AGESCI-like: LC (Lupetti/Coccinelle), EG (Esploratori/Guide), RS (Rover/Scolte).';
COMMENT ON TYPE public.attendance_status IS 'Stato presenza: presente, assente, giustificato.';

-- -----------------------------------------------------------------------------
-- 3. Tabelle
-- -----------------------------------------------------------------------------

-- Unità / reparti (es. "Reparto EG Aquile")
CREATE TABLE IF NOT EXISTS public.units (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  branch      public.scout_branch NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.units IS 'Unità scout (branco/branco/reparto/clan) associate a una branca.';

-- Profili applicativi
-- Collegamento auth: profiles.id = auth.users.id (1:1).
-- Alla registrazione creare (o aggiornare) la riga in profiles con lo stesso UUID
-- di auth.users, tipicamente via trigger handle_new_user oppure dal client
-- subito dopo signUp. Senza riga profiles l''utente autenticato non ha ruolo.
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  role        public.app_role NOT NULL,
  unit_id     uuid REFERENCES public.units (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_member_needs_unit CHECK (
    role <> 'member' OR unit_id IS NOT NULL
  )
);

COMMENT ON TABLE public.profiles IS
  'Profilo app legato 1:1 a auth.users (id condiviso). unit_id obbligatorio per member; nullable per parent/leader in fase di onboarding.';
COMMENT ON COLUMN public.profiles.id IS 'FK = auth.users.id. Non generare un id separato.';
COMMENT ON COLUMN public.profiles.unit_id IS 'Unità di appartenenza. I genitori possono avere unit_id NULL.';

-- Relazione genitore ↔ figlio (entrambi profili)
CREATE TABLE IF NOT EXISTS public.parent_child (
  parent_id   uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  child_id    uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, child_id),
  CONSTRAINT parent_child_no_self CHECK (parent_id <> child_id)
);

COMMENT ON TABLE public.parent_child IS
  'Associazione genitore–figlio. Solo coppie esplicite: niente accesso implicito ad altri ragazzi.';

-- Eventi / uscite / riunioni
CREATE TABLE IF NOT EXISTS public.events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id      uuid NOT NULL REFERENCES public.units (id) ON DELETE CASCADE,
  title        text NOT NULL,
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz,
  location     text,
  description  text,
  created_by   uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_ends_after_starts CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

COMMENT ON TABLE public.events IS 'Uscite, riunioni o attività legate a un''unità.';

-- Presenze
CREATE TABLE IF NOT EXISTS public.attendances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status      public.attendance_status NOT NULL DEFAULT 'absent',
  notes       text,
  updated_by  uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendances_event_member_unique UNIQUE (event_id, member_id)
);

COMMENT ON TABLE public.attendances IS
  'Presenza di un member a un evento. Unica per (event_id, member_id). MVP: genitori in sola lettura.';

-- -----------------------------------------------------------------------------
-- 4. Indici (FK e lookup comuni)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_unit_id ON public.profiles (unit_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

CREATE INDEX IF NOT EXISTS idx_parent_child_parent_id ON public.parent_child (parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_child_id ON public.parent_child (child_id);

CREATE INDEX IF NOT EXISTS idx_events_unit_id ON public.events (unit_id);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON public.events (starts_at);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events (created_by);

CREATE INDEX IF NOT EXISTS idx_attendances_event_id ON public.attendances (event_id);
CREATE INDEX IF NOT EXISTS idx_attendances_member_id ON public.attendances (member_id);
CREATE INDEX IF NOT EXISTS idx_attendances_updated_by ON public.attendances (updated_by);

-- -----------------------------------------------------------------------------
-- 5. Trigger updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_attendances_updated_at ON public.attendances;
CREATE TRIGGER trg_attendances_updated_at
  BEFORE UPDATE ON public.attendances
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. Opzionale: sync profilo alla registrazione
-- Decommentare se vuoi creare automaticamente un profilo "member" senza unità.
-- Il ruolo/unità vanno poi assegnati da un leader (o da un flusso admin).
-- -----------------------------------------------------------------------------
/*
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, unit_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Utente'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'member'),
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
*/

-- -----------------------------------------------------------------------------
-- 7. Helper RLS (SECURITY DEFINER, search_path fisso, solo lettura profili)
-- Evitano ricorsione nelle policy su profiles e non espongono dati extra.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_unit_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT unit_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_leader()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'leader'
  )
$$;

CREATE OR REPLACE FUNCTION public.same_unit(p_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_unit_id IS NOT NULL
    AND public.current_unit_id() IS NOT NULL
    AND p_unit_id = public.current_unit_id()
$$;

CREATE OR REPLACE FUNCTION public.is_parent_of(p_child_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_child
    WHERE parent_id = auth.uid() AND child_id = p_child_id
  )
$$;

CREATE OR REPLACE FUNCTION public.child_unit_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.unit_id
  FROM public.parent_child pc
  JOIN public.profiles p ON p.id = pc.child_id
  WHERE pc.parent_id = auth.uid()
    AND p.unit_id IS NOT NULL
$$;

COMMENT ON FUNCTION public.is_leader() IS 'True se auth.uid() è un profilo con ruolo leader.';
COMMENT ON FUNCTION public.same_unit(uuid) IS 'True se l''unità passata coincide con quella del profilo corrente.';
COMMENT ON FUNCTION public.is_parent_of(uuid) IS 'True se auth.uid() è genitore collegato al child_id.';
COMMENT ON FUNCTION public.child_unit_ids() IS 'Unità dei figli collegati al genitore corrente (per lettura eventi).';

-- -----------------------------------------------------------------------------
-- 8. RLS — abilita su tutte le tabelle
-- -----------------------------------------------------------------------------
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_child ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- Evita che ownership di default bypassi RLS per il ruolo table owner in alcuni setup
ALTER TABLE public.units FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.parent_child FORCE ROW LEVEL SECURITY;
ALTER TABLE public.events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.attendances FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 9. Policy RLS
-- Convenzione: DROP IF EXISTS + CREATE per poter rieseguire lo script.
-- -----------------------------------------------------------------------------

-- ===== units =====
DROP POLICY IF EXISTS units_select ON public.units;
DROP POLICY IF EXISTS units_insert_leader ON public.units;
DROP POLICY IF EXISTS units_update_leader ON public.units;
DROP POLICY IF EXISTS units_delete_leader ON public.units;

-- Leader vede la propria unità; member la propria; parent le unità dei figli.
CREATE POLICY units_select ON public.units
  FOR SELECT TO authenticated
  USING (
    public.same_unit(id)
    OR id IN (SELECT public.child_unit_ids())
  );

-- Solo leader della stessa unità possono aggiornare/cancellare.
-- INSERT: un leader già associato può creare? Per MVP: consentire insert solo a
-- leader (bootstrap: primo leader/unità va creato come service role o SQL manuale).
CREATE POLICY units_insert_leader ON public.units
  FOR INSERT TO authenticated
  WITH CHECK (public.is_leader());

CREATE POLICY units_update_leader ON public.units
  FOR UPDATE TO authenticated
  USING (public.is_leader() AND public.same_unit(id))
  WITH CHECK (public.is_leader() AND public.same_unit(id));

CREATE POLICY units_delete_leader ON public.units
  FOR DELETE TO authenticated
  USING (public.is_leader() AND public.same_unit(id));

-- ===== profiles =====
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_leader ON public.profiles;

-- Leggere: se stesso; leader della stessa unità; genitore dei figli collegati.
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (public.is_leader() AND public.same_unit(unit_id))
    OR public.is_parent_of(id)
  );

-- Inserire solo il proprio profilo (id = auth.uid()) dopo signup.
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Aggiornare: se stesso (dati anagrafici) oppure leader sulla stessa unità
-- (assegnazione ruolo/unità). I genitori non modificano i profili dei figli.
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR (public.is_leader() AND public.same_unit(unit_id))
  )
  WITH CHECK (
    id = auth.uid()
    OR (public.is_leader() AND public.same_unit(unit_id))
  );

-- Cancellare profili della propria unità: solo leader (cascade da auth.users resta per self-delete account).
CREATE POLICY profiles_delete_leader ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id) AND id <> auth.uid());

-- ===== parent_child =====
DROP POLICY IF EXISTS parent_child_select ON public.parent_child;
DROP POLICY IF EXISTS parent_child_insert ON public.parent_child;
DROP POLICY IF EXISTS parent_child_delete ON public.parent_child;

-- Genitore vede i propri link; leader vede link dei ragazzi della propria unità.
CREATE POLICY parent_child_select ON public.parent_child
  FOR SELECT TO authenticated
  USING (
    parent_id = auth.uid()
    OR (
      public.is_leader()
      AND EXISTS (
        SELECT 1 FROM public.profiles c
        WHERE c.id = child_id AND public.same_unit(c.unit_id)
      )
    )
  );

-- Creazione link: leader dell''unità del figlio, oppure il genitore stesso
-- (utile se il flusso invita/accetta lato genitore).
CREATE POLICY parent_child_insert ON public.parent_child
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.is_leader()
      AND EXISTS (
        SELECT 1 FROM public.profiles c
        WHERE c.id = child_id AND public.same_unit(c.unit_id)
      )
    )
    OR parent_id = auth.uid()
  );

CREATE POLICY parent_child_delete ON public.parent_child
  FOR DELETE TO authenticated
  USING (
    parent_id = auth.uid()
    OR (
      public.is_leader()
      AND EXISTS (
        SELECT 1 FROM public.profiles c
        WHERE c.id = child_id AND public.same_unit(c.unit_id)
      )
    )
  );

-- ===== events =====
DROP POLICY IF EXISTS events_select ON public.events;
DROP POLICY IF EXISTS events_insert_leader ON public.events;
DROP POLICY IF EXISTS events_update_leader ON public.events;
DROP POLICY IF EXISTS events_delete_leader ON public.events;

-- Leader/member: eventi della propria unità. Parent: eventi delle unità dei figli.
CREATE POLICY events_select ON public.events
  FOR SELECT TO authenticated
  USING (
    public.same_unit(unit_id)
    OR unit_id IN (SELECT public.child_unit_ids())
  );

CREATE POLICY events_insert_leader ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_leader()
    AND public.same_unit(unit_id)
    AND created_by = auth.uid()
  );

CREATE POLICY events_update_leader ON public.events
  FOR UPDATE TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id))
  WITH CHECK (public.is_leader() AND public.same_unit(unit_id));

CREATE POLICY events_delete_leader ON public.events
  FOR DELETE TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id));

-- ===== attendances =====
-- MVP sicuro: genitori e ragazzi in sola lettura sulle proprie (o dei figli) righe.
-- Solo i leader della unità dell''evento possono scrivere.
DROP POLICY IF EXISTS attendances_select ON public.attendances;
DROP POLICY IF EXISTS attendances_insert_leader ON public.attendances;
DROP POLICY IF EXISTS attendances_update_leader ON public.attendances;
DROP POLICY IF EXISTS attendances_delete_leader ON public.attendances;

CREATE POLICY attendances_select ON public.attendances
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

CREATE POLICY attendances_insert_leader ON public.attendances
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_leader()
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.same_unit(e.unit_id)
    )
  );

CREATE POLICY attendances_update_leader ON public.attendances
  FOR UPDATE TO authenticated
  USING (
    public.is_leader()
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.same_unit(e.unit_id)
    )
  )
  WITH CHECK (
    public.is_leader()
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.same_unit(e.unit_id)
    )
  );

CREATE POLICY attendances_delete_leader ON public.attendances
  FOR DELETE TO authenticated
  USING (
    public.is_leader()
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.same_unit(e.unit_id)
    )
  );

-- -----------------------------------------------------------------------------
-- 10. Grants (ruolo authenticated di Supabase)
-- anon non riceve privilegi sulle tabelle dati.
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.parent_child TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendances TO authenticated;

GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_unit_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_leader() TO authenticated;
GRANT EXECUTE ON FUNCTION public.same_unit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_parent_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.child_unit_ids() TO authenticated;

-- -----------------------------------------------------------------------------
-- 11. Seed demo (opzionale) — solo unità fittizia, nessun dato personale reale
-- Eseguire a mano come service role / SQL editor se serve un punto di partenza.
-- -----------------------------------------------------------------------------
/*
INSERT INTO public.units (id, name, branch)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'Reparto Demo EG', 'EG'),
  ('00000000-0000-4000-8000-000000000002', 'Branco Demo LC', 'LC'),
  ('00000000-0000-4000-8000-000000000003', 'Clan Demo RS', 'RS')
ON CONFLICT (id) DO NOTHING;
*/

-- Fine migration MVP Scout-Up
