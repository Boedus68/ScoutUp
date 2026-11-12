import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import {
  feeStatusLabel,
  formatDate,
  formatEuro,
} from "@/lib/labels";
import type { FeeStatus } from "@/lib/types";

export default async function ParentQuotePage() {
  await connection();
  const { profile, roles, activeRole, supabase } = await requireRole([
    "parent",
  ]);

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
      : { data: [] as { id: string; full_name: string; totem: string | null }[] };

  const { data: fees } =
    childIds.length > 0
      ? await supabase
          .from("annual_fees")
          .select("id, member_id, title, amount, due_date, status")
          .in("member_id", childIds)
          .order("due_date", { ascending: true })
      : {
          data: [] as {
            id: string;
            member_id: string;
            title: string;
            amount: number;
            due_date: string | null;
            status: string;
          }[],
        };

  const childName = new Map(
    (children ?? []).map(
      (c) =>
        [c.id, c.totem ? `${c.full_name} (${c.totem})` : c.full_name] as const,
    ),
  );

  return (
    <DashboardShell
      title="Quote"
      subtitle="Quote annuali dei figli"
      activeRole={activeRole}
      roles={roles}
    >
      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        {(fees ?? []).length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            Nessuna quota registrata per i tuoi figli.
          </li>
        ) : (
          (fees ?? []).map((f) => (
            <li key={f.id} className="px-4 py-4">
              <p className="font-semibold">
                {f.title} · {childName.get(f.member_id) ?? "—"}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {formatEuro(Number(f.amount))}
                {f.due_date ? ` · scad. ${formatDate(f.due_date)}` : ""} ·{" "}
                {feeStatusLabel[f.status as FeeStatus]}
              </p>
            </li>
          ))
        )}
      </ul>
    </DashboardShell>
  );
}
