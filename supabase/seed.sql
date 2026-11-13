-- =============================================================================
-- Scout-Up — seed demo (Gruppo Sirio: LC + EG + RS + Comunità Capi)
-- =============================================================================
-- PREREQUISITO: migration fino a 20261120_leader_group_units.sql già applicate.
--
-- Gli UUID sotto sono FISSI. Crea gli utenti in Supabase → Authentication → Users
-- (email+password a tua scelta) OPPURE inserisci in auth.users via SQL Editor
-- usando gli STESSI id, poi riesegui questo file (o la sola sezione profili).
--
-- Mapping email suggerite (password: sceglile tu in Dashboard, non sono in questo seed):
--   capo1@demo.scout-up.local  -> 11111111-1111-1111-1111-111111111101
--   capo2@demo.scout-up.local  -> 11111111-1111-1111-1111-111111111102
--   gen1@demo.scout-up.local   -> 11111111-1111-1111-1111-111111111201
--   gen2@demo.scout-up.local   -> 11111111-1111-1111-1111-111111111202
--   gen3@demo.scout-up.local   -> 11111111-1111-1111-1111-111111111203
--   rag1@demo.scout-up.local   -> 11111111-1111-1111-1111-111111111301
--   rag2@demo.scout-up.local   -> 11111111-1111-1111-1111-111111111302
--   rag3@demo.scout-up.local   -> 11111111-1111-1111-1111-111111111303
--   rag4@demo.scout-up.local   -> 11111111-1111-1111-1111-111111111304
--   rag5@demo.scout-up.local   -> 11111111-1111-1111-1111-111111111305
--
-- Opzionale (SQL Editor, service role): crea auth.users con quegli id, poi:
--   psql "$DATABASE_URL" -f supabase/seed.sql
-- =============================================================================

BEGIN;

-- Gruppo + unità + sottogruppi (non dipendono da auth)
INSERT INTO public.groups (id, name, city)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Gruppo Scout Sirio', 'Milano')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city;

INSERT INTO public.units (id, name, branch, group_id, association_year)
VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
    'Branco Lupetti / Coccinelle',
    'LC',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '2025/2026'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'Reparto Sirio',
    'EG',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '2025/2026'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
    'Clan Rover / Scolte',
    'RS',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '2025/2026'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'Comunità Capi',
    'COCA',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '2025/2026'
  )
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    branch = EXCLUDED.branch,
    group_id = EXCLUDED.group_id,
    association_year = EXCLUDED.association_year;

INSERT INTO public.subgroups (id, unit_id, name) VALUES
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Aquile'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Lupi'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Volpi')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, unit_id = EXCLUDED.unit_id;

-- Profili: falliscono se auth.users corrispondenti non esistono ancora.
-- Esegui dopo aver creato gli utenti con gli UUID sopra.

-- I capi restano sull'unità di servizio EG; Co.Ca. è accessibile via switcher
-- (active_unit_id) e RLS same_unit estesa. group_role = incarico in Co.Ca.
INSERT INTO public.profiles (
  id, full_name, role, unit_id, totem, phone, birth_date, subgroup_id,
  active_role, group_role, active_unit_id, gender
)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'Chiara Capo', 'leader', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Ghianda', NULL, '1990-03-12', NULL, 'leader', 'capo_gruppo', NULL, 'F'),
  ('11111111-1111-1111-1111-111111111102', 'Marco Capo', 'leader', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Castoro', NULL, '1988-07-21', NULL, 'leader', 'capo_unita', NULL, 'M'),
  ('11111111-1111-1111-1111-111111111201', 'Elena Genitore', 'parent', NULL, NULL, NULL, '1982-01-10', NULL, 'parent', NULL, NULL, 'F'),
  ('11111111-1111-1111-1111-111111111202', 'Paolo Genitore', 'parent', NULL, NULL, NULL, '1980-11-02', NULL, 'parent', NULL, NULL, 'M'),
  ('11111111-1111-1111-1111-111111111203', 'Sara Genitore', 'parent', NULL, NULL, NULL, '1985-05-30', NULL, 'parent', NULL, NULL, 'F'),
  ('11111111-1111-1111-1111-111111111301', 'Luca Rossi', 'member', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Volpe', NULL, '2012-04-04', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', 'member', NULL, NULL, 'M'),
  ('11111111-1111-1111-1111-111111111302', 'Giulia Bianchi', 'member', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Aquila', NULL, '2013-09-15', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', 'member', NULL, NULL, 'F'),
  ('11111111-1111-1111-1111-111111111303', 'Matteo Verdi', 'member', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Lupo', NULL, '2012-12-01', 'cccccccc-cccc-cccc-cccc-ccccccccccc2', 'member', NULL, NULL, 'M'),
  ('11111111-1111-1111-1111-111111111304', 'Anna Neri', 'member', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Scoiattolo', NULL, '2014-02-20', 'cccccccc-cccc-cccc-cccc-ccccccccccc2', 'member', NULL, NULL, 'F'),
  ('11111111-1111-1111-1111-111111111305', 'Pietro Blu', 'member', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Tasso', NULL, '2013-06-08', 'cccccccc-cccc-cccc-cccc-ccccccccccc3', 'member', NULL, NULL, 'M')
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    unit_id = EXCLUDED.unit_id,
    totem = EXCLUDED.totem,
    birth_date = EXCLUDED.birth_date,
    subgroup_id = EXCLUDED.subgroup_id,
    active_role = EXCLUDED.active_role,
    group_role = EXCLUDED.group_role,
    gender = EXCLUDED.gender;

-- Multi-ruolo demo: capo1 è anche genitore di Luca
INSERT INTO public.parent_child (parent_id, child_id) VALUES
  ('11111111-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111301'),
  ('11111111-1111-1111-1111-111111111201', '11111111-1111-1111-1111-111111111301'),
  ('11111111-1111-1111-1111-111111111201', '11111111-1111-1111-1111-111111111302'),
  ('11111111-1111-1111-1111-111111111202', '11111111-1111-1111-1111-111111111303'),
  ('11111111-1111-1111-1111-111111111202', '11111111-1111-1111-1111-111111111304'),
  ('11111111-1111-1111-1111-111111111203', '11111111-1111-1111-1111-111111111305')
ON CONFLICT DO NOTHING;

-- Assicura membership (trigger già lo fa; idempotente)
INSERT INTO public.role_memberships (user_id, role)
SELECT id, role FROM public.profiles
WHERE id IN (
  '11111111-1111-1111-1111-111111111101',
  '11111111-1111-1111-1111-111111111102',
  '11111111-1111-1111-1111-111111111201',
  '11111111-1111-1111-1111-111111111202',
  '11111111-1111-1111-1111-111111111203',
  '11111111-1111-1111-1111-111111111301',
  '11111111-1111-1111-1111-111111111302',
  '11111111-1111-1111-1111-111111111303',
  '11111111-1111-1111-1111-111111111304',
  '11111111-1111-1111-1111-111111111305'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_memberships (user_id, role)
SELECT DISTINCT parent_id, 'parent'::public.app_role FROM public.parent_child
WHERE parent_id = '11111111-1111-1111-1111-111111111101'
ON CONFLICT DO NOTHING;

-- Demo multi-ruolo completo: capo1 vede Capo + Ragazzo + Genitore nello switcher
INSERT INTO public.role_memberships (user_id, role)
VALUES ('11111111-1111-1111-1111-111111111101', 'member')
ON CONFLICT DO NOTHING;

-- Demo Co.Ca.: riunione + documenti (solo se i profili capo esistono)
INSERT INTO public.events (
  id, unit_id, title, starts_at, ends_at, location, description,
  event_type, created_by
)
SELECT
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
  'Riunione di Co.Ca. — avvio anno',
  (date_trunc('month', now()) + interval '10 days' + interval '21 hours'),
  (date_trunc('month', now()) + interval '10 days' + interval '23 hours'),
  'Sede di Gruppo',
  'Ordine del giorno: PE, calendario formazione, cassa di Gruppo.',
  'meeting',
  '11111111-1111-1111-1111-111111111101'
WHERE EXISTS (
  SELECT 1 FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111101'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    location = EXCLUDED.location;

INSERT INTO public.materials (id, unit_id, title, description, file_url, created_by)
SELECT
  'dddddddd-dddd-dddd-dddd-dddddddddd01',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
  'Progetto Educativo di Gruppo',
  'Documento PE condiviso in Co.Ca.',
  'https://example.com/pe-gruppo-sirio.pdf',
  '11111111-1111-1111-1111-111111111101'
WHERE EXISTS (
  SELECT 1 FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111101'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    file_url = EXCLUDED.file_url;

INSERT INTO public.announcements (
  id, unit_id, audience, title, body, created_by
)
SELECT
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaab01',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
  'unit',
  'Verbale Co.Ca. — settembre',
  'Sintesi decisioni: conferma calendario CFT/CFM e priorità cassa di Gruppo.',
  '11111111-1111-1111-1111-111111111101'
WHERE EXISTS (
  SELECT 1 FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111101'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    body = EXCLUDED.body;

COMMIT;
