"use client";

import { useTransition } from "react";
import {
  authorizeEventAction,
  confirmEventAction,
} from "@/app/dashboard/family-actions";

export function ConfirmButtons({
  eventId,
  memberId,
  actor,
}: {
  eventId: string;
  memberId: string;
  actor: "parent" | "member";
}) {
  const [pending, startTransition] = useTransition();

  function submit(status: "attending" | "not_attending") {
    const fd = new FormData();
    fd.set("event_id", eventId);
    fd.set("member_id", memberId);
    fd.set("status", status);
    fd.set("actor", actor);
    startTransition(async () => {
      await confirmEventAction(fd);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => submit("attending")}
        className="rounded-md bg-[var(--forest)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        Confermo
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => submit("not_attending")}
        className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
      >
        Non partecipo
      </button>
    </div>
  );
}

export function AuthorizeButton({
  eventId,
  memberId,
  currentlyAuthorized,
}: {
  eventId: string;
  memberId: string;
  currentlyAuthorized: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function submit() {
    const fd = new FormData();
    fd.set("event_id", eventId);
    fd.set("member_id", memberId);
    fd.set("status", currentlyAuthorized ? "revoked" : "authorized");
    startTransition(async () => {
      await authorizeEventAction(fd);
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={submit}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
        currentlyAuthorized
          ? "border border-[var(--border)] bg-white text-[var(--ink)]"
          : "bg-[var(--amber)] text-white"
      }`}
    >
      {currentlyAuthorized ? "Revoca autorizzazione" : "Autorizza (one-tap)"}
    </button>
  );
}
