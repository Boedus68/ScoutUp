import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/config";
import { SetupBanner } from "@/components/setup-banner";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {!configured ? <SetupBanner /> : null}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Link href="/" className="text-sm font-semibold text-[var(--forest)]">
          ← Scout-Up
        </Link>
        <h1 className="mt-6 font-display text-3xl text-[var(--ink)]">Accedi</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Entra come capo, genitore o ragazzo. Dopo il login verrai portato alla
          dashboard del tuo ruolo.
        </p>

        <div className="mt-8 rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          {configured ? (
            <LoginForm />
          ) : (
            <div className="space-y-3 text-sm text-[var(--muted)]">
              <p>
                Il form di login è disabilitato finché non configuri Supabase.
              </p>
              <Link
                href="/setup"
                className="inline-flex rounded-md bg-[var(--forest)] px-4 py-2 font-semibold text-white"
              >
                Apri setup
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
