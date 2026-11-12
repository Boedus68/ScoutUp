import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { branchLabel, formatDate, roleLabel } from "@/lib/labels";

export default async function MemberProfiloPage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase } = await requireRole([
    "member",
  ]);

  let subgroupName: string | null = null;
  if (profile.subgroup_id) {
    const { data } = await supabase
      .from("subgroups")
      .select("name")
      .eq("id", profile.subgroup_id)
      .maybeSingle();
    subgroupName = data?.name ?? null;
  }

  return (
    <DashboardShell
      title="Il mio profilo"
      subtitle="Sola lettura"
      activeRole={activeRole}
      roles={roles}
    >
      <dl className="grid max-w-lg gap-3 rounded-xl border border-[var(--border)] bg-white p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[var(--muted)]">Nome</dt>
          <dd className="font-medium">{profile.full_name}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Totem</dt>
          <dd className="font-medium">{profile.totem ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Ruolo</dt>
          <dd className="font-medium">{roleLabel[profile.role]}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Unità</dt>
          <dd className="font-medium">
            {unit ? `${unit.name} · ${branchLabel[unit.branch]}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Sottogruppo</dt>
          <dd className="font-medium">{subgroupName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Nascita</dt>
          <dd className="font-medium">
            {profile.birth_date ? formatDate(profile.birth_date) : "—"}
          </dd>
        </div>
      </dl>
    </DashboardShell>
  );
}
