import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { branchLabel, formatDateTime } from "@/lib/labels";
import type { AttendanceStatus } from "@/lib/types";

export default async function MemberDashboardPage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase } = await requireRole([
    "member",
  ]);

  const nowIso = new Date().toISOString();

  const { data: events } = profile.unit_id
    ? await supabase
        .from("events")
        .select("id, title, starts_at, location")
        .eq("unit_id", profile.unit_id)
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(20)
    : {
        data: [] as {
          id: string;
          title: string;
          starts_at: string;
          location: string | null;
        }[],
      };

  const eventIds = (events ?? []).map((event) => event.id);

  const { data: attendances } =
    eventIds.length > 0
      ? await supabase
          .from("attendances")
          .select("event_id, status")
          .eq("member_id", profile.id)
          .in("event_id", eventIds)
      : { data: [] as { event_id: string; status: AttendanceStatus }[] };

  const byEvent = new Map(
    (attendances ?? []).map((row) => [row.event_id, row.status] as const),
  );

  return (
    <DashboardShell
      title="La mia unità"
      subtitle={
        unit
          ? `${unit.name} · ${branchLabel[unit.branch]}`
          : "Calendario in sola lettura"
      }
      activeRole={activeRole}
      roles={roles}
    >
      <p className="mb-6 text-sm text-[var(--muted)]">
        Ciao {profile.full_name}
        {profile.totem ? ` (${profile.totem})` : ""}. Ecco le prossime uscite e
        lo stato delle tue Presenze.
      </p>

      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        {(events ?? []).length === 0 ? (
          <li className="px-4 py-8 text-sm text-[var(--muted)]">
            Nessuna uscita in programma.
          </li>
        ) : (
          (events ?? []).map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold">{event.title}</p>
                <p className="text-sm text-[var(--muted)]">
                  {formatDateTime(event.starts_at)}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
              </div>
              <StatusBadge status={byEvent.get(event.id) ?? null} />
            </li>
          ))
        )}
      </ul>
    </DashboardShell>
  );
}
