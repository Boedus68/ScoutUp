import Link from "next/link";
import { connection } from "next/server";
import { StaffShell } from "@/components/staff-shell";
import { requireRole } from "@/lib/auth";
import {
  branchLabel,
  cocaEventTypeLabel,
  eventTypeLabel,
  formatDateTime,
} from "@/lib/labels";
import type { EventType } from "@/lib/types";
import { isCocaUnit, staffUnitId } from "@/lib/staff-unit";

export default async function StaffDashboardPage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase, availableUnits } =
    await requireRole(["leader"]);

  const coca = isCocaUnit(unit);
  const typeLabel = coca ? cocaEventTypeLabel : eventTypeLabel;

  const nowIso = new Date().toISOString();
  const { data: events } = await supabase
    .from("events")
    .select("id, title, starts_at, location, event_type")
    .eq("unit_id", staffUnitId(profile) ?? "")
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(8);

  return (
    <StaffShell
      title={coca ? "Panoramica Co.Ca." : "Panoramica capo"}
      subtitle={
        unit
          ? `${unit.name} · ${branchLabel[unit.branch]}${
              unit.association_year ? ` · ${unit.association_year}` : ""
            }`
          : "Unità non assegnata"
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
      {coca ? (
        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <Link
            href="/dashboard/staff/calendario"
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-4 hover:bg-[var(--surface-muted)]"
          >
            <p className="font-semibold">Appuntamenti di Co.Ca.</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Riunioni, uscite, consigli e formazione.
            </p>
          </Link>
          <Link
            href="/dashboard/staff/percorso-formativo"
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-4 hover:bg-[var(--surface-muted)]"
          >
            <p className="font-semibold">Il Mio Percorso Formativo</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              CFT, CFM, CFA e Nomina a Capo.
            </p>
          </Link>
          <Link
            href="/dashboard/staff/bacheca"
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-4 hover:bg-[var(--surface-muted)]"
          >
            <p className="font-semibold">Bacheca & Documenti</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              PE, verbali e cassa di Gruppo.
            </p>
          </Link>
        </section>
      ) : null}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {coca ? "Prossimi appuntamenti" : "Prossime uscite"}
            </h2>
            <p className="text-sm text-[var(--muted)]">
              {coca
                ? "Registro presenze e note condivise tra capi."
                : "Apri il registro Presenze / quote / autorizzazioni."}
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
              {coca
                ? "Nessun appuntamento in programma."
                : "Nessuna uscita in programma."}
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
    </StaffShell>
  );
}
