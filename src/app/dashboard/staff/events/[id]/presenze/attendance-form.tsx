"use client";

import { useTransition } from "react";
import { attendanceLabel } from "@/lib/labels";
import type { AttendanceStatus } from "@/lib/types";
import { saveAttendancesAction } from "../../../actions";

type MemberRow = {
  id: string;
  full_name: string;
  status: AttendanceStatus;
  notes: string;
};

const statuses: AttendanceStatus[] = ["present", "absent", "justified"];

export function AttendanceForm({
  eventId,
  members,
}: {
  eventId: string;
  members: MemberRow[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await saveAttendancesAction(eventId, formData);
        });
      }}
      className="space-y-4"
    >
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-muted)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Ragazzo / Ragazza</th>
              <th className="px-4 py-3 font-medium">Stato</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {members.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-[var(--muted)]">
                  Nessun member in questa unità. Aggiungi profili con ruolo{" "}
                  <code>member</code> e lo stesso <code>unit_id</code>.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-3 font-medium">
                    {member.full_name}
                    <input type="hidden" name="member_id" value={member.id} />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      name={`status_${member.id}`}
                      defaultValue={member.status}
                      className="w-full min-w-[9rem] rounded-md border border-[var(--border)] bg-white px-2 py-1.5"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {attendanceLabel[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <input
                      name={`notes_${member.id}`}
                      defaultValue={member.notes}
                      placeholder="Opzionale"
                      className="w-full rounded-md border border-[var(--border)] px-2 py-1.5"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button
        type="submit"
        disabled={pending || members.length === 0}
        className="rounded-md bg-[var(--forest)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--forest-deep)] disabled:opacity-60"
      >
        {pending ? "Salvataggio…" : "Salva Presenze"}
      </button>
    </form>
  );
}
