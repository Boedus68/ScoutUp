import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProgressionPath } from "@/components/progression-path";
import { requireRole } from "@/lib/auth";
import {
  branchLabel,
  progressionPathTitle,
} from "@/lib/labels";
import type {
  ProgressionCatalogItem,
  ProgressionItem,
} from "@/lib/types";

export default async function MemberProgressionePage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase } = await requireRole([
    "member",
  ]);

  if (!unit) {
    return (
      <DashboardShell
        title="Progressione"
        activeRole={activeRole}
        roles={roles}
      >
        <p className="text-sm text-[var(--muted)]">
          Assegna un&apos;unità al profilo per vedere il percorso della branca.
        </p>
      </DashboardShell>
    );
  }

  const { data: catalog } = await supabase
    .from("progression_catalog")
    .select("*")
    .eq("branch", unit.branch)
    .order("sort_order");

  const { data: items } = await supabase
    .from("progression_items")
    .select("*")
    .eq("member_id", profile.id)
    .order("created_at");

  return (
    <DashboardShell
      title={progressionPathTitle(unit.branch)}
      subtitle={`${unit.name} · ${branchLabel[unit.branch]}`}
      activeRole={activeRole}
      roles={roles}
    >
      <p className="mb-6 max-w-2xl text-sm text-[var(--muted)]">
        Percorso della tua branca. Puoi inviare una richiesta di conquista /
        verifica al capo per gli item in corso o del catalogo.
      </p>
      <ProgressionPath
        branch={unit.branch}
        catalog={(catalog ?? []) as ProgressionCatalogItem[]}
        items={(items ?? []) as ProgressionItem[]}
        mode="member"
      />
    </DashboardShell>
  );
}
