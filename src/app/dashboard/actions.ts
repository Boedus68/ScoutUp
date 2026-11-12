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

  revalidatePath("/dashboard", "layout");
  redirect(dashboardPathForRole(role));
}
