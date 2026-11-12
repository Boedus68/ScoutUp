"use client";

import { useTransition } from "react";
import type { MedicalRecord } from "@/lib/types";
import { saveMedicalRecordAction } from "./actions";

export function MedicalForm({
  child,
  record,
}: {
  child: { id: string; full_name: string; totem: string | null };
  record: MedicalRecord | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        startTransition(async () => {
          await saveMedicalRecordAction(fd);
        });
      }}
      className="space-y-4 rounded-xl border border-[var(--border)] bg-white p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {child.full_name}
          {child.totem ? (
            <span className="ml-2 text-sm font-normal text-[var(--muted)]">
              ({child.totem})
            </span>
          ) : null}
        </h2>
        {record?.criticality_flag ? (
          <span className="rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-900">
            Criticità attiva
          </span>
        ) : null}
      </div>

      <input type="hidden" name="member_id" value={child.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-1">
          <span className="mb-1 block font-medium">Allergie alimentari</span>
          <textarea
            name="food_allergies"
            rows={2}
            defaultValue={record?.food_allergies ?? ""}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Allergie farmacologiche</span>
          <textarea
            name="drug_allergies"
            rows={2}
            defaultValue={record?.drug_allergies ?? ""}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Intolleranze</span>
          <textarea
            name="intolerances"
            rows={2}
            defaultValue={record?.intolerances ?? ""}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Terapia in corso</span>
          <textarea
            name="ongoing_therapy"
            rows={2}
            defaultValue={record?.ongoing_therapy ?? ""}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Tessera sanitaria</span>
          <input
            name="health_card_number"
            defaultValue={record?.health_card_number ?? ""}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Gruppo sanguigno</span>
          <input
            name="blood_type"
            placeholder="Es. A+"
            defaultValue={record?.blood_type ?? ""}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Contatto emergenza — nome</span>
          <input
            name="emergency_contact_name"
            defaultValue={record?.emergency_contact_name ?? ""}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Contatto emergenza — telefono</span>
          <input
            name="emergency_contact_phone"
            defaultValue={record?.emergency_contact_phone ?? ""}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2"
          />
        </label>
      </div>

      <label className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-950">
        <input
          type="checkbox"
          name="criticality_flag"
          defaultChecked={record?.criticality_flag ?? false}
          className="mt-1"
        />
        <span>
          <strong>Flag criticità</strong> — mostra un badge allerta ai capi nel
          registro uscite.
        </span>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Note criticità (sintesi per i capi)</span>
        <textarea
          name="criticality_notes"
          rows={2}
          placeholder="Es. Rischio anafilassi — autoiniettore in borsa"
          defaultValue={record?.criticality_notes ?? ""}
          className="w-full rounded-md border border-[var(--border)] px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--forest)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Salvataggio…" : "Salva scheda sanitaria"}
      </button>
    </form>
  );
}
