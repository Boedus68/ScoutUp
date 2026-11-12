"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { staffUnitId } from "@/lib/staff-unit";

export async function createMaterialAction(formData: FormData) {
  const { profile, supabase } = await requireRole(["leader"]);
  if (!staffUnitId(profile)) throw new Error("Capo senza unità.");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const file_url = String(formData.get("file_url") ?? "").trim();

  if (!title || !file_url) throw new Error("Titolo e URL obbligatori.");

  const { error } = await supabase.from("materials").insert({
    unit_id: staffUnitId(profile),
    title,
    description: description || null,
    file_url,
    created_by: profile.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/staff/materiali");
}

export async function deleteMaterialAction(formData: FormData) {
  const { profile, supabase } = await requireRole(["leader"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID mancante.");

  const { error } = await supabase
    .from("materials")
    .delete()
    .eq("id", id)
    .eq("unit_id", staffUnitId(profile) ?? "");
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/staff/materiali");
}
