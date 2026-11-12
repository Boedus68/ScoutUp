import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import type { MedicalRecord } from "@/lib/types";
import { MedicalForm } from "./medical-form";

export default async function ParentSanitariaPage() {
  await connection();
  const { profile, roles, activeRole, supabase } = await requireRole(["parent"]);

  const { data: links } = await supabase
    .from("parent_child")
    .select("child_id")
    .eq("parent_id", profile.id);

  const childIds = (links ?? []).map((l) => l.child_id);

  const { data: children } =
    childIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, totem")
          .in("id", childIds)
          .order("full_name")
      : { data: [] as { id: string; full_name: string; totem: string | null }[] };

  const { data: records } =
    childIds.length > 0
      ? await supabase.from("medical_records").select("*").in("member_id", childIds)
      : { data: [] as MedicalRecord[] };

  const byMember = new Map(
    (records ?? []).map((r) => [r.member_id, r as MedicalRecord]),
  );

  return (
    <DashboardShell
      title="Scheda sanitaria"
      subtitle="Dati sensibili — visibili ai capi dell’unità del ragazzo"
      activeRole={activeRole}
      roles={roles}
    >
      <p className="mb-6 max-w-2xl text-sm text-[var(--muted)]">
        Compila la scheda per ogni figlio. Solo tu (genitore collegato) puoi
        modificarla. I capi dell’unità la leggono in uscita per la sicurezza
        (badge allerta e fascicolo).
      </p>

      {(children ?? []).length === 0 ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Nessun figlio collegato.
        </p>
      ) : (
        <div className="space-y-8">
          {(children ?? []).map((child) => (
            <MedicalForm
              key={child.id}
              child={child}
              record={byMember.get(child.id) ?? null}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
