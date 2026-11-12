"use client";

import { useTransition } from "react";
import {
  addStaffNoteAction,
  assignProgressionAction,
  decideProgressionAction,
} from "../actions";
import { progressionKindLabel } from "@/lib/labels";
import type { ProgressionCatalogItem, ProgressionKind } from "@/lib/types";

export function DecideControls({ itemId }: { itemId: string }) {
  const [pending, startTransition] = useTransition();

  function decide(decision: "conquered" | "rejected", form: HTMLFormElement) {
    const fd = new FormData(form);
    fd.set("item_id", itemId);
    fd.set("decision", decision);
    startTransition(async () => {
      await decideProgressionAction(fd);
    });
  }

  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(e) => e.preventDefault()}
    >
      <textarea
        name="staff_comment"
        rows={2}
        placeholder="Commento (opzionale)"
        className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={(e) =>
            decide("conquered", (e.currentTarget as HTMLButtonElement).form!)
          }
          className="rounded-md bg-[var(--forest)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          Approva
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={(e) =>
            decide("rejected", (e.currentTarget as HTMLButtonElement).form!)
          }
          className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
        >
          Rifiuta
        </button>
      </div>
    </form>
  );
}

export function AssignControls({
  memberId,
  kinds,
  catalog,
}: {
  memberId: string;
  kinds: ProgressionKind[];
  catalog: ProgressionCatalogItem[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-3 space-y-3 text-sm"
      action={(fd) => {
        startTransition(async () => {
          await assignProgressionAction(fd);
        });
      }}
    >
      <input type="hidden" name="member_id" value={memberId} />
      <label className="block">
        <span className="mb-1 block font-medium">Dal catalogo (opzionale)</span>
        <select
          name="catalog_id"
          className="w-full rounded-md border border-[var(--border)] px-2 py-1.5"
          defaultValue=""
        >
          <option value="">— Personalizzato —</option>
          {catalog.map((c) => (
            <option key={c.id} value={c.id}>
              {progressionKindLabel[c.kind]} — {c.title}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block font-medium">Tipo</span>
        <select
          name="kind"
          required
          className="w-full rounded-md border border-[var(--border)] px-2 py-1.5"
          defaultValue={kinds[0]}
        >
          {kinds.map((k) => (
            <option key={k} value={k}>
              {progressionKindLabel[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block font-medium">Titolo (se personalizzato)</span>
        <input
          name="title"
          className="w-full rounded-md border border-[var(--border)] px-2 py-1.5"
          placeholder="Obbligatorio se non scegli dal catalogo"
        />
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" name="as_conquered" />
        Segna subito come conquistata
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--forest)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Salvataggio…" : "Assegna"}
      </button>
    </form>
  );
}

export function NoteForm({ memberId }: { memberId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-3 space-y-2"
      action={(fd) => {
        startTransition(async () => {
          await addStaffNoteAction(fd);
        });
      }}
    >
      <input type="hidden" name="member_id" value={memberId} />
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Nota educativa riservata…"
        className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
      >
        {pending ? "Salvataggio…" : "Aggiungi nota"}
      </button>
    </form>
  );
}
