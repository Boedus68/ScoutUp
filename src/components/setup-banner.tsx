import Link from "next/link";

export function SetupBanner() {
  return (
    <div className="border-b border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p>
        Supabase non è ancora configurato.{" "}
        <Link href="/setup" className="font-semibold underline underline-offset-2">
          Apri la guida di setup
        </Link>{" "}
        e copia <code className="rounded bg-amber-100 px-1">.env.local.example</code> in{" "}
        <code className="rounded bg-amber-100 px-1">.env.local</code>.
      </p>
    </div>
  );
}
