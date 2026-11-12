import Link from "next/link";
import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { eventTypeLabel, eventTypeOptions } from "@/lib/labels";
import { createEventAction } from "../../actions";

export default async function NewEventPage() {
  await connection();
  const { unit, roles, activeRole } = await requireRole(["leader"]);

  return (
    <DashboardShell
      title="Nuova uscita"
      subtitle={unit ? unit.name : "Unità"}
      activeRole={activeRole}
      roles={roles}
      headerActions={
        <Link href="/dashboard/staff/calendario" className="text-sm font-medium text-[var(--forest)]">
          ← Calendario
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

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Tipo</span>
          <select
            name="event_type"
            defaultValue="meeting"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2"
          >
            {eventTypeOptions.map((type) => (
              <option key={type} value={type}>
                {eventTypeLabel[type]}
              </option>
            ))}
          </select>
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

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Quota (€, opzionale)</span>
          <input
            name="fee_amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Equipaggiamento (testo o URL)</span>
          <textarea
            name="equipment_list"
            rows={3}
            placeholder="Es. Sacco a pelo, borraccia… oppure link alla lista"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Descrizione (opzionale)</span>
          <textarea
            name="description"
            rows={2}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
          />
        </label>

        <button
          type="submit"
          className="rounded-md bg-[var(--forest)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--forest-deep)]"
        >
          Crea e apri Presenze
        </button>
      </form>
    </DashboardShell>
  );
}
