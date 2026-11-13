-- =============================================================================
-- Scout-Up — crea Branco LC, Clan RS, Comunità Capi COCA nel gruppo di Marco
-- Gruppo: 056ed55d-8e9f-45a3-a3a0-4854ff6aef16
-- Unità EG esistente: c6de9588-8ea8-407f-8183-ef51651dc80a (Reparto Scout EG)
-- Idempotente: non duplica se la branca esiste già nel gruppo.
-- Prerequisito: migration Co.Ca. + 20261120_leader_group_units.sql (o SQL sotto).
-- =============================================================================

-- 0) Check attuale
SELECT id, name, branch, association_year, group_id
FROM public.units
WHERE group_id = '056ed55d-8e9f-45a3-a3a0-4854ff6aef16'
ORDER BY branch, name;

-- 1) Inserisci LC / RS / COCA mancanti (association_year dalla EG)
WITH eg AS (
  SELECT association_year, group_id
  FROM public.units
  WHERE id = 'c6de9588-8ea8-407f-8183-ef51651dc80a'
  LIMIT 1
),
wanted(name, branch) AS (
  VALUES
    ('Branco Lupetti / Coccinelle', 'LC'::public.scout_branch),
    ('Clan Rover / Scolte', 'RS'::public.scout_branch),
    ('Comunità Capi', 'COCA'::public.scout_branch)
)
INSERT INTO public.units (name, branch, group_id, association_year)
SELECT w.name, w.branch, eg.group_id, eg.association_year
FROM wanted w
CROSS JOIN eg
WHERE NOT EXISTS (
  SELECT 1
  FROM public.units u
  WHERE u.group_id = eg.group_id
    AND u.branch = w.branch
);

-- 2) Verifica: atteso LC, EG, RS, COCA
SELECT id, name, branch, association_year
FROM public.units
WHERE group_id = '056ed55d-8e9f-45a3-a3a0-4854ff6aef16'
ORDER BY
  CASE branch
    WHEN 'LC' THEN 1
    WHEN 'EG' THEN 2
    WHEN 'RS' THEN 3
    WHEN 'COCA' THEN 4
    ELSE 9
  END,
  name;
