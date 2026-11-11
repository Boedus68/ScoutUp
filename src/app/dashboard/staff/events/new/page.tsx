import Link from "next/link";
import { connection } from "next/server";
import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { createEventAction } from "../../actions";

export default async function NewEventPage() {
  await connection();
  const { unit } = await requireRole(["leader"]);

  return (
    <AppShell
      title="Nuova uscita"
      subtitle={unit ? unit.name : "Unità"}
      nav={
        <Link href="/dashboard/staff" className="text-sm font-medium text-[var(--forest)]">
          ← Elenco uscite
        </Link>
      }
    >
      <form
        action={createEventAction}
        className="max-w-xl space-y-4 rounded-xl border border-[var(--border)] bg-white p-5"
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Titolo</span>
          <input
            name="title"
            required
            placeholder="Es. Uscita domenicale al bosco"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Inizio</span>
            <input
              type="datetime-local"
              name="starts_at"
              required
              className="w-full rounded-md border border-[var(--border)] px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Fine (opzionale)</span>
            <input
              type="datetime-local"
              name="ends_at"
              className="w-full rounded-md border border-[var(--border)] px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Luogo</span>
          <input
            name="location"
            placeholder="Es. Sede / Parco comunale"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
          />
        </label>

        <p className="text-sm text-[var(--muted)]">
          L&apos;uscita verrà creata per l&apos;unità del tuo profilo
          {unit ? ` (${unit.name})` : ""}.
        </p>

        <button
          type="submit"
          className="rounded-md bg-[var(--forest)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--forest-deep)]"
        >
          Crea e apri Presenze
        </button>
      </form>
    </AppShell>
  );
}
