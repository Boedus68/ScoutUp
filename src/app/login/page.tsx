import Image from "next/image";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/config";
import { SetupBanner } from "@/components/setup-banner";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {!configured ? <SetupBanner /> : null}
      <div className="mx-auto grid w-full max-w-5xl flex-1 items-stretch gap-0 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:py-12">
        <aside className="relative hidden overflow-hidden rounded-2xl border border-[var(--border)] lg:block">
          <Image
            src="/images/scouts-uniform.svg"
            alt="Illustrazione originale scout in divisa celeste e blu"
            fill
            priority
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover object-top"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(18,28,51,0.05) 0%, rgba(18,28,51,0.78) 100%)",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 p-8 text-white">
            <Image
              src="/images/compass-mark.svg"
              alt=""
              width={48}
              height={48}
              className="mb-4"
            />
            <p className="font-display text-3xl tracking-tight">Scout-Up</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/85">
              Entra nel campo base digitale della tua unità.
            </p>
          </div>
        </aside>

        <div className="flex flex-1 flex-col justify-center py-4 lg:py-0">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--navy)] transition hover:text-[var(--celeste)]"
          >
            ← Torna a Scout-Up
          </Link>
          <div className="mt-6 flex items-center gap-3 lg:hidden">
            <Image
              src="/images/compass-mark.svg"
              alt=""
              width={40}
              height={40}
            />
            <p className="font-display text-2xl text-[var(--ink)]">Scout-Up</p>
          </div>
          <h1 className="mt-6 font-display text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
            Accedi
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            Entra come capo, genitore o ragazzo. Dopo il login verrai portato
            alla dashboard del tuo ruolo.
          </p>

          <div className="mt-8 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 shadow-[var(--shadow-soft)] backdrop-blur-sm">
            <div className="uniform-stripe h-1.5 w-full" aria-hidden="true" />
            <div className="p-5 sm:p-6">
              {configured ? (
                <LoginForm />
              ) : (
                <div className="space-y-3 text-sm text-[var(--muted)]">
                  <p>
                    Il form di login è disabilitato finché non configuri Supabase.
                  </p>
                  <Link
                    href="/setup"
                    className="inline-flex rounded-md bg-[var(--navy)] px-4 py-2 font-semibold text-white transition hover:bg-[var(--navy-deep)]"
                  >
                    Apri setup
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
            <Image
              src="/images/camp-silhouette.svg"
              alt=""
              width={960}
              height={420}
              className="h-28 w-full object-cover object-bottom opacity-95 sm:h-32"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
