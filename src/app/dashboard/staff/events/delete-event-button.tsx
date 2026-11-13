"use client";

import { useTransition } from "react";
import { deleteEventAction } from "../actions";

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (
          !window.confirm(
            "Eliminare questo appuntamento? L'azione non si può annullare.",
          )
        ) {
          return;
        }
        const fd = new FormData();
        fd.set("event_id", eventId);
        startTransition(async () => {
          await deleteEventAction(fd);
        });
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="text-sm font-medium text-red-700 hover:underline disabled:opacity-60"
      >
        {pending ? "Eliminazione…" : "Elimina"}
      </button>
    </form>
  );
}
