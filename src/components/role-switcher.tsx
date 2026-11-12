import { setActiveRoleAction } from "@/app/dashboard/actions";
import { roleLabel } from "@/lib/labels";
import type { AppRole } from "@/lib/types";

export function RoleSwitcher({
  roles,
  activeRole,
}: {
  roles: AppRole[];
  activeRole: AppRole;
}) {
  if (roles.length <= 1) {
    return (
      <p className="rounded-md bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--muted)]">
        Contesto: <span className="font-semibold text-[var(--ink)]">{roleLabel[activeRole]}</span>
      </p>
    );
  }

  return (
    <form action={setActiveRoleAction} className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Contesto attivo
      </label>
      <select
        name="role"
        defaultValue={activeRole}
        className="w-full rounded-md border border-[var(--border)] bg-white px-2 py-2 text-sm"
      >
        {roles.map((role) => (
          <option key={role} value={role}>
            {roleLabel[role]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm font-medium hover:bg-[var(--surface-muted)]"
      >
        Cambia contesto
      </button>
    </form>
  );
}
