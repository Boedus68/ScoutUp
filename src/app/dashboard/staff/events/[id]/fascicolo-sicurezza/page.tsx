import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  FascicoloDocument,
  type FascicoloMember,
} from "@/components/fascicolo-document";
import { PrintButton } from "@/components/print-button";
import { requireRole } from "@/lib/auth";
import { eventTypeLabel, formatDateTime } from "@/lib/labels";
import type { EventType, MedicalRecord } from "@/lib/types";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventFascicoloPage({ params }: PageProps) {
  await connection();
  const { id } = await params;
  const { profile, unit, roles, activeRole, supabase } = await requireRole([
    "leader",
  ]);

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
    .select("id, full_name, totem")
    .eq("unit_id", profile.unit_id ?? "")
    .eq("role", "member")
    .order("full_name");

  const ids = (members ?? []).map((m) => m.id);
  const { data: medicalRows } =
    ids.length > 0
      ? await supabase.from("medical_records").select("*").in("member_id", ids)
      : { data: [] as MedicalRecord[] };

  const medicalById = new Map(
    (medicalRows ?? []).map((r) => [r.member_id, r as MedicalRecord]),
  );

  const rows: FascicoloMember[] = (members ?? []).map((m) => ({
    id: m.id,
    full_name: m.full_name,
    totem: m.totem,
    medical: medicalById.get(m.id) ?? null,
  }));

  const type = (event.event_type as EventType | undefined) ?? "meeting";

  return (
    <DashboardShell
      title="Fascicolo sicurezza"
      subtitle={event.title}
      activeRole={activeRole}
      roles={roles}
      headerActions={
        <div className="no-print flex items-center gap-3">
          <PrintButton />
          <Link
            href={`/dashboard/staff/events/${event.id}/presenze`}
            className="text-sm font-medium text-[var(--forest)]"
          >
            ← Registro
          </Link>
        </div>
      }
    >
      <FascicoloDocument
        unitName={unit?.name ?? "Unità"}
        eventTitle={event.title}
        eventMeta={`${eventTypeLabel[type]} · ${formatDateTime(event.starts_at)}${
          event.location ? ` · ${event.location}` : ""
        }`}
        members={rows}
        generatedAt={formatDateTime(new Date().toISOString())}
      />
    </DashboardShell>
  );
}
