"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import type { AttendanceStatus } from "@/lib/types";

export async function createEventAction(formData: FormData) {
  const { profile, supabase } = await requireRole(["leader"]);

  if (!profile.unit_id) {
    throw new Error("Il profilo capo non ha un'unità assegnata.");
  }

  const title = String(formData.get("title") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "").trim();
  const endsAtRaw = String(formData.get("ends_at") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();

  if (!title || !startsAt) {
    throw new Error("Titolo e data di inizio sono obbligatori.");
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      unit_id: profile.unit_id,
      title,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAtRaw ? new Date(endsAtRaw).toISOString() : null,
      location: location || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/staff");
  redirect(`/dashboard/staff/events/${data.id}/presenze`);
}

export async function saveAttendancesAction(eventId: string, formData: FormData) {
  const { profile, supabase } = await requireRole(["leader"]);

  const memberIds = formData.getAll("member_id").map(String);
  const rows = memberIds.map((memberId) => {
    const status = String(formData.get(`status_${memberId}`) ?? "absent") as AttendanceStatus;
    const notes = String(formData.get(`notes_${memberId}`) ?? "").trim();
    return {
      event_id: eventId,
      member_id: memberId,
      status,
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
  revalidatePath("/dashboard/parent");
}
