import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileEditForm } from "@/components/profile-edit-form";
import { requireRole } from "@/lib/auth";
import { branchLabel, formatDate } from "@/lib/labels";
import { displayNameParts } from "@/lib/profile-name";

export default async function MemberProfiloPage() {
  await connection();
  const { user, profile, unit, roles, activeRole, supabase } = await requireRole(
    ["member"],
  );

  const { firstName, lastName } = displayNameParts(profile);

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
      subtitle="Anagrafica personale"
      activeRole={activeRole}
      roles={roles}
    >
      <div className="space-y-6">
        <dl className="grid max-w-lg gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-5 text-sm sm:grid-cols-2">
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
            <dt className="text-[var(--muted)]">Totem</dt>
            <dd className="font-medium">{profile.totem ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Nascita</dt>
            <dd className="font-medium">
              {profile.birth_date ? formatDate(profile.birth_date) : "—"}
            </dd>
          </div>
        </dl>

        <ProfileEditForm
          firstName={firstName}
          lastName={lastName}
          phone={profile.phone ?? ""}
          address={profile.address ?? ""}
          email={user?.email ?? ""}
          gender={profile.gender ?? null}
        />
      </div>
    </DashboardShell>
  );
}
