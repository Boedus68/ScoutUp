import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { StaffShell } from "@/components/staff-shell";
import { requireRole } from "@/lib/auth";
import {
  formatDate,
  groupRoleLabel,
  progressionPathTitle,
  progressionStatusLabel,
} from "@/lib/labels";
import { isCocaUnit } from "@/lib/staff-unit";
import type { CocaGroupRole, ProgressionStatus } from "@/lib/types";
import {
  ensureOwnFormativePathAction,
  upsertFormativeStepAction,
} from "./actions";

export default async function PercorsoFormativoPage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase, availableUnits } =
    await requireRole(["leader"]);

  if (!isCocaUnit(unit)) {
    redirect("/dashboard/staff/progressione");
  }

  const { data: catalog } = await supabase
    .from("progression_catalog")
    .select("id, code, title, description, sort_order")
    .eq("branch", "COCA")
    .order("sort_order");

  const { data: ownItems } = await supabase
    .from("progression_items")
    .select(
      "id, catalog_id, title, status, held_at, location, staff_comment, decided_at",
    )
    .eq("member_id", profile.id)
    .eq("branch", "COCA");

  const ownByCatalog = new Map(
    (ownItems ?? []).map((row) => [row.catalog_id, row] as const),
  );

  const isCapoGruppo = profile.group_role === "capo_gruppo";
  let peerLeaders: {
    id: string;
    full_name: string;
    group_role: CocaGroupRole | null;
  }[] = [];

  if (isCapoGruppo && unit?.group_id) {
    const { data: groupUnits } = await supabase
      .from("units")
      .select("id")
      .eq("group_id", unit.group_id);
    const unitIds = (groupUnits ?? []).map((u) => u.id);
    const { data } =
      unitIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, full_name, group_role")
            .eq("role", "leader")
            .in("unit_id", unitIds)
            .order("full_name")
        : { data: [] as typeof peerLeaders };
    peerLeaders = (data ?? []) as typeof peerLeaders;
  }

  const peerIds = peerLeaders.map((p) => p.id);
  const { data: peerItems } =
    peerIds.length > 0
      ? await supabase
          .from("progression_items")
          .select("member_id, catalog_id, status, held_at, location, title")
          .eq("branch", "COCA")
          .in("member_id", peerIds)
      : { data: [] as { member_id: string; catalog_id: string | null; status: string; held_at: string | null; location: string | null; title: string }[] };

  return (
    <StaffShell
      title="Il Mio Percorso Formativo"
      subtitle={progressionPathTitle("COCA")}
      activeRole={activeRole}
      roles={roles}
      unit={unit}
      availableUnits={availableUnits}
    >
      <div className="space-y-8">
        <section className="rounded-xl border border-[var(--border)] bg-white p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Le tue tappe</h2>
              <p className="text-sm text-[var(--muted)]">
                Stato, date e luoghi di CFT, CFM, CFA e Nomina.
                {profile.group_role
                  ? ` · ${groupRoleLabel[profile.group_role]}`
                  : ""}
              </p>
            </div>
            <form action={ensureOwnFormativePathAction}>
              <button
                type="submit"
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface-muted)]"
              >
                Inizializza percorso
              </button>
            </form>
          </div>

          <ul className="divide-y divide-[var(--border)]">
            {(catalog ?? []).map((step) => {
              const item = ownByCatalog.get(step.id);
              const status = (item?.status ?? "in_progress") as ProgressionStatus;
              return (
                <li key={step.id} className="py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-semibold">{step.title}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {step.description}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {progressionStatusLabel[status]}
                        {item?.held_at ? ` · ${formatDate(item.held_at)}` : ""}
                        {item?.location ? ` · ${item.location}` : ""}
                      </p>
                    </div>
                    <form
                      action={upsertFormativeStepAction}
                      className="grid w-full max-w-md gap-2 sm:grid-cols-2"
                    >
                      <input type="hidden" name="catalog_id" value={step.id} />
                      <input type="hidden" name="member_id" value={profile.id} />
                      <label className="text-xs">
                        Stato
                        <select
                          name="status"
                          defaultValue={status}
                          className="mt-1 w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
                        >
                          <option value="in_progress">In corso</option>
                          <option value="conquered">Conquistata</option>
                          <option value="requested">Richiesta</option>
                        </select>
                      </label>
                      <label className="text-xs">
                        Data
                        <input
                          type="date"
                          name="held_at"
                          defaultValue={item?.held_at ?? ""}
                          className="mt-1 w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="text-xs sm:col-span-2">
                        Luogo
                        <input
                          name="location"
                          defaultValue={item?.location ?? ""}
                          placeholder="Es. Campo zona / sede"
                          className="mt-1 w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
                        />
                      </label>
                      <button
                        type="submit"
                        className="rounded-md bg-[var(--forest)] px-3 py-1.5 text-sm font-semibold text-white sm:col-span-2"
                      >
                        Salva tappa
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {isCapoGruppo ? (
          <section className="rounded-xl border border-[var(--border)] bg-white p-5">
            <h2 className="text-lg font-semibold">Quadro formativo Co.Ca.</h2>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Panoramica delle tappe dei capi del Gruppo (solo Capo Gruppo).
            </p>
            <ul className="divide-y divide-[var(--border)]">
              {peerLeaders.map((leader) => {
                const steps = (peerItems ?? []).filter(
                  (i) => i.member_id === leader.id,
                );
                const done = steps.filter((s) => s.status === "conquered").length;
                return (
                  <li key={leader.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{leader.full_name}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {leader.group_role
                            ? groupRoleLabel[leader.group_role]
                            : "Capo"}
                          {" · "}
                          {done}/{catalog?.length ?? 0} tappe conquistate
                        </p>
                      </div>
                      <Link
                        href={`/dashboard/staff/percorso-formativo?focus=${leader.id}`}
                        className="text-sm font-medium text-[var(--forest)]"
                      >
                        Dettaglio sotto ↓
                      </Link>
                    </div>
                    <ul className="mt-2 grid gap-1 text-xs text-[var(--muted)] sm:grid-cols-2">
                      {steps.map((s) => (
                        <li key={`${leader.id}-${s.catalog_id}`}>
                          {s.title}: {progressionStatusLabel[s.status as ProgressionStatus]}
                          {s.held_at ? ` (${formatDate(s.held_at)})` : ""}
                          {s.location ? ` · ${s.location}` : ""}
                        </li>
                      ))}
                      {steps.length === 0 ? (
                        <li>Nessuna tappa registrata.</li>
                      ) : null}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </StaffShell>
  );
}
