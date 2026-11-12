"use client";

import { useId, useState } from "react";
import type { MedicalRecord } from "@/lib/types";

export function MedicalAlertBadge({
  record,
  memberName,
}: {
  record: Pick<
    MedicalRecord,
    | "criticality_flag"
    | "criticality_notes"
    | "food_allergies"
    | "drug_allergies"
    | "intolerances"
    | "ongoing_therapy"
    | "blood_type"
    | "emergency_contact_name"
    | "emergency_contact_phone"
    | "health_card_number"
  > | null;
  memberName: string;
}) {
  const dialogId = useId();
  const [open, setOpen] = useState(false);

  if (!record?.criticality_flag) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-2 inline-flex items-center rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white"
        title={record.criticality_notes ?? "Criticità sanitaria"}
        aria-haspopup="dialog"
        aria-controls={dialogId}
      >
        Allerta
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-label={`Scheda sanitaria ${memberName}`}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                  Allerta sanitaria
                </p>
                <h3 className="font-display text-2xl text-[var(--ink)]">
                  {memberName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-[var(--border)] px-2 py-1 text-sm"
              >
                Chiudi
              </button>
            </div>

            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-950">
              {record.criticality_notes || "Criticità segnalata dal genitore."}
            </p>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Item label="Allergie alimentari" value={record.food_allergies} />
              <Item label="Allergie farmaci" value={record.drug_allergies} />
              <Item label="Intolleranze" value={record.intolerances} />
              <Item label="Terapia" value={record.ongoing_therapy} />
              <Item label="Gruppo sanguigno" value={record.blood_type} />
              <Item label="Tessera sanitaria" value={record.health_card_number} />
              <Item
                label="Emergenza"
                value={
                  [record.emergency_contact_name, record.emergency_contact_phone]
                    .filter(Boolean)
                    .join(" · ") || null
                }
              />
            </dl>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Item({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="font-medium whitespace-pre-wrap">{value?.trim() || "—"}</dd>
    </div>
  );
}
