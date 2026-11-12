import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/labels";
import type { AttendanceStatus } from "@/lib/types";

export default async function ParentDashboardPage() {
  await connection();
  const { profile, roles, activeRole, supabase } = await requireRole(["parent"]);

  const { data: links } = await supabase
    .from("parent_child")
    .select("child_id")
    .eq("parent_id", profile.id);

  const childIds = (links ?? []).map((row) => row.child_id);

  const { data: children } =
    childIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, unit_id, totem")
          .in("id", childIds)
      : { data: [] as { id: string; full_name: string; unit_id: string | null; totem: string | null }[] };

  const unitIds = [
    ...new Set(
      (children ?? [])
        .map((child) => child.unit_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const nowIso = new Date().toISOString();

  const { data: events } =
    unitIds.length > 0
      ? await supabase
          .from("events")
          .select("id, title, starts_at, location, unit_id")
          .in("unit_id", unitIds)
          .gte("starts_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(40)
      : {
          data: [] as {
            id: string;
            title: string;
            starts_at: string;
            location: string | null;
            unit_id: string;
          }[],
        };

  const eventIds = (events ?? []).map((event) => event.id);

  const { data: attendances } =
    eventIds.length > 0 && childIds.length > 0
      ? await supabase
          .from("attendances")
          .select("event_id, member_id, status")
          .in("event_id", eventIds)
          .in("member_id", childIds)
      : {
          data: [] as {
            event_id: string;
            member_id: string;
            status: AttendanceStatus;
          }[],
        };

  const attendanceMap = new Map(
    (attendances ?? []).map(
      (row) => [`${row.event_id}:${row.member_id}`, row.status] as const,
    ),
  );

  return (
    <DashboardShell
      title="Area genitore"
      subtitle="Uscite e Presenze dei figli collegati"
      activeRole={activeRole}
      roles={roles}
    >
      {(children ?? []).length === 0 ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Nessun figlio collegato in <code>parent_child</code>.
        </p>
      ) : null}

      <section className="space-y-6">
        {(children ?? []).map((child) => {
          const childEvents = (events ?? []).filter(
            (event) => event.unit_id === child.unit_id,
          );

          return (
            <div
              key={child.id}
              className="overflow-hidden rounded-xl border border-[var(--border)] bg-white"
            >
              <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
                <h2 className="font-semibold">
                  {child.full_name}
                  {child.totem ? (
                    <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                      ({child.totem})
                    </span>
                  ) : null}
                </h2>
                <p className="text-sm text-[var(--muted)]">Prossime uscite</p>
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {childEvents.length === 0 ? (
                  <li className="px-4 py-6 text-sm text-[var(--muted)]">
                    Nessuna uscita in programma.
                  </li>
                ) : (
                  childEvents.map((event) => (
                    <li
                      key={event.id}
                      className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-[var(--muted)]">
                          {formatDateTime(event.starts_at)}
                          {event.location ? ` · ${event.location}` : ""}
                        </p>
                      </div>
                      <StatusBadge
                        status={
                          attendanceMap.get(`${event.id}:${child.id}`) ?? null
                        }
                      />
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </section>
    </DashboardShell>
  );
}
