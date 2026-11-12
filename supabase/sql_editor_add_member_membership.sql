-- =============================================================================
-- Scout-Up — aggiungi membership "member" (Ragazzo) a un profilo esistente
-- Così nello switcher Contesto attivo compare anche "Ragazzo".
-- =============================================================================

-- Sostituisci email (o usa USER_ID sotto).
-- L'utente deve già avere profiles.unit_id valorizzato per vedere il calendario ragazzo.

INSERT INTO public.role_memberships (user_id, role)
SELECT p.id, 'member'::public.app_role
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE au.email = 'INSERISCI_EMAIL@example.com'  -- <-- modifica
ON CONFLICT DO NOTHING;

-- Alternativa per UUID noto:
-- INSERT INTO public.role_memberships (user_id, role)
-- VALUES ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid, 'member')
-- ON CONFLICT DO NOTHING;

-- Verifica
SELECT au.email, rm.role
FROM public.role_memberships rm
JOIN auth.users au ON au.id = rm.user_id
WHERE au.email = 'INSERISCI_EMAIL@example.com'
ORDER BY rm.role;
-- atteso: leader, member, parent (o il sottoinsieme reale)
