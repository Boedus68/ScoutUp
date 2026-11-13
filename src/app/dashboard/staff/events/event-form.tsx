import {
  cocaEventTypeLabel,
  cocaEventTypeOptions,
  eventTypeLabel,
  eventTypeOptions,
} from "@/lib/labels";
import type { EventRow } from "@/lib/types";

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({
  action,
  coca,
  submitLabel,
  event,
}: {
  action: (formData: FormData) => void | Promise<void>;
  coca: boolean;
  submitLabel: string;
  event?: Pick<
    EventRow,
    | "id"
    | "title"
    | "starts_at"
    | "ends_at"
    | "location"
    | "description"
    | "event_type"
    | "fee_amount"
    | "equipment_list"
  >;
}) {
  const options = coca ? cocaEventTypeOptions : eventTypeOptions;
  const labels = coca ? cocaEventTypeLabel : eventTypeLabel;

  return (
    <form
      action={action}
      className="max-w-xl space-y-4 rounded-xl border border-[var(--border)] bg-white p-5"
    >
      {event ? <input type="hidden" name="event_id" value={event.id} /> : null}

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Titolo</span>
        <input
          name="title"
          required
          defaultValue={event?.title ?? ""}
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
          defaultValue={event?.event_type ?? "meeting"}
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
            defaultValue={toDatetimeLocal(event?.starts_at)}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Fine (opzionale)</span>
          <input
            type="datetime-local"
            name="ends_at"
            defaultValue={toDatetimeLocal(event?.ends_at)}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Luogo</span>
        <input
          name="location"
          defaultValue={event?.location ?? ""}
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
          defaultValue={event?.fee_amount ?? ""}
          placeholder="0.00"
          className="w-full rounded-md border border-[var(--border)] px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Equipaggiamento (testo o URL)</span>
        <textarea
          name="equipment_list"
          rows={3}
          defaultValue={event?.equipment_list ?? ""}
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
          defaultValue={event?.description ?? ""}
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
        {submitLabel}
      </button>
    </form>
  );
}
