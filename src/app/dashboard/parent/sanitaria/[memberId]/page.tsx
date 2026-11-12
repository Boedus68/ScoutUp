import { connection } from "next/server";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import type { MedicalRecord } from "@/lib/types";
import { MedicalForm } from "../medical-form";

type PageProps = { params: Promise<{ memberId: string }> };

/**
 * URL diretto a scheda sanitaria di un ragazzo.
 * RLS + check parent_child: se non collegato → deny/vuoto (test obbligatorio).
 */
export default async function ParentSanitariaMemberPage({ params }: PageProps) {
  await connection();
  const { memberId } = await params;
  const { profile, roles, activeRole, supabase } = await requireRole(["parent"]);

  const { data: link } = await supabase
    .from("parent_child")
    .select("child_id")
    .eq("parent_id", profile.id)
    .eq("child_id", memberId)
    .maybeSingle();

  const { data: child } = link
    ? await supabase
        .from("profiles")
        .select("id, full_name, totem")
        .eq("id", memberId)
        .maybeSingle()
    : { data: null };

  const { data: record } = link
    ? await supabase
        .from("medical_records")
        .select("*")
        .eq("member_id", memberId)
        .maybeSingle()
    : { data: null };

  const denied = !link || !child;

  return (
    <DashboardShell
      title="Scheda sanitaria"
      subtitle="Accesso diretto"
      activeRole={activeRole}
      roles={roles}
      headerActions={
        <Link
          href="/dashboard/parent/sanitaria"
          className="text-sm font-medium text-[var(--forest)]"
        >
          ← Tutte le schede
        </Link>
      }
    >
      {denied ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          Accesso negato: questo ragazzo non è collegato al tuo profilo genitore
          (RLS / parent_child). Nessun dato sanitario mostrato.
        </p>
      ) : (
        <MedicalForm
          child={child}
          record={(record as MedicalRecord | null) ?? null}
        />
      )}
    </DashboardShell>
  );
}
