import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProgressionPath } from "@/components/progression-path";
import { requireRole } from "@/lib/auth";
import {
  branchLabel,
  progressionKindLabel,
  progressionPathTitle,
  progressionStatusLabel,
  progressionKindsForBranch,
} from "@/lib/labels";
import type {
  ProgressionCatalogItem,
  ProgressionItem,
  ProgressionKind,
  StaffNote,
} from "@/lib/types";
import {
  AssignControls,
  DecideControls,
  NoteForm,
} from "./controls";

type PageProps = {
  params: Promise<{ memberId: string }>;
};

export default async function StaffMemberProgressionePage({ params }: PageProps) {
  await connection();
  const { memberId } = await params;
  const { profile, unit, roles, activeRole, supabase } = await requireRole([
    "leader",
  ]);

  const { data: member } = await supabase
    .from("profiles")
    .select("id, full_name, totem, unit_id, role")
    .eq("id", memberId)
    .maybeSingle();

  if (
    !member ||
    member.role !== "member" ||
    member.unit_id !== profile.unit_id ||
    !unit
  ) {
    notFound();
  }

  const { data: catalog } = await supabase
    .from("progression_catalog")
    .select("*")
    .eq("branch", unit.branch)
    .order("sort_order");

  const { data: items } = await supabase
    .from("progression_items")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at");

  const { data: notes } = await supabase
    .from("staff_notes")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  const requested = ((items ?? []) as ProgressionItem[]).filter(
    (i) => i.status === "requested",
  );

  const kinds = progressionKindsForBranch(unit.branch);

  return (
    <DashboardShell
      title={member.full_name}
      subtitle={`${progressionPathTitle(unit.branch)} · ${branchLabel[unit.branch]}${
        member.totem ? ` · ${member.totem}` : ""
      }`}
      activeRole={activeRole}
      roles={roles}
      headerActions={
        <Link
          href="/dashboard/staff/progressione"
          className="text-sm font-medium text-[var(--forest)]"
        >
          ← Elenco
        </Link>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          {requested.length > 0 ? (
            <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <h2 className="font-semibold">Richieste da verificare</h2>
              <ul className="mt-3 space-y-3">
                {requested.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-md border border-amber-200 bg-white p-3 text-sm"
                  >
                    <p className="font-medium">
                      {progressionKindLabel[item.kind]} — {item.title}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {progressionStatusLabel[item.status]}
                    </p>
                    <DecideControls itemId={item.id} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 text-lg font-semibold">Percorso</h2>
            <ProgressionPath
              branch={unit.branch}
              catalog={(catalog ?? []) as ProgressionCatalogItem[]}
              items={(items ?? []) as ProgressionItem[]}
              mode="readonly"
            />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-[var(--border)] bg-white p-4">
            <h2 className="font-semibold">Assegna item</h2>
            <AssignControls
              memberId={member.id}
              kinds={kinds}
              catalog={(catalog ?? []) as ProgressionCatalogItem[]}
            />
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-white p-4">
            <h2 className="font-semibold">Note educative (riservate)</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Visibili solo ai capi della stessa unità.
            </p>
            <NoteForm memberId={member.id} />
            <ul className="mt-4 space-y-3">
              {((notes ?? []) as StaffNote[]).length === 0 ? (
                <li className="text-sm text-[var(--muted)]">Nessuna nota.</li>
              ) : (
                ((notes ?? []) as StaffNote[]).map((n) => (
                  <li
                    key={n.id}
                    className="rounded-md bg-[var(--surface-muted)] px-3 py-2 text-sm whitespace-pre-wrap"
                  >
                    {n.body}
                  </li>
                ))
              )}
            </ul>
          </section>
        </aside>
      </div>
    </DashboardShell>
  );
}
