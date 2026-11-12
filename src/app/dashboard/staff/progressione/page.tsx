import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { StaffShell } from "@/components/staff-shell";
import { requireRole } from "@/lib/auth";
import {
  branchLabel,
  progressionPathTitle,
  progressionStatusLabel,
} from "@/lib/labels";
import type { ProgressionStatus } from "@/lib/types";
import { isCocaUnit, staffUnitId } from "@/lib/staff-unit";

export default async function StaffProgressioneIndexPage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase, availableUnits } =
    await requireRole(["leader"]);

  if (isCocaUnit(unit)) {
    redirect("/dashboard/staff/percorso-formativo");
  }

  const { data: members } = staffUnitId(profile)
    ? await supabase
        .from("profiles")
        .select("id, full_name, totem")
        .eq("unit_id", staffUnitId(profile))
        .eq("role", "member")
        .order("full_name")
    : { data: [] as { id: string; full_name: string; totem: string | null }[] };

  const memberIds = (members ?? []).map((m) => m.id);

  const { data: requested } =
    memberIds.length > 0
      ? await supabase
          .from("progression_items")
          .select("id, member_id, title, status, kind")
          .in("member_id", memberIds)
          .eq("status", "requested")
      : { data: [] as { id: string; member_id: string; title: string; status: string; kind: string }[] };

  const reqByMember = new Map<string, number>();
  for (const r of requested ?? []) {
    reqByMember.set(r.member_id, (reqByMember.get(r.member_id) ?? 0) + 1);
  }

  return (
    <StaffShell
      title="Progressione"
      subtitle={
        unit
          ? `${progressionPathTitle(unit.branch)} · ${branchLabel[unit.branch]}`
          : "Unità"
      }
      activeRole={activeRole}
      roles={roles}
      unit={unit}
      availableUnits={availableUnits}
    >
      {(requested ?? []).length > 0 ? (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>{(requested ?? []).length}</strong> richieste in attesa di
          verifica.
        </p>
      ) : null}

      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        {(members ?? []).length === 0 ? (
          <li className="px-4 py-8 text-sm text-[var(--muted)]">
            Nessun ragazzo in unità.
          </li>
        ) : (
          (members ?? []).map((m) => {
            const pending = reqByMember.get(m.id) ?? 0;
            return (
              <li key={m.id}>
                <Link
                  href={`/dashboard/staff/progressione/${m.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-4 hover:bg-[var(--surface-muted)]"
                >
                  <div>
                    <p className="font-semibold">
                      {m.full_name}
                      {m.totem ? (
                        <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                          ({m.totem})
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {pending > 0
                        ? `${pending} ${progressionStatusLabel["requested" as ProgressionStatus].toLowerCase()}`
                        : "Apri percorso e note"}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-[var(--forest)]">
                    Apri →
                  </span>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </StaffShell>
  );
}
