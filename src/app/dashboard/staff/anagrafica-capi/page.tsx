import { connection } from "next/server";
import { redirect } from "next/navigation";
import { StaffShell } from "@/components/staff-shell";
import { requireRole } from "@/lib/auth";
import { branchShortLabel, groupRoleLabel } from "@/lib/labels";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { isCocaUnit } from "@/lib/staff-unit";
import type { CocaGroupRole, Unit } from "@/lib/types";
import { InviteLeaderForm } from "./invite-form";
import { GroupRoleSelect } from "./group-role-select";

export default async function AnagraficaCapiPage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase, availableUnits } =
    await requireRole(["leader"]);

  if (!isCocaUnit(unit)) {
    redirect("/dashboard/staff");
  }

  const groupId = unit?.group_id;
  type LeaderRow = {
    id: string;
    full_name: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    group_role: CocaGroupRole | null;
    unit_id: string | null;
  };

  let leaders: LeaderRow[] = [];
  let unitById = new Map<string, Unit>();

  if (groupId) {
    const { data: groupUnits } = await supabase
      .from("units")
      .select("*")
      .eq("group_id", groupId);
    const units = (groupUnits ?? []) as Unit[];
    unitById = new Map(units.map((u) => [u.id, u]));
    const unitIds = units.map((u) => u.id);

    const { data } =
      unitIds.length > 0
        ? await supabase
            .from("profiles")
            .select(
              "id, full_name, first_name, last_name, phone, group_role, unit_id",
            )
            .eq("role", "leader")
            .in("unit_id", unitIds)
            .order("full_name")
        : { data: [] as LeaderRow[] };
    leaders = (data ?? []) as LeaderRow[];
  }

  const serviceUnits = availableUnits.filter(
    (u) => u.group_id === groupId,
  );
  const canInvite = hasServiceRoleKey();

  return (
    <StaffShell
      title="Anagrafica Capi"
      subtitle="Comunità Capi · solo leader"
      activeRole={activeRole}
      roles={roles}
      unit={unit}
      availableUnits={availableUnits}
    >
      <div className="space-y-8">
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="font-semibold">Capi del gruppo</h2>
            <p className="text-xs text-[var(--muted)]">
              Leader con unità di servizio nello stesso group_id. Incarico
              Co.Ca. modificabile.
            </p>
          </div>
          {leaders.length === 0 ? (
            <p className="px-4 py-8 text-sm text-[var(--muted)]">
              Nessun capo trovato nel gruppo.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)] text-sm">
              {leaders.map((l) => {
                const svc = l.unit_id ? unitById.get(l.unit_id) : null;
                const isSelf = l.id === profile.id;
                return (
                  <li
                    key={l.id}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {l.full_name}
                        {isSelf ? (
                          <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                            (tu)
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {svc
                          ? `${branchShortLabel[svc.branch]} · ${svc.name}`
                          : "Unità —"}
                        {l.phone ? ` · ${l.phone}` : ""}
                        {l.group_role
                          ? ` · ${groupRoleLabel[l.group_role]}`
                          : ""}
                      </p>
                    </div>
                    <GroupRoleSelect
                      leaderId={l.id}
                      value={l.group_role}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-white p-5">
          <h2 className="font-semibold">
            {canInvite ? "Invita nuovo capo" : "Collega / invita capo"}
          </h2>
          <div className="mt-4">
            <InviteLeaderForm
              serviceUnits={serviceUnits}
              canInviteViaAuth={canInvite}
            />
          </div>
        </section>
      </div>
    </StaffShell>
  );
}
