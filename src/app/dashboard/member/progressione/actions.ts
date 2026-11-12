"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { ProgressionKind, ScoutBranch } from "@/lib/types";

export async function requestProgressionAction(formData: FormData) {
  const { profile, unit, supabase } = await requireRole(["member"]);
  if (!unit) throw new Error("Unità non assegnata.");

  const catalogId = String(formData.get("catalog_id") ?? "").trim();
  const itemId = String(formData.get("item_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "") as ProgressionKind;
  const branch = unit.branch as ScoutBranch;

  if (itemId) {
    const { error } = await supabase
      .from("progression_items")
      .update({
        status: "requested",
        requested_at: new Date().toISOString(),
        staff_comment: null,
      })
      .eq("id", itemId)
      .eq("member_id", profile.id)
      .in("status", ["in_progress", "rejected"]);
    if (error) throw new Error(error.message);
  } else {
    if (!title || !kind) throw new Error("Dati richiesta incompleti.");
    const { error } = await supabase.from("progression_items").insert({
      member_id: profile.id,
      catalog_id: catalogId || null,
      branch,
      kind,
      title,
      status: "requested",
      requested_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard/member/progressione");
  revalidatePath("/dashboard/staff/progressione");
}
