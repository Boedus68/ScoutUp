"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { switchActiveUnitAction } from "@/app/dashboard/actions";
import { branchLabel, branchShortLabel } from "@/lib/labels";
import type { ScoutBranch, Unit } from "@/lib/types";

function unitOptionLabel(unit: Unit) {
  if (unit.branch === "COCA") {
    return `${branchShortLabel.COCA} · ${unit.name}`;
  }
  return `${branchShortLabel[unit.branch]} · ${unit.name}`;
}

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

  const branches = new Set(units.map((u) => u.branch));
  const missing = (["LC", "EG", "RS", "COCA"] as ScoutBranch[]).filter(
    (b) => !branches.has(b),
  );
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
        {missing.length > 0 ? (
          <p className="text-xs leading-snug text-[var(--muted)]">
            Nel gruppo mancano:{" "}
            <span className="font-semibold text-[var(--ink)]">
              {missing.map((b) => branchShortLabel[b]).join(", ")}
            </span>
            . Crea le unità in Supabase (stesso group_id) e ricarica: qui
            comparirà lo switcher LC / EG / RS / Co.Ca.
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
            {unitOptionLabel(unit)}
            {` — ${branchLabel[unit.branch]}`}
          </option>
        ))}
      </select>
      {missing.length > 0 ? (
        <p className="text-xs text-[var(--muted)]">
          Mancano ancora: {missing.map((b) => branchShortLabel[b]).join(", ")}.
        </p>
      ) : null}
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
