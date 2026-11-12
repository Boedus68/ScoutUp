"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { switchActiveRoleAction } from "@/app/dashboard/actions";
import { roleSwitcherLabel, sortAppRoles } from "@/lib/labels";
import type { AppRole } from "@/lib/types";

export function RoleSwitcher({
  roles,
  activeRole,
}: {
  roles: AppRole[];
  activeRole: AppRole;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const ordered = sortAppRoles(roles);

  if (ordered.length <= 1) {
    return (
      <p className="rounded-md bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--muted)]">
        Contesto:{" "}
        <span className="font-semibold text-[var(--ink)]">
          {roleSwitcherLabel[activeRole]}
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
          const path = await switchActiveRoleAction(fd);
          router.replace(path);
          router.refresh();
        });
      }}
    >
      <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Contesto attivo
      </label>
      <select
        name="role"
        defaultValue={activeRole}
        key={activeRole}
        className="w-full rounded-md border border-[var(--border)] bg-white px-2 py-2 text-sm"
      >
        {ordered.map((role) => (
          <option key={role} value={role}>
            {roleSwitcherLabel[role]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm font-medium hover:bg-[var(--surface-muted)] disabled:opacity-50"
      >
        {pending ? "Cambio…" : "Cambia contesto"}
      </button>
    </form>
  );
}
