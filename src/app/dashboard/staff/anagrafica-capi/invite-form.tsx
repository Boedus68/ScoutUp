"use client";

import { useState, useTransition } from "react";
import {
  inviteOrLinkLeaderAction,
  type InviteLeaderResult,
} from "./actions";
import { groupRoleLabel, groupRoleOptions } from "@/lib/labels";
import type { Unit } from "@/lib/types";

export function InviteLeaderForm({
  serviceUnits,
  canInviteViaAuth,
}: {
  serviceUnits: Unit[];
  canInviteViaAuth: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<InviteLeaderResult | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await inviteOrLinkLeaderAction(fd);
          setResult(res);
          if (res.ok) e.currentTarget.reset();
        });
      }}
    >
      <p className="text-sm text-[var(--muted)]">
        {canInviteViaAuth
          ? "Invio email di invito Auth (service role solo server-side). Se l'utente esiste già, viene collegato con la RPC link_leader_by_email (niente INSERT JWT su role_memberships)."
          : "Manca SUPABASE_SERVICE_ROLE_KEY sul server: l'app non può invitare un utente Auth nuovo. Collega un capo già in Authentication, oppure configura la key su Netlify (mai NEXT_PUBLIC_*)."}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Nome</span>
          <input
            name="first_name"
            required
            className="w-full rounded-md border border-[var(--border)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Cognome</span>
          <input
            name="last_name"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          className="w-full rounded-md border border-[var(--border)] px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Telefono</span>
        <input
          name="phone"
          type="tel"
          className="w-full rounded-md border border-[var(--border)] px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Unità di servizio</span>
        <select
          name="service_unit_id"
          className="w-full rounded-md border border-[var(--border)] px-3 py-2"
          defaultValue={
            serviceUnits.find((u) => u.branch !== "COCA")?.id ??
            serviceUnits[0]?.id ??
            ""
          }
        >
          {serviceUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {u.branch} · {u.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Incarico Co.Ca.</span>
        <select
          name="group_role"
          className="w-full rounded-md border border-[var(--border)] px-3 py-2"
          defaultValue=""
        >
          <option value="">— nessuno —</option>
          {groupRoleOptions.map((r) => (
            <option key={r} value={r}>
              {groupRoleLabel[r]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--forest)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending
          ? "Elaborazione…"
          : canInviteViaAuth
            ? "Invita capo"
            : "Collega capo"}
      </button>

      {result ? (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            result.ok
              ? "border-green-200 bg-green-50 text-green-950"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
          role="status"
        >
          <p>{result.message}</p>
        </div>
      ) : null}
    </form>
  );
}
