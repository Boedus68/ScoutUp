import Link from "next/link";
import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { branchLabel, formatDateTime } from "@/lib/labels";

export default async function StaffDashboardPage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase } = await requireRole([
    "leader",
  ]);

  const { data: events } = await supabase
    .from("events")
    .select("id, title, starts_at, ends_at, location")
    .eq("unit_id", profile.unit_id ?? "")
    .order("starts_at", { ascending: false })
    .limit(30);

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
      {!profile.unit_id ? (
        <p className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Assegna un&apos;unità al profilo leader per gestire uscite e presenze.
        </p>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold">Uscite recenti</h2>
        <p className="text-sm text-[var(--muted)]">
          Apri un&apos;uscita per il registro Presenze.
        </p>
        <ul className="mt-4 divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          {(events ?? []).length === 0 ? (
            <li className="px-4 py-8 text-sm text-[var(--muted)]">
              Nessuna uscita ancora.
            </li>
          ) : (
            (events ?? []).map((event) => (
              <li key={event.id}>
                <Link
                  href={`/dashboard/staff/events/${event.id}/presenze`}
                  className="flex flex-col gap-1 px-4 py-4 transition hover:bg-[var(--surface-muted)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {formatDateTime(event.starts_at)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-[var(--forest)]">
                    Presenze →
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </DashboardShell>
  );
}
