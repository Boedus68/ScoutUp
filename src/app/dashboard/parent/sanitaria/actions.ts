"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";

export async function saveMedicalRecordAction(formData: FormData) {
  const { profile, supabase } = await requireRole(["parent"]);
  const memberId = String(formData.get("member_id") ?? "");
  if (!memberId) throw new Error("Figlio non specificato.");

  const { data: link } = await supabase
    .from("parent_child")
    .select("child_id")
    .eq("parent_id", profile.id)
    .eq("child_id", memberId)
    .maybeSingle();
  if (!link) throw new Error("Figlio non collegato.");

  const criticality_flag = formData.get("criticality_flag") === "on";

  const row = {
    member_id: memberId,
    food_allergies: String(formData.get("food_allergies") ?? "").trim() || null,
    drug_allergies: String(formData.get("drug_allergies") ?? "").trim() || null,
    intolerances: String(formData.get("intolerances") ?? "").trim() || null,
    ongoing_therapy: String(formData.get("ongoing_therapy") ?? "").trim() || null,
    health_card_number:
      String(formData.get("health_card_number") ?? "").trim() || null,
    blood_type: String(formData.get("blood_type") ?? "").trim() || null,
    emergency_contact_name:
      String(formData.get("emergency_contact_name") ?? "").trim() || null,
    emergency_contact_phone:
      String(formData.get("emergency_contact_phone") ?? "").trim() || null,
    criticality_flag,
    criticality_notes:
      String(formData.get("criticality_notes") ?? "").trim() || null,
    updated_by: profile.id,
  };

  const { error } = await supabase.from("medical_records").upsert(row, {
    onConflict: "member_id",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/parent/sanitaria");
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/staff/fascicolo-sicurezza");
}
