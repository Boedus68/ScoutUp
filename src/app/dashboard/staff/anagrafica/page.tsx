import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/labels";

export default async function StaffAnagraficaPage() {
  await connection();
  const { profile, roles, activeRole, supabase } = await requireRole(["leader"]);

  const { data: members } = profile.unit_id
    ? await supabase
        .from("profiles")
        .select("full_name, totem, phone, birth_date, role")
        .eq("unit_id", profile.unit_id)
        .order("full_name")
    : {
        data: [] as {
          full_name: string;
          totem: string | null;
          phone: string | null;
          birth_date: string | null;
          role: string;
        }[],
      };

  return (
    <DashboardShell
      title="Anagrafica"
      subtitle="Censimento unità (sola lettura Fase 1)"
      activeRole={activeRole}
      roles={roles}
    >
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="bg-[var(--surface-muted)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Totem</th>
              <th className="px-4 py-3 font-medium">Ruolo</th>
              <th className="px-4 py-3 font-medium">Nascita</th>
              <th className="px-4 py-3 font-medium">Telefono</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {(members ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-[var(--muted)]">
                  Nessun profilo in unità.
                </td>
              </tr>
            ) : (
              (members ?? []).map((m) => (
                <tr key={`${m.full_name}-${m.role}`}>
                  <td className="px-4 py-3 font-medium">{m.full_name}</td>
                  <td className="px-4 py-3">{m.totem ?? "—"}</td>
                  <td className="px-4 py-3">{m.role}</td>
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
