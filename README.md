# Scout-Up

PWA / web app per gruppi scout italiani: **Presenze**, **Uscite** e dashboard per **capi**, **genitori** e **ragazzi**.

Stack: **Next.js (App Router) + TypeScript + Tailwind + Supabase (`@supabase/ssr`)**.

## Prerequisiti

- Node.js 20+
- Un progetto [Supabase](https://supabase.com/dashboard)

## 1. Applica lo schema SQL

1. Apri il progetto Supabase → **SQL Editor**
2. Incolla ed esegui il contenuto di:

```text
supabase/migrations/20261111_scout_up_mvp.sql
```

(Lo stesso schema è documentato anche nel Context del progetto: `docs/supabase-schema-mvp.sql`.)

3. Verifica che RLS sia attivo sulle tabelle `units`, `profiles`, `parent_child`, `events`, `attendances`.

## 2. Bootstrap dati iniziali

Lo schema non crea da solo il primo capo/unità (policy client). Da SQL Editor (service role):

1. Crea un utente in **Authentication → Users**
2. Inserisci un’unità in `units`
3. Inserisci il profilo in `profiles` con `id = auth.users.id`, `role = 'leader'`, `unit_id` dell’unità
4. Aggiungi ragazzi (`role = 'member'`) e genitori (`role = 'parent'`) + link in `parent_child`

## 3. Variabili d’ambiente

```bash
cp .env.local.example .env.local
```

Compila:

| Variabile | Dove trovarla |
|-----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` |

Non committare `.env.local`.

## 4. Avvio locale

```bash
npm install
npm run dev
```

Apri [http://127.0.0.1:3000](http://127.0.0.1:3000).

Senza credenziali l’app non crasha: mostra lo stato di setup su `/setup` e protegge `/dashboard/*`.

## Ruoli e route

| Ruolo (`profiles.role`) | Dashboard |
|-------------------------|-----------|
| `leader` | `/dashboard/staff` — crea uscite, registro Presenze |
| `parent` | `/dashboard/parent` — uscite dei figli + stato presenza (sola lettura) |
| `member` | `/dashboard/member` — hub sola lettura |

Login: email/password o magic link su `/login`. Logout dal pulsante **Esci**.

## Struttura utile

```text
src/lib/supabase/     # client browser, server, helper middleware
src/middleware.ts      # protezione /dashboard/*
src/app/dashboard/     # staff / parent / member
supabase/migrations/   # schema versionato
```

## Fase 1 (struttura associativa)

Vedi guida: nel Context del progetto `docs/fase1-struttura-associativa.md`.

- Migration: `supabase/migrations/20261112_fase1_struttura_associativa.sql`
- Seed demo: `supabase/seed.sql` (UUID fissi + istruzioni auth.users)
- Menu laterale per ruolo + switcher se `role_memberships` ha più ruoli

## Fuori scope (oltre Fase 1)

Progressione personale, sync offline, import CSV completo, sanitario, bacheca, polish PWA avanzato, deploy produzione.
