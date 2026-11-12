import { connection } from "next/server";
import { StaffShell } from "@/components/staff-shell";
import {
  FascicoloDocument,
  type FascicoloMember,
} from "@/components/fascicolo-document";
import { PrintButton } from "@/components/print-button";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/labels";
import type { MedicalRecord } from "@/lib/types";
import { staffUnitId } from "@/lib/staff-unit";

export default async function UnitFascicoloPage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase, availableUnits} = await requireRole([
    "leader",
  ]);

  const { data: members } = staffUnitId(profile)
    ? await supabase
        .from("profiles")
        .select("id, full_name, totem")
        .eq("unit_id", staffUnitId(profile))
        .eq("role", "member")
        .order("full_name")
    : { data: [] as { id: string; full_name: string; totem: string | null }[] };

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

  return (
    <StaffShell
      title="Fascicolo sicurezza"
      subtitle={unit?.name ?? "Unità"}
      activeRole={activeRole}
      roles={roles}
      unit={unit}
      availableUnits={availableUnits}
      headerActions={<PrintButton />}
    >
      <p className="no-print mb-4 text-sm text-[var(--muted)]">
        Pagina stampabile: usa «Stampa / Salva PDF» del browser. Non è un PDF
        server-side (MVP).
      </p>
      <FascicoloDocument
        unitName={unit?.name ?? "Unità"}
        members={rows}
        generatedAt={formatDateTime(new Date().toISOString())}
      />
    </StaffShell>
  );
}
