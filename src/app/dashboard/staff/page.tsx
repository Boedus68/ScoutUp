import Link from "next/link";
import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { branchLabel, eventTypeLabel, formatDateTime } from "@/lib/labels";
import type { EventType } from "@/lib/types";

export default async function StaffDashboardPage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase } = await requireRole([
    "leader",
  ]);

  const nowIso = new Date().toISOString();
  const { data: events } = await supabase
    .from("events")
    .select("id, title, starts_at, location, event_type")
    .eq("unit_id", profile.unit_id ?? "")
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(8);

  return (
    <DashboardShell
      title="Panoramica capo"
      subtitle={
        unit
          ? `${unit.name} · ${branchLabel[unit.branch]}${
              unit.association_year ? ` · ${unit.association_year}` : ""
            }`
          : "Unità non assegnata"
      }
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
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Prossime uscite</h2>
            <p className="text-sm text-[var(--muted)]">
              Apri il registro Presenze / quote / autorizzazioni.
            </p>
          </div>
          <Link
            href="/dashboard/staff/calendario"
            className="text-sm font-medium text-[var(--forest)]"
          >
            Calendario completo →
          </Link>
        </div>
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          {(events ?? []).length === 0 ? (
            <li className="px-4 py-8 text-sm text-[var(--muted)]">
              Nessuna uscita in programma.
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
                        {eventTypeLabel[type]} · {formatDateTime(event.starts_at)}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-[var(--forest)]">
                      Presenze →
                    </span>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </DashboardShell>
  );
}
