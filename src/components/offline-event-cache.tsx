"use client";

import { useEffect } from "react";
import { saveEventBundle } from "@/lib/offline-store";
import type { MedicalRecord } from "@/lib/types";

/** Salva in IndexedDB il bundle uscita corrente (registro + sanitarie) per uso offline. */
export function OfflineEventCache({
  eventId,
  event,
  members,
  medical,
  attendances,
}: {
  eventId: string;
  event: Record<string, unknown>;
  members: Array<Record<string, unknown>>;
  medical: MedicalRecord[];
  attendances: Array<Record<string, unknown>>;
}) {
  useEffect(() => {
    void saveEventBundle({
      eventId,
      savedAt: new Date().toISOString(),
      event,
      members,
      medical: medical as unknown as Array<Record<string, unknown>>,
      attendances,
    });
  }, [eventId, event, members, medical, attendances]);

  return (
    <p className="mb-3 text-xs text-[var(--muted)]">
      Cache offline attiva per questa uscita (registro + schede sanitarie). Su
      iOS Safari la PWA ha limiti di storage in background — riapri l&apos;app
      online per sincronizzare.
    </p>
  );
}
