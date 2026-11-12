"use client";

import { createClient } from "@/lib/supabase/client";
import { listSyncQueue, removeSyncItem } from "@/lib/offline-store";

/** Flush coda sync attendances verso Supabase. Ritorna quanti item restano. */
export async function flushAttendanceQueue(): Promise<number> {
  if (typeof window === "undefined" || !navigator.onLine) {
    const q = await listSyncQueue().catch(() => []);
    return q.length;
  }

  const supabase = createClient();
  const queue = await listSyncQueue();
  for (const item of queue) {
    if (item.kind !== "attendances") continue;
    const rows = item.payload.rows as Array<{
      member_id: string;
      status: string;
      notes: string | null;
      payment_status: string;
    }>;
    const eventId = item.eventId;
    let failed = false;
    for (const row of rows) {
      const { error } = await supabase.from("attendances").upsert(
        {
          event_id: eventId,
          member_id: row.member_id,
          status: row.status,
          notes: row.notes,
          payment_status: row.payment_status,
        },
        { onConflict: "event_id,member_id" },
      );
      if (error) {
        failed = true;
        break;
      }
    }
    if (!failed) await removeSyncItem(item.id);
  }
  const left = await listSyncQueue();
  return left.length;
}
