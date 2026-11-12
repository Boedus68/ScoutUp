"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { ConfirmationStatus } from "@/lib/types";

export async function confirmEventAction(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const status = String(formData.get("status") ?? "") as ConfirmationStatus;
  const actor = String(formData.get("actor") ?? "parent") as "parent" | "member";

  if (!eventId || !memberId || !["attending", "not_attending"].includes(status)) {
    throw new Error("Dati conferma non validi.");
  }

  if (actor === "member") {
    const { profile, supabase } = await requireRole(["member"]);
    if (profile.id !== memberId) {
      throw new Error("Puoi confermare solo la tua partecipazione.");
    }

    const { error } = await supabase.from("event_confirmations").upsert(
      {
        event_id: eventId,
        member_id: memberId,
        status,
        confirmed_by: profile.id,
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: "event_id,member_id" },
    );
    if (error) throw new Error(error.message);
  } else {
    const { profile, supabase } = await requireRole(["parent"]);
    const { data: link } = await supabase
      .from("parent_child")
      .select("child_id")
      .eq("parent_id", profile.id)
      .eq("child_id", memberId)
      .maybeSingle();
    if (!link) throw new Error("Figlio non collegato.");

    const { error } = await supabase.from("event_confirmations").upsert(
      {
        event_id: eventId,
        member_id: memberId,
        status,
        confirmed_by: profile.id,
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: "event_id,member_id" },
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard/parent");
  revalidatePath("/dashboard/member");
  revalidatePath("/dashboard/staff");
}

export async function authorizeEventAction(formData: FormData) {
  const { profile, supabase } = await requireRole(["parent"]);
  const eventId = String(formData.get("event_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const nextStatus = String(formData.get("status") ?? "authorized");

  if (!eventId || !memberId) {
    throw new Error("Dati autorizzazione non validi.");
  }

  const { data: link } = await supabase
    .from("parent_child")
    .select("child_id")
    .eq("parent_id", profile.id)
    .eq("child_id", memberId)
    .maybeSingle();
  if (!link) throw new Error("Figlio non collegato.");

  const status = nextStatus === "revoked" ? "revoked" : "authorized";

  const { error } = await supabase.from("event_authorizations").upsert(
    {
      event_id: eventId,
      member_id: memberId,
      parent_id: profile.id,
      status,
      authorized_at: new Date().toISOString(),
    },
    { onConflict: "event_id,member_id" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/parent");
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/member");
}
