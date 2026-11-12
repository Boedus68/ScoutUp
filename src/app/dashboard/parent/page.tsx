import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatusBadge } from "@/components/status-badge";
import {
  AuthorizeButton,
  ConfirmButtons,
} from "@/components/event-response-forms";
import { requireRole } from "@/lib/auth";
import {
  authorizationLabel,
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
      : {
          data: [] as {
            id: string;
            full_name: string;
            unit_id: string | null;
            totem: string | null;
          }[],
        };

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
          .select(
            "id, title, starts_at, location, unit_id, event_type, fee_amount, equipment_list",
          )
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
            event_type: EventType;
            fee_amount: number | null;
            equipment_list: string | null;
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

  const { data: confirmations } =
    eventIds.length > 0 && childIds.length > 0
      ? await supabase
          .from("event_confirmations")
          .select("event_id, member_id, status")
          .in("event_id", eventIds)
          .in("member_id", childIds)
      : {
          data: [] as {
            event_id: string;
            member_id: string;
            status: ConfirmationStatus;
          }[],
        };

  const { data: authorizations } =
    eventIds.length > 0 && childIds.length > 0
      ? await supabase
          .from("event_authorizations")
          .select("event_id, member_id, status")
          .in("event_id", eventIds)
          .in("member_id", childIds)
      : {
          data: [] as {
            event_id: string;
            member_id: string;
            status: AuthorizationStatus;
          }[],
        };

  const attendanceMap = new Map<string, AttendanceStatus>(
    (attendances ?? []).map((row) => [
      `${row.event_id}:${row.member_id}`,
      row.status as AttendanceStatus,
    ]),
  );
  const confirmationMap = new Map<string, ConfirmationStatus>(
    (confirmations ?? []).map((row) => [
      `${row.event_id}:${row.member_id}`,
      row.status as ConfirmationStatus,
    ]),
  );
  const authorizationMap = new Map<string, AuthorizationStatus>(
    (authorizations ?? []).map((row) => [
      `${row.event_id}:${row.member_id}`,
      row.status as AuthorizationStatus,
    ]),
  );

  return (
    <DashboardShell
      title="Area genitore"
      subtitle="Prossime uscite, conferma e autorizzazione"
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
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {childEvents.length === 0 ? (
                  <li className="px-4 py-6 text-sm text-[var(--muted)]">
                    Nessuna uscita in programma.
                  </li>
                ) : (
                  childEvents.map((event) => {
                    const key = `${event.id}:${child.id}`;
                    const type =
                      (event.event_type as EventType | undefined) ?? "meeting";
                    const conf = confirmationMap.get(key) ?? null;
                    const auth = authorizationMap.get(key) ?? null;
                    return (
                      <li key={event.id} className="space-y-3 px-4 py-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-[var(--muted)]">
                              {eventTypeLabel[type]} ·{" "}
                              {formatDateTime(event.starts_at)}
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
                                {conf
                                  ? confirmationLabel[conf]
                                  : "In attesa"}
                              </span>
                              <span>
                                Autorizz.:{" "}
                                {auth
                                  ? authorizationLabel[auth]
                                  : "Da autorizzare"}
                              </span>
                              <StatusBadge
                                status={attendanceMap.get(key) ?? null}
                              />
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <ConfirmButtons
                            eventId={event.id}
                            memberId={child.id}
                            actor="parent"
                          />
                          <AuthorizeButton
                            eventId={event.id}
                            memberId={child.id}
                            currentlyAuthorized={auth === "authorized"}
                          />
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          );
        })}
      </section>
    </DashboardShell>
  );
}
