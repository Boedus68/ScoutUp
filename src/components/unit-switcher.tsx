"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { switchActiveUnitAction } from "@/app/dashboard/actions";
import { branchLabel } from "@/lib/labels";
import type { Unit } from "@/lib/types";

export function UnitSwitcher({
  units,
  activeUnitId,
}: {
  units: Unit[];
  activeUnitId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (units.length <= 1) {
    const only = units[0];
    if (!only) return null;
    return (
      <p className="rounded-md bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--muted)]">
        Unità:{" "}
        <span className="font-semibold text-[var(--ink)]">
          {only.name}
        </span>
      </p>
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
      <select
        name="unit_id"
        defaultValue={activeUnitId ?? units[0]?.id}
        key={activeUnitId ?? "none"}
        className="w-full rounded-md border border-[var(--border)] bg-white px-2 py-2 text-sm"
      >
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.branch === "COCA"
              ? `Comunità Capi (Co.Ca.)`
              : `${unit.name} · ${branchLabel[unit.branch]}`}
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
