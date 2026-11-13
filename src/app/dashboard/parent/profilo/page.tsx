import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileEditForm } from "@/components/profile-edit-form";
import { requireRole } from "@/lib/auth";
import { displayNameParts } from "@/lib/profile-name";

export default async function ParentProfiloPage() {
  await connection();
  const { user, profile, roles, activeRole } = await requireRole(["parent"]);
  const { firstName, lastName } = displayNameParts(profile);

  return (
    <DashboardShell
      title="Il mio profilo"
      subtitle="Anagrafica personale"
      activeRole={activeRole}
      roles={roles}
    >
      <ProfileEditForm
        firstName={firstName}
        lastName={lastName}
        phone={profile.phone ?? ""}
        address={profile.address ?? ""}
        email={user?.email ?? ""}
        gender={profile.gender ?? null}
      />
    </DashboardShell>
  );
}
