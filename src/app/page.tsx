import Image from "next/image";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/config";
import { SetupBanner } from "@/components/setup-banner";

export default function HomePage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {!configured ? <SetupBanner /> : null}

      <section className="relative isolate flex min-h-[100svh] flex-1 overflow-hidden">
        <div className="absolute inset-0 -z-20 overflow-hidden bg-[var(--celeste-soft)]">
          <Image
            src="/images/hero-scouts.svg"
            alt="Illustrazione originale di scout in camicia celeste, pantaloncini blu e fazzolettone"
            fill
            priority
            sizes="100vw"
            className="hero-kenburns object-cover object-[70%_center] sm:object-center"
          />
        </div>
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(105deg, rgba(18, 28, 51, 0.72) 0%, rgba(18, 28, 51, 0.42) 48%, rgba(18, 28, 51, 0.12) 100%)",
          }}
        />

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-5 pb-16 pt-10 sm:px-8 sm:pb-20 lg:justify-center lg:pb-24">
          <div className="max-w-2xl text-white">
            <p className="motion-rise font-display text-5xl leading-none tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
              Scout-Up
            </p>
            <h1 className="motion-rise-delay mt-5 max-w-xl font-display text-2xl leading-snug tracking-tight text-[#eef4f8] sm:text-3xl md:text-4xl">
              Presenze e uscite per la tua unità.
            </h1>
            <p className="motion-rise-delay-2 mt-4 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">
              Registro digitale per capi, genitori e ragazzi: organizza le uscite
              e registra le presenze in pochi tap.
            </p>
            <div className="motion-rise-delay-2 mt-8 flex flex-wrap gap-3">
              <Link
                href={configured ? "/login" : "/setup"}
                className="inline-flex items-center justify-center rounded-md bg-[var(--sand)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
              >
                {configured ? "Accedi" : "Configura Supabase"}
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-md border border-white/45 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-[2px] transition hover:bg-white/20"
              >
                Vai alle dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="topo-bg border-t border-[var(--border)]">
        <div className="uniform-stripe h-1.5 w-full" aria-hidden="true" />
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div className="motion-fade">
            <h2 className="font-display text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
              Un campo base digitale per l&apos;unità
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
              Capo, genitore e ragazzo condividono lo stesso ritmo: calendario,
              registro, progressione e comunicazioni, con un aspetto coerente su
              ogni dispositivo.
            </p>
          </div>
          <Image
            src="/images/scouts-uniform.svg"
            alt="Illustrazione originale della divisa: camicia celeste, pantaloncini blu, calzettoni e fazzolettone"
            width={720}
            height={960}
            className="h-64 w-full object-cover object-top sm:h-80 lg:h-[22rem]"
          />
        </div>
      </section>
    </div>
  );
}
