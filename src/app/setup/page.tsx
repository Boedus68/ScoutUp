import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/config";

export default function SetupPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col px-4 py-12 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-[var(--forest)]">
        ← Scout-Up
      </Link>
      <h1 className="mt-6 font-display text-3xl text-[var(--ink)]">Setup Supabase</h1>
      <p className="mt-3 text-[var(--muted)]">
        L&apos;app è partita senza credenziali. Completa questi passi per attivare
        login e dashboard.
      </p>

      <ol className="mt-8 space-y-4 text-sm leading-relaxed text-[var(--ink)]">
        <li className="rounded-lg border border-[var(--border)] bg-white p-4">
          <strong>1.</strong> Crea un progetto su{" "}
          <a
            className="font-medium text-[var(--forest)] underline"
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
          >
            Supabase Dashboard
          </a>
          .
        </li>
        <li className="rounded-lg border border-[var(--border)] bg-white p-4">
          <strong>2.</strong> Apri <em>SQL Editor</em> e esegui la migration{" "}
          <code className="rounded bg-[var(--surface-muted)] px-1">
            supabase/migrations/20261111_scout_up_mvp.sql
          </code>
          .
        </li>
        <li className="rounded-lg border border-[var(--border)] bg-white p-4">
          <strong>3.</strong> Copia{" "}
          <code className="rounded bg-[var(--surface-muted)] px-1">.env.local.example</code>{" "}
          in <code className="rounded bg-[var(--surface-muted)] px-1">.env.local</code> e
          inserisci <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </li>
        <li className="rounded-lg border border-[var(--border)] bg-white p-4">
          <strong>4.</strong> Riavvia <code>npm run dev</code>, crea utenti in
          Authentication e i relativi profili/unità via SQL Editor (bootstrap iniziale).
        </li>
      </ol>

      <p className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
        Stato attuale:{" "}
        <strong>{configured ? "configurato" : "mancano le variabili d’ambiente"}</strong>
      </p>

      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-[var(--forest)] px-4 py-2 text-sm font-semibold text-white"
        >
          Vai al login
        </Link>
        <Link
          href="/"
          className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
