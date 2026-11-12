import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { branchLabel } from "@/lib/labels";

export default async function StaffUnitaPage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase } = await requireRole([
    "leader",
  ]);

  let groupName: string | null = null;
  if (unit?.group_id) {
    const { data: group } = await supabase
      .from("groups")
      .select("name, city")
      .eq("id", unit.group_id)
      .maybeSingle();
    groupName = group
      ? `${group.name}${group.city ? ` · ${group.city}` : ""}`
      : null;
  }

  const { data: subgroups } = profile.unit_id
    ? await supabase
        .from("subgroups")
        .select("id, name")
        .eq("unit_id", profile.unit_id)
        .order("name")
    : { data: [] as { id: string; name: string }[] };

  const { data: members } = profile.unit_id
    ? await supabase
        .from("profiles")
        .select("id, full_name, totem, role, subgroup_id")
        .eq("unit_id", profile.unit_id)
        .order("full_name")
    : {
        data: [] as {
          id: string;
          full_name: string;
          totem: string | null;
          role: string;
          subgroup_id: string | null;
        }[],
      };

  const subgroupName = new Map((subgroups ?? []).map((s) => [s.id, s.name]));

  return (
    <DashboardShell
      title="Unità"
      subtitle={unit ? unit.name : "Struttura"}
      activeRole={activeRole}
      roles={roles}
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-[var(--border)] bg-white p-5">
          <h2 className="font-semibold">Dettagli</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--muted)]">Gruppo</dt>
              <dd className="font-medium">{groupName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Branca</dt>
              <dd className="font-medium">
                {unit ? branchLabel[unit.branch] : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Anno associativo</dt>
              <dd className="font-medium">{unit?.association_year ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-white p-5">
          <h2 className="font-semibold">Sottogruppi</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {(subgroups ?? []).length === 0 ? (
              <li className="text-[var(--muted)]">Nessuna squadriglia/sestiglia ancora.</li>
            ) : (
              (subgroups ?? []).map((sg) => <li key={sg.id}>{sg.name}</li>)
            )}
          </ul>
        </section>

        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="font-semibold">Persone dell&apos;unità</h2>
          </div>
          <ul className="divide-y divide-[var(--border)] text-sm">
            {(members ?? []).map((m) => (
              <li key={m.id} className="flex justify-between gap-3 px-4 py-3">
                <span>
                  {m.full_name}
                  {m.totem ? ` (${m.totem})` : ""}
                </span>
                <span className="text-[var(--muted)]">
                  {m.role}
                  {m.subgroup_id
                    ? ` · ${subgroupName.get(m.subgroup_id) ?? ""}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </DashboardShell>
  );
}
