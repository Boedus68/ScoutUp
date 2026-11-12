"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { CashEntryKind, FeeStatus } from "@/lib/types";
import { staffUnitId } from "@/lib/staff-unit";

export async function createAnnualFeeAction(formData: FormData) {
  const { profile, supabase } = await requireRole(["leader"]);
  if (!staffUnitId(profile)) throw new Error("Capo senza unità.");

  const member_id = String(formData.get("member_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const due_date = String(formData.get("due_date") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!member_id || !title || Number.isNaN(amount) || amount < 0) {
    throw new Error("Dati quota non validi.");
  }

  const { error } = await supabase.from("annual_fees").insert({
    unit_id: staffUnitId(profile),
    member_id,
    title,
    amount,
    due_date,
    notes,
    status: "unpaid" as FeeStatus,
    created_by: profile.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/staff/cassa");
  revalidatePath("/dashboard/parent/quote");
  revalidatePath("/dashboard/member/quote");
}

export async function updateFeeStatusAction(formData: FormData) {
  const { profile, supabase } = await requireRole(["leader"]);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as FeeStatus;
  if (!id || !["unpaid", "paid", "waived"].includes(status)) {
    throw new Error("Stato non valido.");
  }

  const { error } = await supabase
    .from("annual_fees")
    .update({ status })
    .eq("id", id)
    .eq("unit_id", staffUnitId(profile) ?? "");
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/staff/cassa");
  revalidatePath("/dashboard/parent/quote");
  revalidatePath("/dashboard/member/quote");
}

export async function createCashEntryAction(formData: FormData) {
  const { profile, supabase } = await requireRole(["leader"]);
  if (!staffUnitId(profile)) throw new Error("Capo senza unità.");

  const kind = String(formData.get("kind") ?? "") as CashEntryKind;
  const title = String(formData.get("title") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const receipt_url = String(formData.get("receipt_url") ?? "").trim() || null;
  const member_id = String(formData.get("member_id") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!["expense", "reimbursement", "income"].includes(kind)) {
    throw new Error("Tipo movimento non valido.");
  }
  if (!title || Number.isNaN(amount) || amount < 0) {
    throw new Error("Dati movimento non validi.");
  }

  const { error } = await supabase.from("cash_entries").insert({
    unit_id: staffUnitId(profile),
    kind,
    title,
    amount,
    receipt_url,
    member_id,
    notes,
    created_by: profile.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/staff/cassa");
}

export async function deleteCashEntryAction(formData: FormData) {
  const { profile, supabase } = await requireRole(["leader"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID mancante.");

  const { error } = await supabase
    .from("cash_entries")
    .delete()
    .eq("id", id)
    .eq("unit_id", staffUnitId(profile) ?? "");
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/staff/cassa");
}
