"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { switchActiveUnitAction } from "@/app/dashboard/actions";
import { branchLabel, branchShortLabel } from "@/lib/labels";
import type { ScoutBranch, Unit } from "@/lib/types";

export function UnitSwitcher({
  units,
  activeUnitId,
  activeBranch = null,
  activeUnitName = null,
}: {
  units: Unit[];
  activeUnitId: string | null;
  activeBranch?: ScoutBranch | null;
  activeUnitName?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const hasCoca = units.some((u) => u.branch === "COCA");
  const only = units[0] ?? null;
  const displayBranch = activeBranch ?? only?.branch ?? null;
  const displayName = activeUnitName ?? only?.name ?? null;

  if (units.length <= 1) {
    return (
      <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Unità attiva
        </p>
        {displayName && displayBranch ? (
          <p className="text-sm text-[var(--ink)]">
            <span className="font-semibold">
              {branchShortLabel[displayBranch]}
            </span>
            <span className="text-[var(--muted)]"> · </span>
            {displayName}
          </p>
        ) : (
          <p className="text-sm text-[var(--muted)]">Nessuna unità assegnata</p>
        )}
        {!hasCoca ? (
          <p className="text-xs leading-snug text-[var(--muted)]">
            Co.Ca. non configurata: manca un&apos;unità con branca{" "}
            <span className="font-semibold text-[var(--ink)]">COCA</span> nello
            stesso gruppo. Dopo averla creata in Supabase ricarica la pagina: qui
            comparirà lo switcher servizio ↔ Co.Ca.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const path = await switchActiveUnitAction(fd);
          router.replace(path);
          router.refresh();
        });
      }}
    >
      <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Unità attiva
      </label>
      {displayBranch ? (
        <p className="text-xs text-[var(--muted)]">
          Ora:{" "}
          <span className="font-semibold text-[var(--ink)]">
            {branchShortLabel[displayBranch]}
          </span>
          {displayName ? ` · ${displayName}` : ""}
        </p>
      ) : null}
      <select
        name="unit_id"
        defaultValue={activeUnitId ?? units[0]?.id}
        key={activeUnitId ?? "none"}
        className="w-full rounded-md border border-[var(--border)] bg-white px-2 py-2 text-sm"
      >
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.branch === "COCA"
              ? `${branchShortLabel.COCA} · Comunità Capi`
              : `${branchShortLabel[unit.branch]} · ${unit.name} (${branchLabel[unit.branch]})`}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm font-medium hover:bg-[var(--surface-muted)] disabled:opacity-50"
      >
        {pending ? "Cambio…" : "Passa all'unità"}
      </button>
    </form>
  );
}
