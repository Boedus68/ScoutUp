"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { AnnouncementAudience } from "@/lib/types";
import { staffUnitId } from "@/lib/staff-unit";

export async function createAnnouncementAction(formData: FormData) {
  const { profile, supabase } = await requireRole(["leader"]);
  if (!staffUnitId(profile)) throw new Error("Capo senza unità.");

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audience = String(formData.get("audience") ?? "unit") as AnnouncementAudience;
  const subgroupRaw = String(formData.get("subgroup_id") ?? "").trim();

  if (!title || !body) throw new Error("Titolo e testo obbligatori.");
  if (!["unit", "subgroup", "parents"].includes(audience)) {
    throw new Error("Destinatari non validi.");
  }

  const subgroup_id =
    audience === "subgroup" ? subgroupRaw || null : null;
  if (audience === "subgroup" && !subgroup_id) {
    throw new Error("Seleziona un sottogruppo.");
  }

  const { error } = await supabase.from("announcements").insert({
    unit_id: staffUnitId(profile),
    subgroup_id,
    audience,
    title,
    body,
    created_by: profile.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/staff/bacheca");
  revalidatePath("/dashboard/parent/bacheca");
  revalidatePath("/dashboard/member/bacheca");
}

export async function deleteAnnouncementAction(formData: FormData) {
  const { profile, supabase } = await requireRole(["leader"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID mancante.");

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id)
    .eq("unit_id", staffUnitId(profile) ?? "");
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/staff/bacheca");
  revalidatePath("/dashboard/parent/bacheca");
  revalidatePath("/dashboard/member/bacheca");
}
