import { connection } from "next/server";
import { StaffShell } from "@/components/staff-shell";
import { ProfileEditForm } from "@/components/profile-edit-form";
import { requireRole } from "@/lib/auth";
import { displayNameParts } from "@/lib/profile-name";

export default async function StaffProfiloPage() {
  await connection();
  const { user, profile, unit, roles, activeRole, availableUnits } =
    await requireRole(["leader"]);

  const { firstName, lastName } = displayNameParts(profile);

  return (
    <StaffShell
      title="Il mio profilo"
      subtitle="Anagrafica personale"
      activeRole={activeRole}
      roles={roles}
      unit={unit}
      availableUnits={availableUnits}
    >
      <ProfileEditForm
        firstName={firstName}
        lastName={lastName}
        phone={profile.phone ?? ""}
        address={profile.address ?? ""}
        email={user?.email ?? ""}
        gender={profile.gender ?? null}
        showGroupRole
        groupRole={profile.group_role}
      />
    </StaffShell>
  );
}
