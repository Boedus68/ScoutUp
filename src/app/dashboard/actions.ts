"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dashboardPathForRole, requireUser } from "@/lib/auth";
import type { AppRole } from "@/lib/types";

function revalidateStaffTrees() {
  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/staff", "layout");
  revalidatePath("/dashboard/parent", "layout");
  revalidatePath("/dashboard/member", "layout");
}

export async function setActiveRoleAction(formData: FormData) {
  const role = String(formData.get("role") ?? "") as AppRole;
  if (!["leader", "member", "parent"].includes(role)) {
    throw new Error("Ruolo non valido.");
  }

  const { user, supabase } = await requireUser();

  const { data: membership } = await supabase
    .from("role_memberships")
    .select("role")
    .eq("user_id", user!.id)
    .eq("role", role)
    .maybeSingle();

  if (!membership) {
    throw new Error("Non hai questo ruolo.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ active_role: role })
    .eq("id", user!.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateStaffTrees();
  redirect(dashboardPathForRole(role));
}

/** Aggiorna active_role e restituisce il path dashboard (per switcher client). */
export async function switchActiveRoleAction(formData: FormData): Promise<string> {
  const role = String(formData.get("role") ?? "") as AppRole;
  if (!["leader", "member", "parent"].includes(role)) {
    throw new Error("Ruolo non valido.");
  }

  const { user, supabase } = await requireUser();

  const { data: membership } = await supabase
    .from("role_memberships")
    .select("role")
    .eq("user_id", user!.id)
    .eq("role", role)
    .maybeSingle();

  if (!membership) {
    throw new Error("Non hai questo ruolo.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ active_role: role })
    .eq("id", user!.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateStaffTrees();
  return dashboardPathForRole(role);
}

/** Passa tra unità di servizio e Comunità Capi (Co.Ca.) del gruppo. */
export async function switchActiveUnitAction(
  formData: FormData,
): Promise<string> {
  const unitId = String(formData.get("unit_id") ?? "").trim();
  if (!unitId) {
    throw new Error("Unità non valida.");
  }

  const { user, profile, serviceUnit, availableUnits, supabase } =
    await requireUser();

  const { data: membership } = await supabase
    .from("role_memberships")
    .select("role")
    .eq("user_id", user!.id)
    .eq("role", "leader")
    .maybeSingle();

  if (!membership && profile?.role !== "leader") {
    throw new Error("Solo i capi possono cambiare unità.");
  }

  const allowed = availableUnits.some((u) => u.id === unitId);
  if (!allowed) {
    const { data: target } = await supabase
      .from("units")
      .select("id, branch, group_id")
      .eq("id", unitId)
      .maybeSingle();

    const ok =
      target &&
      (target.id === profile?.unit_id ||
        (target.branch === "COCA" &&
          serviceUnit?.group_id != null &&
          target.group_id === serviceUnit.group_id));

    if (!ok) {
      throw new Error("Non puoi accedere a questa unità.");
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ active_unit_id: unitId })
    .eq("id", user!.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateStaffTrees();
  return "/dashboard/staff";
}
