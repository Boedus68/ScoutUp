"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { AppRole } from "@/lib/types";

export async function acknowledgeAnnouncementAction(formData: FormData) {
  const roles: AppRole[] = ["leader", "member", "parent"];
  const { profile, supabase, activeRole } = await requireRole(roles);
  const announcement_id = String(formData.get("announcement_id") ?? "");
  if (!announcement_id) throw new Error("Circolare mancante.");

  const { error } = await supabase.from("announcement_acks").upsert(
    {
      announcement_id,
      user_id: profile.id,
      acknowledged_at: new Date().toISOString(),
    },
    { onConflict: "announcement_id,user_id" },
  );
  if (error) throw new Error(error.message);

  const base =
    activeRole === "leader"
      ? "/dashboard/staff/bacheca"
      : activeRole === "parent"
        ? "/dashboard/parent/bacheca"
        : "/dashboard/member/bacheca";
  revalidatePath(base);
  revalidatePath("/dashboard/staff/bacheca");
}
