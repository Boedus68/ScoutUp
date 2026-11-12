import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/labels";
import { CsvCensusImport } from "./csv-import";

export default async function StaffAnagraficaPage() {
  await connection();
  const { profile, roles, activeRole, supabase } = await requireRole(["leader"]);

  const { data: members } = profile.unit_id
    ? await supabase
        .from("profiles")
        .select("id, full_name, totem, phone, birth_date, role, subgroup_id")
        .eq("unit_id", profile.unit_id)
        .order("full_name")
    : {
        data: [] as {
          id: string;
          full_name: string;
          totem: string | null;
          phone: string | null;
          birth_date: string | null;
          role: string;
          subgroup_id: string | null;
        }[],
      };

  const subgroupIds = [
    ...new Set(
      (members ?? [])
        .map((m) => m.subgroup_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: subgroups } =
    subgroupIds.length > 0
      ? await supabase.from("subgroups").select("id, name").in("id", subgroupIds)
      : { data: [] as { id: string; name: string }[] };
  const subgroupName = new Map((subgroups ?? []).map((s) => [s.id, s.name]));

  return (
    <DashboardShell
      title="Anagrafica"
      subtitle="Censimento unità + import CSV"
      activeRole={activeRole}
      roles={roles}
    >
      <CsvCensusImport />

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-[var(--surface-muted)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Totem</th>
              <th className="px-4 py-3 font-medium">Ruolo</th>
              <th className="px-4 py-3 font-medium">Sottogruppo</th>
              <th className="px-4 py-3 font-medium">Nascita</th>
              <th className="px-4 py-3 font-medium">Telefono</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {(members ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-[var(--muted)]">
                  Nessun profilo in unità.
                </td>
              </tr>
            ) : (
              (members ?? []).map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium">{m.full_name}</td>
                  <td className="px-4 py-3">{m.totem ?? "—"}</td>
                  <td className="px-4 py-3">{m.role}</td>
                  <td className="px-4 py-3">
                    {m.subgroup_id
                      ? (subgroupName.get(m.subgroup_id) ?? "—")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {m.birth_date ? formatDate(m.birth_date) : "—"}
                  </td>
                  <td className="px-4 py-3">{m.phone ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
