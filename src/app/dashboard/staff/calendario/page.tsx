import Link from "next/link";
import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { eventTypeLabel, formatDateTime, formatEuro } from "@/lib/labels";
import type { EventType } from "@/lib/types";

export default async function StaffCalendarioPage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase } = await requireRole([
    "leader",
  ]);

  const { data: events } = await supabase
    .from("events")
    .select("id, title, starts_at, location, event_type, fee_amount")
    .eq("unit_id", profile.unit_id ?? "")
    .order("starts_at", { ascending: true });

  return (
    <DashboardShell
      title="Calendario"
      subtitle={unit ? unit.name : "Uscite e attività"}
      activeRole={activeRole}
      roles={roles}
      headerActions={
        <Link
          href="/dashboard/staff/events/new"
          className="rounded-md bg-[var(--forest)] px-3 py-1.5 text-sm font-semibold text-white"
        >
          Nuova uscita
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
            const type = (event.event_type as EventType | undefined) ?? "meeting";
            return (
              <li key={event.id}>
                <Link
                  href={`/dashboard/staff/events/${event.id}/presenze`}
                  className="flex flex-col gap-1 px-4 py-4 transition hover:bg-[var(--surface-muted)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {eventTypeLabel[type]} · {formatDateTime(event.starts_at)}
                      {event.location ? ` · ${event.location}` : ""}
                      {event.fee_amount != null
                        ? ` · Quota ${formatEuro(event.fee_amount)}`
                        : ""}
                    </p>
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
    </DashboardShell>
  );
}
