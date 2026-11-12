-- =============================================================================
-- Scout-Up — crea unità "Comunità Capi" (COCA) per il gruppo del capo
-- Esegui in Supabase SQL Editor DOPO aver applicato le migration Co.Ca.
-- =============================================================================
-- Opzione A (consigliata): usa l'email del capo loggato.
-- Opzione B: sostituisci :group_id con l'UUID del gruppo (vedi query di check).
-- =============================================================================

-- 0) Check: gruppi, unità di servizio e presenza COCA
SELECT g.id AS group_id, g.name AS gruppo, u.id AS unit_id, u.name AS unita, u.branch
FROM public.groups g
JOIN public.units u ON u.group_id = g.id
ORDER BY g.name, u.branch, u.name;

-- 1) Crea Co.Ca. per il gruppo del capo (per email)
--    Sostituisci l'email qui sotto con quella di Marco / Capo Gruppo.
WITH capo AS (
  SELECT p.id AS profile_id, p.unit_id, u.group_id, u.association_year
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  JOIN public.units u ON u.id = p.unit_id
  WHERE au.email = 'INSERISCI_EMAIL_CAPO@example.com'  -- <-- modifica
    AND p.role = 'leader'
    AND u.group_id IS NOT NULL
  LIMIT 1
),
ins AS (
  INSERT INTO public.units (name, branch, group_id, association_year)
  SELECT
    'Comunità Capi',
    'COCA',
    c.group_id,
    c.association_year
  FROM capo c
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.units x
    WHERE x.group_id = c.group_id
      AND x.branch = 'COCA'
  )
  RETURNING id, group_id, name, branch
)
SELECT * FROM ins;

-- 2) Alternativa per group_id noto (decommenta e metti l'UUID):
-- INSERT INTO public.units (name, branch, group_id, association_year)
-- SELECT 'Comunità Capi', 'COCA', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid, '2025/2026'
-- WHERE NOT EXISTS (
--   SELECT 1 FROM public.units
--   WHERE group_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid
--     AND branch = 'COCA'
-- );

-- 3) (Opzionale) incarico Co.Ca. sul profilo capo
-- UPDATE public.profiles
-- SET group_role = 'capo_gruppo'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'INSERISCI_EMAIL_CAPO@example.com');

-- Verifica finale: il capo deve vedere 2 unità (servizio + COCA) nello stesso gruppo
SELECT u.id, u.name, u.branch, u.group_id
FROM public.units u
WHERE u.group_id = (
  SELECT u2.group_id
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  JOIN public.units u2 ON u2.id = p.unit_id
  WHERE au.email = 'INSERISCI_EMAIL_CAPO@example.com'
  LIMIT 1
)
ORDER BY u.branch;
