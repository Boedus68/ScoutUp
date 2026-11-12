import Link from "next/link";
import { connection } from "next/server";
import { StaffShell } from "@/components/staff-shell";
import { requireRole } from "@/lib/auth";
import {
  cocaEventTypeLabel,
  cocaEventTypeOptions,
  eventTypeLabel,
  eventTypeOptions,
} from "@/lib/labels";
import { isCocaUnit } from "@/lib/staff-unit";
import { createEventAction } from "../../actions";

export default async function NewEventPage() {
  await connection();
  const { unit, roles, activeRole, availableUnits } = await requireRole([
    "leader",
  ]);
  const coca = isCocaUnit(unit);
  const options = coca ? cocaEventTypeOptions : eventTypeOptions;
  const labels = coca ? cocaEventTypeLabel : eventTypeLabel;

  return (
    <StaffShell
      title={coca ? "Nuovo appuntamento Co.Ca." : "Nuova uscita"}
      subtitle={unit ? unit.name : "Unità"}
      activeRole={activeRole}
      roles={roles}
      unit={unit}
      availableUnits={availableUnits}
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
            placeholder={
              coca
                ? "Es. Riunione Co.Ca. di marzo"
                : "Es. Uscita domenicale al bosco"
            }
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
            {options.map((type) => (
              <option key={type} value={type}>
                {labels[type]}
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
          <span className="mb-1 block font-medium">
            {coca ? "Verbale / note condivise" : "Descrizione (opzionale)"}
          </span>
          <textarea
            name="description"
            rows={coca ? 4 : 2}
            placeholder={
              coca
                ? "Appunti di riunione, decisioni, prossimi passi…"
                : undefined
            }
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
          />
        </label>

        <button
          type="submit"
          className="rounded-md bg-[var(--forest)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--forest-deep)]"
        >
          {coca ? "Crea e apri registro" : "Crea e apri Presenze"}
        </button>
      </form>
    </StaffShell>
  );
}
