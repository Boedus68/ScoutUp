import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/labels";

export default async function ParentAnagraficaPage() {
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
          .select("full_name, totem, birth_date, phone")
          .in("id", childIds)
          .order("full_name")
      : {
          data: [] as {
            full_name: string;
            totem: string | null;
            birth_date: string | null;
            phone: string | null;
          }[],
        };

  return (
    <DashboardShell
      title="Anagrafica figli"
      subtitle="Dati in sola lettura"
      activeRole={activeRole}
      roles={roles}
    >
      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        {(children ?? []).length === 0 ? (
          <li className="px-4 py-8 text-sm text-[var(--muted)]">Nessun figlio collegato.</li>
        ) : (
          (children ?? []).map((c) => (
            <li key={c.full_name} className="px-4 py-4 text-sm">
              <p className="font-semibold">
                {c.full_name}
                {c.totem ? ` (${c.totem})` : ""}
              </p>
              <p className="text-[var(--muted)]">
                Nascita: {c.birth_date ? formatDate(c.birth_date) : "—"}
                {c.phone ? ` · Tel. ${c.phone}` : ""}
              </p>
            </li>
          ))
        )}
      </ul>
    </DashboardShell>
  );
}
