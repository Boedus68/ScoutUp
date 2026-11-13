"use client";

import { useState, useTransition } from "react";
import {
  updateOwnProfileAction,
  type UpdateProfileResult,
} from "@/app/dashboard/profilo-actions";
import type { ProfileGender } from "@/lib/types";

type ProfileEditFormProps = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  email: string;
  gender: ProfileGender | null;
};

export function ProfileEditForm({
  firstName,
  lastName,
  phone,
  address,
  email,
  gender,
}: ProfileEditFormProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<UpdateProfileResult | null>(null);

  return (
    <form
      className="max-w-lg space-y-4 rounded-xl border border-[var(--border)] bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await updateOwnProfileAction(fd);
          setResult(res);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Nome</span>
          <input
            name="first_name"
            defaultValue={firstName}
            required
            className="w-full rounded-md border border-[var(--border)] px-3 py-2"
            autoComplete="given-name"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Cognome</span>
          <input
            name="last_name"
            defaultValue={lastName}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2"
            autoComplete="family-name"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Email</span>
        <input
          name="email"
          type="email"
          defaultValue={email}
          required
          className="w-full rounded-md border border-[var(--border)] px-3 py-2"
          autoComplete="email"
        />
        <span className="mt-1 block text-xs text-[var(--muted)]">
          La modifica email richiede conferma via Auth (link nella casella).
        </span>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Telefono</span>
        <input
          name="phone"
          type="tel"
          defaultValue={phone}
          className="w-full rounded-md border border-[var(--border)] px-3 py-2"
          autoComplete="tel"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Indirizzo</span>
        <textarea
          name="address"
          defaultValue={address}
          rows={2}
          className="w-full rounded-md border border-[var(--border)] px-3 py-2"
          autoComplete="street-address"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Sesso (etichette UI)</span>
        <select
          name="gender"
          defaultValue={gender ?? ""}
          className="w-full rounded-md border border-[var(--border)] px-3 py-2"
        >
          <option value="">Non indicato</option>
          <option value="M">Maschile</option>
          <option value="F">Femminile</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--forest)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Salvataggio…" : "Salva profilo"}
      </button>

      {result ? (
        <p
          className={`text-sm ${
            result.ok ? "text-[var(--forest)]" : "text-red-700"
          }`}
          role="status"
        >
          {result.message}
          {result.emailNotice ? ` ${result.emailNotice}` : ""}
        </p>
      ) : null}
    </form>
  );
}
