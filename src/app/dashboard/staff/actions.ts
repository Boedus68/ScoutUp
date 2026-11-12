"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import type { AttendanceStatus, EventType, PaymentStatus } from "@/lib/types";
import { staffUnitId } from "@/lib/staff-unit";

const eventTypes: EventType[] = [
  "meeting",
  "overnight",
  "camp",
  "route",
  "council",
  "formation",
];

export async function createEventAction(formData: FormData) {
  const { profile, supabase } = await requireRole(["leader"]);

  if (!staffUnitId(profile)) {
    throw new Error("Il profilo capo non ha un'unità assegnata.");
  }

  const title = String(formData.get("title") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "").trim();
  const endsAtRaw = String(formData.get("ends_at") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const eventTypeRaw = String(formData.get("event_type") ?? "meeting") as EventType;
  const feeRaw = String(formData.get("fee_amount") ?? "").trim();
  const equipmentList = String(formData.get("equipment_list") ?? "").trim();

  if (!title || !startsAt) {
    throw new Error("Titolo e data di inizio sono obbligatori.");
  }

  const event_type = eventTypes.includes(eventTypeRaw) ? eventTypeRaw : "meeting";
  const fee_amount = feeRaw === "" ? null : Number(feeRaw);
  if (fee_amount != null && Number.isNaN(fee_amount)) {
    throw new Error("Quota non valida.");
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      unit_id: staffUnitId(profile),
      title,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAtRaw ? new Date(endsAtRaw).toISOString() : null,
      location: location || null,
      description: description || null,
      event_type,
      fee_amount,
      equipment_list: equipmentList || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/staff/calendario");
  redirect(`/dashboard/staff/events/${data.id}/presenze`);
}

export async function saveAttendancesAction(eventId: string, formData: FormData) {
  const { profile, supabase } = await requireRole(["leader"]);

  const memberIds = formData.getAll("member_id").map(String);
  const rows = memberIds.map((memberId) => {
    const status = String(
      formData.get(`status_${memberId}`) ?? "absent",
    ) as AttendanceStatus;
    const payment_status = String(
      formData.get(`payment_${memberId}`) ?? "unpaid",
    ) as PaymentStatus;
    const notes = String(formData.get(`notes_${memberId}`) ?? "").trim();
    return {
      event_id: eventId,
      member_id: memberId,
      status,
      payment_status,
      notes: notes || null,
      updated_by: profile.id,
    };
  });

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("attendances").upsert(rows, {
    onConflict: "event_id,member_id",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/staff/events/${eventId}/presenze`);
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/staff/calendario");
  revalidatePath("/dashboard/parent");
  revalidatePath("/dashboard/member");
}
