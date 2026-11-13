# Template email Auth (italiano)

I testi delle email Auth **non** si applicano con SQL: vanno incollati in
Supabase Dashboard → **Authentication → Email Templates**.

## URL Configuration (obbligatorio)

Authentication → **URL Configuration**:

| Campo | Valore |
|-------|--------|
| **Site URL** | `https://scout-up.it` |
| **Redirect URLs** | `https://scout-up.it/**` , `https://www.scout-up.it/**` , `https://scout-up.it/auth/callback` , `https://scout-up.it/auth/callback?next=/imposta-password` , `https://www.scout-up.it/**` , (opzionale preview) `https://scout-up.netlify.app/**` |

Senza questi redirect, il link di invito apre il sito ma **non** scambia il token.

## Disable registrazione pubblica

Authentication → **Providers → Email**: lascia attiva solo Email.
**Allow new users to sign up** = **off** (o equivalente “disable sign ups”).
L’app non ha «Crea account»: gli utenti nuovi arrivano solo da Invita capo.

## Invite user

1. Template **Invite user**
2. Subject: `Invito a Scout-Up`
3. Body: contenuto di `invite.html` (usa `{{ .ConfirmationURL }}`)

## Reset password (recovery)

1. Template **Reset password**
2. Subject: `Reimposta la password di Scout-Up`
3. Body: contenuto di `recovery.html`

## Flusso invitato

1. Il capo usa **Invita capo** (serve `SUPABASE_SERVICE_ROLE_KEY` su Netlify).
2. L’invitato apre il link → `/auth/callback` scambia `code` / `token_hash` / hash.
3. Va su `/imposta-password`, salva la password, entra in dashboard già autenticato.
4. Accessi successivi: `/login` con email e password (o magic link, senza creare utenti).
