import Link from "next/link";
import { connection } from "next/server";
import { StaffShell } from "@/components/staff-shell";
import { requireRole } from "@/lib/auth";
import {
  cocaEventTypeLabel,
  eventTypeLabel,
  formatDateTime,
  formatEuro,
} from "@/lib/labels";
import type { EventType } from "@/lib/types";
import { isCocaUnit, staffUnitId } from "@/lib/staff-unit";

export default async function StaffCalendarioPage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase, availableUnits } =
    await requireRole(["leader"]);

  const coca = isCocaUnit(unit);
  const typeLabel = coca ? cocaEventTypeLabel : eventTypeLabel;

  const { data: events } = await supabase
    .from("events")
    .select("id, title, starts_at, location, event_type, fee_amount, description")
    .eq("unit_id", staffUnitId(profile) ?? "")
    .order("starts_at", { ascending: true });

  return (
    <StaffShell
      title={coca ? "Appuntamenti di Co.Ca." : "Calendario"}
      subtitle={
        unit
          ? coca
            ? "Riunioni, uscite, consigli e formazione"
            : unit.name
          : "Uscite e attività"
      }
      activeRole={activeRole}
      roles={roles}
      unit={unit}
      availableUnits={availableUnits}
      headerActions={
        <Link
          href="/dashboard/staff/events/new"
          className="rounded-md bg-[var(--forest)] px-3 py-1.5 text-sm font-semibold text-white"
        >
          {coca ? "Nuovo appuntamento" : "Nuova uscita"}
        </Link>
      }
    >
      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        {(events ?? []).length === 0 ? (
          <li className="px-4 py-8 text-sm text-[var(--muted)]">
            Nessun evento in calendario.
          </li>
        ) : (
          (events ?? []).map((event) => {
            const type =
              (event.event_type as EventType | undefined) ?? "meeting";
            return (
              <li key={event.id}>
                <Link
                  href={`/dashboard/staff/events/${event.id}/presenze`}
                  className="flex flex-col gap-1 px-4 py-4 transition hover:bg-[var(--surface-muted)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {typeLabel[type]} · {formatDateTime(event.starts_at)}
                      {event.location ? ` · ${event.location}` : ""}
                      {!coca && event.fee_amount != null
                        ? ` · Quota ${formatEuro(event.fee_amount)}`
                        : ""}
                    </p>
                    {coca && event.description ? (
                      <p className="mt-1 text-sm text-[var(--ink)]/80">
                        Verbale / note: {event.description}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-sm font-medium text-[var(--forest)]">
                    Registro →
                  </span>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </StaffShell>
  );
}
