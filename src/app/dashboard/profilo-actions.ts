"use server";

import { revalidatePath } from "next/cache";
import { requireUser, effectiveRole } from "@/lib/auth";
import { joinFullName } from "@/lib/profile-name";
import { groupRoleOptions } from "@/lib/labels";
import type {
  BranchOfficeKind,
  CocaGroupRole,
  ProfileGender,
  YouthBranch,
} from "@/lib/types";

const groupRoles = new Set<CocaGroupRole>(groupRoleOptions);
const branchOffices = new Set<BranchOfficeKind>([
  "capo_branca",
  "aiuto_capo_branca",
]);
const youthBranches = new Set<YouthBranch>(["LC", "EG", "RS"]);

export type UpdateProfileResult = {
  ok: boolean;
  message: string;
  emailNotice?: string;
};

export async function updateOwnProfileAction(
  formData: FormData,
): Promise<UpdateProfileResult> {
  const { user, profile, supabase } = await requireUser();
  if (!profile || !user) {
    return { ok: false, message: "Sessione non valida." };
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const genderRaw = String(formData.get("gender") ?? "").trim();
  const gender: ProfileGender | null =
    genderRaw === "M" || genderRaw === "F" ? genderRaw : null;
  const groupRoleRaw = String(formData.get("group_role") ?? "").trim();
  const groupRole: CocaGroupRole | null =
    groupRoleRaw && groupRoles.has(groupRoleRaw as CocaGroupRole)
      ? (groupRoleRaw as CocaGroupRole)
      : null;
  const branchOfficeRaw = String(formData.get("branch_office") ?? "").trim();
  const assignedBranchRaw = String(formData.get("assigned_branch") ?? "").trim();
  const assignedBranch: YouthBranch | null =
    assignedBranchRaw && youthBranches.has(assignedBranchRaw as YouthBranch)
      ? (assignedBranchRaw as YouthBranch)
      : null;
  const branchOffice: BranchOfficeKind | null = assignedBranch
    ? branchOffices.has(branchOfficeRaw as BranchOfficeKind)
      ? (branchOfficeRaw as BranchOfficeKind)
      : "capo_branca"
    : null;

  if (!firstName && !lastName) {
    return { ok: false, message: "Inserisci almeno nome o cognome." };
  }

  const fullName = joinFullName(firstName, lastName);
  if (!fullName) {
    return { ok: false, message: "Nome non valido." };
  }

  const patch: {
    first_name: string | null;
    last_name: string | null;
    full_name: string;
    phone: string | null;
    address: string | null;
    gender: ProfileGender | null;
    group_role?: CocaGroupRole | null;
    branch_office?: BranchOfficeKind | null;
    assigned_branch?: YouthBranch | null;
  } = {
    first_name: firstName || null,
    last_name: lastName || null,
    full_name: fullName,
    phone,
    address,
    gender,
  };

  if (profile.role === "leader" || profile.active_role === "leader") {
    patch.group_role = groupRole;
    patch.branch_office = branchOffice;
    patch.assigned_branch = assignedBranch;
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", profile.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  let emailNotice: string | undefined;
  const currentEmail = (user.email ?? "").toLowerCase();
  if (email && email !== currentEmail) {
    const { error: authErr } = await supabase.auth.updateUser({ email });
    if (authErr) {
      emailNotice = `Profilo salvato, ma email Auth non aggiornata: ${authErr.message}`;
    } else {
      emailNotice =
        "Profilo salvato. Controlla la casella per confermare la nuova email (Auth).";
    }
  }

  const role = effectiveRole(profile);
  revalidatePath("/dashboard/staff/profilo");
  revalidatePath("/dashboard/parent/profilo");
  revalidatePath("/dashboard/member/profilo");
  revalidatePath(role === "leader" ? "/dashboard/staff" : `/dashboard/${role}`);

  return {
    ok: true,
    message: "Profilo aggiornato.",
    emailNotice,
  };
}
