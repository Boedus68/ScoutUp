-- =============================================================================
-- Scout-Up Fase 1 — struttura associativa, anagrafica, multi-ruolo
-- Incremental rispetto a 20261111_scout_up_mvp.sql. Idempotente dove pratico.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. groups
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  city        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.groups IS 'Gruppo scout (AGESCI). Contiene una o più unità.';

-- -----------------------------------------------------------------------------
-- 2. units — collega a groups + anno associativo (branch già presente)
-- -----------------------------------------------------------------------------
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS association_year text;

COMMENT ON COLUMN public.units.group_id IS 'Gruppo di appartenenza. Nullable in onboarding; il seed/bootstrap lo valorizza.';
COMMENT ON COLUMN public.units.association_year IS 'Anno associativo (es. 2025/2026).';

-- Backfill: un gruppo default per unità orfane (non rompe dati esistenti)
DO $$
DECLARE
  v_group_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.units WHERE group_id IS NULL) THEN
    SELECT id INTO v_group_id FROM public.groups WHERE name = 'Gruppo Scout (migrazione)' LIMIT 1;
    IF v_group_id IS NULL THEN
      INSERT INTO public.groups (name, city)
      VALUES ('Gruppo Scout (migrazione)', NULL)
      RETURNING id INTO v_group_id;
    END IF;
    UPDATE public.units SET group_id = v_group_id WHERE group_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_units_group_id ON public.units (group_id);
CREATE INDEX IF NOT EXISTS idx_units_association_year ON public.units (association_year);

-- -----------------------------------------------------------------------------
-- 3. subgroups (sestiglia / squadriglia / pattuglia)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subgroups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id     uuid NOT NULL REFERENCES public.units (id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subgroups IS
  'Sottogruppo di unità: sestiglia (LC), squadriglia (EG), pattuglia (RS).';

CREATE INDEX IF NOT EXISTS idx_subgroups_unit_id ON public.subgroups (unit_id);

-- -----------------------------------------------------------------------------
-- 4. profiles — anagrafica estesa + active_role (contesto UI)
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS totem text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS subgroup_id uuid REFERENCES public.subgroups (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active_role public.app_role;

COMMENT ON COLUMN public.profiles.totem IS 'Totem scout (opzionale).';
COMMENT ON COLUMN public.profiles.phone IS 'Telefono di contatto.';
COMMENT ON COLUMN public.profiles.birth_date IS 'Data di nascita.';
COMMENT ON COLUMN public.profiles.subgroup_id IS 'Sottogruppo (sestiglia/squadriglia/pattuglia), opzionale.';
COMMENT ON COLUMN public.profiles.active_role IS
  'Ruolo attivo in UI (switcher). Deve essere presente in role_memberships; fallback a profiles.role.';

CREATE INDEX IF NOT EXISTS idx_profiles_subgroup_id ON public.profiles (subgroup_id);

-- -----------------------------------------------------------------------------
-- 5. role_memberships — multi-ruolo RLS-safe (leader può essere anche genitore)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_memberships (
  user_id     uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role        public.app_role NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

COMMENT ON TABLE public.role_memberships IS
  'Ruoli effettivi dell''utente. profiles.role resta il ruolo primario; active_role è solo contesto UI. '
  'Un capo con figli in parent_child ottiene anche il ruolo parent.';

CREATE INDEX IF NOT EXISTS idx_role_memberships_role ON public.role_memberships (role);

-- Backfill memberships dal ruolo primario
INSERT INTO public.role_memberships (user_id, role)
SELECT id, role FROM public.profiles
ON CONFLICT DO NOTHING;

-- Backfill parent membership da parent_child
INSERT INTO public.role_memberships (user_id, role)
SELECT DISTINCT parent_id, 'parent'::public.app_role
FROM public.parent_child
ON CONFLICT DO NOTHING;

-- active_role di default = ruolo primario
UPDATE public.profiles
SET active_role = role
WHERE active_role IS NULL;

-- -----------------------------------------------------------------------------
-- 6. parent_child resta molti-a-molti (già PK composta). Nessun rename.
-- -----------------------------------------------------------------------------
COMMENT ON TABLE public.parent_child IS
  'Associazione molti-a-molti genitore↔figlio (PK parent_id+child_id). Solo link espliciti.';

-- -----------------------------------------------------------------------------
-- 7. Trigger sync memberships
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_default_active_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.active_role IS NULL THEN
    NEW.active_role := NEW.role;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_primary_role_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- AFTER INSERT/UPDATE: la riga profiles deve già esistere (FK role_memberships).
  INSERT INTO public.role_memberships (user_id, role)
  VALUES (NEW.id, NEW.role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_sync_role_membership ON public.profiles;
DROP TRIGGER IF EXISTS trg_profiles_set_active_role ON public.profiles;

CREATE TRIGGER trg_profiles_set_active_role
  BEFORE INSERT OR UPDATE OF role, active_role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_active_role();

CREATE TRIGGER trg_profiles_sync_role_membership
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_primary_role_membership();

CREATE OR REPLACE FUNCTION public.sync_parent_role_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.role_memberships (user_id, role)
  VALUES (NEW.parent_id, 'parent')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_parent_child_sync_parent_role ON public.parent_child;
CREATE TRIGGER trg_parent_child_sync_parent_role
  AFTER INSERT ON public.parent_child
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_parent_role_membership();

-- -----------------------------------------------------------------------------
-- 8. Helper RLS aggiornati (multi-ruolo + gruppo)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(active_role, role) FROM public.profiles WHERE id = auth.uid()
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

CREATE OR REPLACE FUNCTION public.has_role(p_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.role_memberships
    WHERE user_id = auth.uid() AND role = p_role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_leader()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role('leader')
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

CREATE OR REPLACE FUNCTION public.my_group_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT u.group_id
  FROM public.units u
  WHERE u.group_id IS NOT NULL
    AND (
      public.same_unit(u.id)
      OR u.id IN (SELECT public.child_unit_ids())
    )
$$;

COMMENT ON FUNCTION public.has_role(public.app_role) IS 'True se auth.uid() ha il ruolo in role_memberships.';
COMMENT ON FUNCTION public.is_leader() IS 'True se l''utente ha membership leader (non dipende dallo switcher UI).';

-- -----------------------------------------------------------------------------
-- 9. RLS enable
-- -----------------------------------------------------------------------------
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups FORCE ROW LEVEL SECURITY;
ALTER TABLE public.subgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subgroups FORCE ROW LEVEL SECURITY;
ALTER TABLE public.role_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_memberships FORCE ROW LEVEL SECURITY;

-- units / profiles / parent_child / events / attendances già forzati nella MVP

-- -----------------------------------------------------------------------------
-- 10. Policy — groups
-- Capo/member: gruppo della propria unità. Genitore: gruppi dei figli.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS groups_select ON public.groups;
DROP POLICY IF EXISTS groups_insert_leader ON public.groups;
DROP POLICY IF EXISTS groups_update_leader ON public.groups;

CREATE POLICY groups_select ON public.groups
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT public.my_group_ids())
  );

CREATE POLICY groups_insert_leader ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (public.is_leader());

CREATE POLICY groups_update_leader ON public.groups
  FOR UPDATE TO authenticated
  USING (public.is_leader() AND id IN (SELECT public.my_group_ids()))
  WITH CHECK (public.is_leader() AND id IN (SELECT public.my_group_ids()));

-- -----------------------------------------------------------------------------
-- 11. Policy — units (refresh: stesso perimetro MVP + lettura group_id)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS units_select ON public.units;
DROP POLICY IF EXISTS units_insert_leader ON public.units;
DROP POLICY IF EXISTS units_update_leader ON public.units;
DROP POLICY IF EXISTS units_delete_leader ON public.units;

CREATE POLICY units_select ON public.units
  FOR SELECT TO authenticated
  USING (
    public.same_unit(id)
    OR id IN (SELECT public.child_unit_ids())
  );

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

-- -----------------------------------------------------------------------------
-- 12. Policy — subgroups
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS subgroups_select ON public.subgroups;
DROP POLICY IF EXISTS subgroups_insert_leader ON public.subgroups;
DROP POLICY IF EXISTS subgroups_update_leader ON public.subgroups;
DROP POLICY IF EXISTS subgroups_delete_leader ON public.subgroups;

CREATE POLICY subgroups_select ON public.subgroups
  FOR SELECT TO authenticated
  USING (
    public.same_unit(unit_id)
    OR unit_id IN (SELECT public.child_unit_ids())
  );

CREATE POLICY subgroups_insert_leader ON public.subgroups
  FOR INSERT TO authenticated
  WITH CHECK (public.is_leader() AND public.same_unit(unit_id));

CREATE POLICY subgroups_update_leader ON public.subgroups
  FOR UPDATE TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id))
  WITH CHECK (public.is_leader() AND public.same_unit(unit_id));

CREATE POLICY subgroups_delete_leader ON public.subgroups
  FOR DELETE TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id));

-- -----------------------------------------------------------------------------
-- 13. Policy — profiles (capo unità; genitore solo figli; member sé)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_leader ON public.profiles;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (public.is_leader() AND public.same_unit(unit_id))
    OR public.is_parent_of(id)
  );

CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

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

CREATE POLICY profiles_delete_leader ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id) AND id <> auth.uid());

-- -----------------------------------------------------------------------------
-- 14. Policy — role_memberships
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS role_memberships_select ON public.role_memberships;
DROP POLICY IF EXISTS role_memberships_insert_leader ON public.role_memberships;
DROP POLICY IF EXISTS role_memberships_delete_leader ON public.role_memberships;

CREATE POLICY role_memberships_select ON public.role_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.is_leader()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = user_id AND public.same_unit(p.unit_id)
      )
    )
  );

-- Leader può assegnare ruoli ai profili della propria unità (es. promuovere)
CREATE POLICY role_memberships_insert_leader ON public.role_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (
      public.is_leader()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = user_id AND public.same_unit(p.unit_id)
      )
    )
  );

CREATE POLICY role_memberships_delete_leader ON public.role_memberships
  FOR DELETE TO authenticated
  USING (
    public.is_leader()
    AND user_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_id AND public.same_unit(p.unit_id)
    )
  );

-- -----------------------------------------------------------------------------
-- 15. Policy — parent_child / events / attendances (allineate Fase 1)
-- Capo: unità. Genitore: solo figli. Member: propri dati + calendario unità.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS parent_child_select ON public.parent_child;
DROP POLICY IF EXISTS parent_child_insert ON public.parent_child;
DROP POLICY IF EXISTS parent_child_delete ON public.parent_child;

CREATE POLICY parent_child_select ON public.parent_child
  FOR SELECT TO authenticated
  USING (
    parent_id = auth.uid()
    OR child_id = auth.uid()
    OR (
      public.is_leader()
      AND EXISTS (
        SELECT 1 FROM public.profiles c
        WHERE c.id = child_id AND public.same_unit(c.unit_id)
      )
    )
  );

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

DROP POLICY IF EXISTS events_select ON public.events;
DROP POLICY IF EXISTS events_insert_leader ON public.events;
DROP POLICY IF EXISTS events_update_leader ON public.events;
DROP POLICY IF EXISTS events_delete_leader ON public.events;

CREATE POLICY events_select ON public.events
  FOR SELECT TO authenticated
  USING (
    public.same_unit(unit_id)
    OR unit_id IN (SELECT public.child_unit_ids())
  );

CREATE POLICY events_insert_leader ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_leader() AND public.same_unit(unit_id) AND created_by = auth.uid());

CREATE POLICY events_update_leader ON public.events
  FOR UPDATE TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id))
  WITH CHECK (public.is_leader() AND public.same_unit(unit_id));

CREATE POLICY events_delete_leader ON public.events
  FOR DELETE TO authenticated
  USING (public.is_leader() AND public.same_unit(unit_id));

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
-- 16. Grants
-- -----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subgroups TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.role_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.parent_child TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendances TO authenticated;
