import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/labels";
import type { AttendanceStatus } from "@/lib/types";
import { AttendanceForm } from "./attendance-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PresenzePage({ params }: PageProps) {
  await connection();
  const { id } = await params;
  const { profile, supabase } = await requireRole(["leader"]);

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

  const { data: attendances } = await supabase
    .from("attendances")
    .select("member_id, status, notes")
    .eq("event_id", id);

  const byMember = new Map(
    (attendances ?? []).map((row) => [row.member_id, row] as const),
  );

  const rows = (members ?? []).map((member) => {
    const existing = byMember.get(member.id);
    return {
      id: member.id,
      full_name: member.full_name,
      status: (existing?.status as AttendanceStatus | undefined) ?? "absent",
      notes: existing?.notes ?? "",
    };
  });

  return (
    <AppShell
      title="Registro Presenze"
      subtitle={`${event.title} · ${formatDateTime(event.starts_at)}${
        event.location ? ` · ${event.location}` : ""
      }`}
      nav={
        <Link href="/dashboard/staff" className="text-sm font-medium text-[var(--forest)]">
          ← Uscite
        </Link>
      }
    >
      <AttendanceForm eventId={event.id} members={rows} />
    </AppShell>
  );
}
