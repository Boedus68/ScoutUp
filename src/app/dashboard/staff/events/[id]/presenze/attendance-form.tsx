"use client";

import { useTransition } from "react";
import { MedicalAlertBadge } from "@/components/medical-alert";
import {
  attendanceLabel,
  authorizationLabel,
  confirmationLabel,
  paymentLabel,
} from "@/lib/labels";
import type {
  AttendanceStatus,
  AuthorizationStatus,
  ConfirmationStatus,
  MedicalRecord,
  PaymentStatus,
} from "@/lib/types";
import { saveAttendancesAction } from "../../../actions";

type MemberRow = {
  id: string;
  full_name: string;
  status: AttendanceStatus;
  payment_status: PaymentStatus;
  notes: string;
  confirmation: ConfirmationStatus | null;
  authorization: AuthorizationStatus | null;
  frequencyPct: number | null;
  medical: MedicalRecord | null;
};

const statuses: AttendanceStatus[] = ["present", "absent", "justified", "late"];
const payments: PaymentStatus[] = ["unpaid", "paid", "waived"];

export function AttendanceForm({
  eventId,
  members,
  hasFee,
}: {
  eventId: string;
  members: MemberRow[];
  hasFee: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const criticalCount = members.filter((m) => m.medical?.criticality_flag).length;

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await saveAttendancesAction(eventId, formData);
        });
      }}
      className="space-y-4"
    >
      {criticalCount > 0 ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          <strong>{criticalCount}</strong> ragazz
          {criticalCount === 1 ? "o/a" : "i/e"} con{" "}
          <strong>allerta sanitaria</strong>. Clicca il badge rosso per i dettagli.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="bg-[var(--surface-muted)] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-3 font-medium">Ragazzo / Ragazza</th>
              <th className="px-3 py-3 font-medium">Presenza</th>
              {hasFee ? <th className="px-3 py-3 font-medium">Quota</th> : null}
              <th className="px-3 py-3 font-medium">Conferma</th>
              <th className="px-3 py-3 font-medium">Autorizz.</th>
              <th className="px-3 py-3 font-medium">Freq.</th>
              <th className="px-3 py-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {members.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-[var(--muted)]">
                  Nessun member in questa unità.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id}>
                  <td className="px-3 py-3 font-medium">
                    <span className="inline-flex flex-wrap items-center gap-1">
                      {member.full_name}
                      <MedicalAlertBadge
                        memberName={member.full_name}
                        record={member.medical}
                      />
                    </span>
                    <input type="hidden" name="member_id" value={member.id} />
                  </td>
                  <td className="px-3 py-3">
                    <select
                      name={`status_${member.id}`}
                      defaultValue={member.status}
                      className="w-full min-w-[8rem] rounded-md border border-[var(--border)] bg-white px-2 py-1.5"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {attendanceLabel[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                  {hasFee ? (
                    <td className="px-3 py-3">
                      <select
                        name={`payment_${member.id}`}
                        defaultValue={member.payment_status}
                        className="w-full min-w-[7rem] rounded-md border border-[var(--border)] bg-white px-2 py-1.5"
                      >
                        {payments.map((p) => (
                          <option key={p} value={p}>
                            {paymentLabel[p]}
                          </option>
                        ))}
                      </select>
                    </td>
                  ) : (
                    <input
                      type="hidden"
                      name={`payment_${member.id}`}
                      value={member.payment_status}
                    />
                  )}
                  <td className="px-3 py-3 text-xs">
                    {member.confirmation
                      ? confirmationLabel[member.confirmation]
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {member.authorization
                      ? authorizationLabel[member.authorization]
                      : "—"}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-xs text-[var(--muted)]">
                    {member.frequencyPct == null
                      ? "—"
                      : `${member.frequencyPct}%`}
                  </td>
                  <td className="px-3 py-3">
                    <input
                      name={`notes_${member.id}`}
                      defaultValue={member.notes}
                      placeholder="Opzionale"
                      className="w-full min-w-[8rem] rounded-md border border-[var(--border)] px-2 py-1.5"
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
        {pending ? "Salvataggio…" : "Salva registro"}
      </button>
    </form>
  );
}
