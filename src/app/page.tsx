import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/config";
import { SetupBanner } from "@/components/setup-banner";

export default function HomePage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {!configured ? <SetupBanner /> : null}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--forest)]">
          Scout-Up
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl leading-tight tracking-tight text-[var(--ink)] sm:text-5xl">
          Presenze e uscite per la tua unità.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-[var(--muted)]">
          Registro digitale per capi, genitori e ragazzi: organizza le uscite e
          registra le presenze in pochi tap.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={configured ? "/login" : "/setup"}
            className="inline-flex items-center justify-center rounded-md bg-[var(--forest)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--forest-deep)]"
          >
            {configured ? "Accedi" : "Configura Supabase"}
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]"
          >
            Vai alle dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
