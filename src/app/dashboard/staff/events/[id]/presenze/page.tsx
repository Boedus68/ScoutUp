import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import {
  eventTypeLabel,
  formatDateTime,
  formatEuro,
} from "@/lib/labels";
import type {
  AttendanceStatus,
  AuthorizationStatus,
  ConfirmationStatus,
  EventType,
  MedicalRecord,
  PaymentStatus,
} from "@/lib/types";
import { OfflineEventCache } from "@/components/offline-event-cache";
import { AttendanceForm } from "./attendance-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PresenzePage({ params }: PageProps) {
  await connection();
  const { id } = await params;
  const { profile, roles, activeRole, supabase } = await requireRole(["leader"]);

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!event || event.unit_id !== profile.unit_id) {
    notFound();
  }

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("unit_id", profile.unit_id ?? "")
    .eq("role", "member")
    .order("full_name");

  const memberIds = (members ?? []).map((m) => m.id);

  const { data: attendances } = await supabase
    .from("attendances")
    .select("member_id, status, notes, payment_status")
    .eq("event_id", id);

  const { data: confirmations } =
    memberIds.length > 0
      ? await supabase
          .from("event_confirmations")
          .select("member_id, status")
          .eq("event_id", id)
          .in("member_id", memberIds)
      : { data: [] as { member_id: string; status: ConfirmationStatus }[] };

  const { data: authorizations } =
    memberIds.length > 0
      ? await supabase
          .from("event_authorizations")
          .select("member_id, status")
          .eq("event_id", id)
          .in("member_id", memberIds)
      : { data: [] as { member_id: string; status: AuthorizationStatus }[] };

  const { data: medicalRows } =
    memberIds.length > 0
      ? await supabase.from("medical_records").select("*").in("member_id", memberIds)
      : { data: [] as MedicalRecord[] };

  const medicalByMember = new Map(
    (medicalRows ?? []).map((row) => [row.member_id, row as MedicalRecord]),
  );

  // Frequenza: % present+late su eventi dell'unità con almeno un attendance del ragazzo
  const { data: history } =
    memberIds.length > 0
      ? await supabase
          .from("attendances")
          .select("member_id, status, event_id, events!inner(unit_id)")
          .in("member_id", memberIds)
          .eq("events.unit_id", profile.unit_id ?? "")
      : {
          data: [] as {
            member_id: string;
            status: AttendanceStatus;
            event_id: string;
          }[],
        };

  const freqMap = new Map<string, { total: number; presentish: number }>();
  for (const row of history ?? []) {
    const cur = freqMap.get(row.member_id) ?? { total: 0, presentish: 0 };
    cur.total += 1;
    if (row.status === "present" || row.status === "late") cur.presentish += 1;
    freqMap.set(row.member_id, cur);
  }

  const byMember = new Map(
    (attendances ?? []).map((row) => [row.member_id, row] as const),
  );
  const confByMember = new Map(
    (confirmations ?? []).map((row) => [row.member_id, row.status] as const),
  );
  const authByMember = new Map(
    (authorizations ?? []).map((row) => [row.member_id, row.status] as const),
  );

  const rows = (members ?? []).map((member) => {
    const existing = byMember.get(member.id);
    const freq = freqMap.get(member.id);
    return {
      id: member.id,
      full_name: member.full_name,
      status: (existing?.status as AttendanceStatus | undefined) ?? "absent",
      payment_status:
        (existing?.payment_status as PaymentStatus | undefined) ?? "unpaid",
      notes: existing?.notes ?? "",
      confirmation: (confByMember.get(member.id) as ConfirmationStatus | undefined) ?? null,
      authorization:
        (authByMember.get(member.id) as AuthorizationStatus | undefined) ?? null,
      frequencyPct:
        freq && freq.total > 0
          ? Math.round((freq.presentish / freq.total) * 100)
          : null,
      medical: medicalByMember.get(member.id) ?? null,
    };
  });

  const eventType = (event.event_type as EventType | undefined) ?? "meeting";

  return (
    <DashboardShell
      title="Registro Presenze"
      subtitle={`${event.title} · ${eventTypeLabel[eventType]} · ${formatDateTime(event.starts_at)}${
        event.location ? ` · ${event.location}` : ""
      }`}
      activeRole={activeRole}
      roles={roles}
      headerActions={
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/dashboard/staff/events/${event.id}/fascicolo-sicurezza`}
            className="text-sm font-medium text-[var(--forest)]"
          >
            Fascicolo sicurezza
          </Link>
          <Link
            href="/dashboard/staff/calendario"
            className="text-sm font-medium text-[var(--forest)]"
          >
            ← Calendario
          </Link>
        </div>
      }
    >
      <div className="mb-6 grid gap-3 rounded-xl border border-[var(--border)] bg-white p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-[var(--muted)]">Quota</p>
          <p className="font-medium">{formatEuro(event.fee_amount)}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-[var(--muted)]">Equipaggiamento</p>
          <p className="whitespace-pre-wrap font-medium">
            {event.equipment_list || "—"}
          </p>
        </div>
      </div>

      <OfflineEventCache
        eventId={event.id}
        event={event as unknown as Record<string, unknown>}
        members={(members ?? []) as unknown as Array<Record<string, unknown>>}
        medical={(medicalRows ?? []) as MedicalRecord[]}
        attendances={(attendances ?? []) as unknown as Array<Record<string, unknown>>}
      />

      <AttendanceForm
        eventId={event.id}
        members={rows}
        hasFee={event.fee_amount != null && Number(event.fee_amount) > 0}
      />
    </DashboardShell>
  );
}
