import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmButtons } from "@/components/event-response-forms";
import { requireRole } from "@/lib/auth";
import {
  authorizationLabel,
  branchLabel,
  confirmationLabel,
  eventTypeLabel,
  formatDateTime,
  formatEuro,
} from "@/lib/labels";
import type {
  AttendanceStatus,
  AuthorizationStatus,
  ConfirmationStatus,
  EventType,
} from "@/lib/types";

export default async function MemberDashboardPage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase } = await requireRole([
    "member",
  ]);

  const nowIso = new Date().toISOString();

  const { data: events } = profile.unit_id
    ? await supabase
        .from("events")
        .select(
          "id, title, starts_at, location, event_type, fee_amount, equipment_list",
        )
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
          event_type: EventType;
          fee_amount: number | null;
          equipment_list: string | null;
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

  const { data: confirmations } =
    eventIds.length > 0
      ? await supabase
          .from("event_confirmations")
          .select("event_id, status")
          .eq("member_id", profile.id)
          .in("event_id", eventIds)
      : { data: [] as { event_id: string; status: ConfirmationStatus }[] };

  const { data: authorizations } =
    eventIds.length > 0
      ? await supabase
          .from("event_authorizations")
          .select("event_id, status")
          .eq("member_id", profile.id)
          .in("event_id", eventIds)
      : { data: [] as { event_id: string; status: AuthorizationStatus }[] };

  const byEvent = new Map<string, AttendanceStatus>(
    (attendances ?? []).map((row) => [
      row.event_id,
      row.status as AttendanceStatus,
    ]),
  );
  const confByEvent = new Map<string, ConfirmationStatus>(
    (confirmations ?? []).map((row) => [
      row.event_id,
      row.status as ConfirmationStatus,
    ]),
  );
  const authByEvent = new Map<string, AuthorizationStatus>(
    (authorizations ?? []).map((row) => [
      row.event_id,
      row.status as AuthorizationStatus,
    ]),
  );

  return (
    <DashboardShell
      title="Calendario"
      subtitle={
        unit
          ? `${unit.name} · ${branchLabel[unit.branch]}`
          : "Prossime uscite"
      }
      activeRole={activeRole}
      roles={roles}
    >
      <p className="mb-6 text-sm text-[var(--muted)]">
        Ciao {profile.full_name}
        {profile.totem ? ` (${profile.totem})` : ""}. Conferma la partecipazione
        alle prossime uscite; l&apos;autorizzazione digitale la fa il genitore.
      </p>

      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        {(events ?? []).length === 0 ? (
          <li className="px-4 py-8 text-sm text-[var(--muted)]">
            Nessuna uscita in programma.
          </li>
        ) : (
          (events ?? []).map((event) => {
            const type =
              (event.event_type as EventType | undefined) ?? "meeting";
            const conf = confByEvent.get(event.id) ?? null;
            const auth = authByEvent.get(event.id) ?? null;
            return (
              <li key={event.id} className="space-y-3 px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {eventTypeLabel[type]} · {formatDateTime(event.starts_at)}
                      {event.location ? ` · ${event.location}` : ""}
                      {event.fee_amount != null
                        ? ` · Quota ${formatEuro(event.fee_amount)}`
                        : ""}
                    </p>
                    {event.equipment_list ? (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Equipaggiamento: {event.equipment_list}
                      </p>
                    ) : null}
                    <p className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span>
                        Conferma:{" "}
                        {conf ? confirmationLabel[conf] : "In attesa"}
                      </span>
                      <span>
                        Autorizz. genitore:{" "}
                        {auth ? authorizationLabel[auth] : "In attesa"}
                      </span>
                      <StatusBadge status={byEvent.get(event.id) ?? null} />
                    </p>
                  </div>
                </div>
                <ConfirmButtons
                  eventId={event.id}
                  memberId={profile.id}
                  actor="member"
                />
              </li>
            );
          })
        )}
      </ul>
    </DashboardShell>
  );
}
