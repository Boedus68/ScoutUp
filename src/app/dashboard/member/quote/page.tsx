import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import {
  feeStatusLabel,
  formatDate,
  formatEuro,
} from "@/lib/labels";
import type { FeeStatus } from "@/lib/types";

export default async function MemberQuotePage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase } = await requireRole([
    "member",
  ]);

  const { data: fees } = await supabase
    .from("annual_fees")
    .select("id, title, amount, due_date, status, notes")
    .eq("member_id", profile.id)
    .order("due_date", { ascending: true });

  return (
    <DashboardShell
      title="Quote"
      subtitle={unit ? `Quote · ${unit.name}` : "Le mie quote"}
      activeRole={activeRole}
      roles={roles}
    >
      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        {(fees ?? []).length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            Nessuna quota registrata.
          </li>
        ) : (
          (fees ?? []).map((f) => (
            <li key={f.id} className="px-4 py-4">
              <p className="font-semibold">{f.title}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {formatEuro(Number(f.amount))}
                {f.due_date ? ` · scad. ${formatDate(f.due_date)}` : ""} ·{" "}
                {feeStatusLabel[f.status as FeeStatus]}
              </p>
              {f.notes ? (
                <p className="mt-1 text-sm text-[var(--muted)]">{f.notes}</p>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </DashboardShell>
  );
}
