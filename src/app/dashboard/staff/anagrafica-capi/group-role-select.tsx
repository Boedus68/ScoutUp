"use client";

import { useTransition } from "react";
import { updateLeaderGroupRoleAction } from "./actions";
import { groupRoleLabel, groupRoleOptions } from "@/lib/labels";
import type { CocaGroupRole } from "@/lib/types";

export function GroupRoleSelect({
  leaderId,
  value,
}: {
  leaderId: string;
  value: CocaGroupRole | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      name="group_role"
      defaultValue={value ?? ""}
      disabled={pending}
      className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs"
      aria-label="Incarico Co.Ca."
      onChange={(e) => {
        const fd = new FormData();
        fd.set("leader_id", leaderId);
        fd.set("group_role", e.target.value);
        startTransition(async () => {
          await updateLeaderGroupRoleAction(fd);
        });
      }}
    >
      <option value="">Capo</option>
      {groupRoleOptions.map((r) => (
        <option key={r} value={r}>
          {groupRoleLabel[r]}
        </option>
      ))}
    </select>
  );
}
