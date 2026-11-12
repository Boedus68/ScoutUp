"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dashboardPathForRole, requireUser } from "@/lib/auth";
import type { AppRole } from "@/lib/types";

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

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/parent");
  revalidatePath("/dashboard/member");
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

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/staff", "layout");
  revalidatePath("/dashboard/parent", "layout");
  revalidatePath("/dashboard/member", "layout");
  return dashboardPathForRole(role);
}
