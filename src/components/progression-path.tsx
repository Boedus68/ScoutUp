"use client";

import { useTransition } from "react";
import { requestProgressionAction } from "@/app/dashboard/member/progressione/actions";
import {
  progressionKindLabel,
  progressionKindsForBranch,
  progressionStatusLabel,
} from "@/lib/labels";
import type {
  ProgressionCatalogItem,
  ProgressionItem,
  ProgressionKind,
  ProgressionStatus,
  ScoutBranch,
} from "@/lib/types";

type PathRow = {
  key: string;
  catalogId: string | null;
  itemId: string | null;
  kind: ProgressionKind;
  title: string;
  status: ProgressionStatus | "available";
  staffComment: string | null;
  canRequest: boolean;
};

const statusStyles: Record<string, string> = {
  conquered: "border-[var(--forest)] bg-emerald-50",
  requested: "border-amber-400 bg-amber-50",
  in_progress: "border-sky-300 bg-sky-50",
  rejected: "border-stone-300 bg-stone-50",
  available: "border-dashed border-[var(--border)] bg-white",
};

export function ProgressionPath({
  branch,
  catalog,
  items,
  mode,
}: {
  branch: ScoutBranch;
  catalog: ProgressionCatalogItem[];
  items: ProgressionItem[];
  mode: "member" | "readonly";
}) {
  const [pending, startTransition] = useTransition();
  const kinds = progressionKindsForBranch(branch);

  const byCatalog = new Map(
    items.filter((i) => i.catalog_id).map((i) => [i.catalog_id as string, i]),
  );

  const rows: PathRow[] = [];
  for (const kind of kinds) {
    const catalogKind = catalog.filter((c) => c.kind === kind);
    for (const c of catalogKind) {
      const existing = byCatalog.get(c.id);
      rows.push({
        key: c.id,
        catalogId: c.id,
        itemId: existing?.id ?? null,
        kind,
        title: existing?.title ?? c.title,
        status: existing?.status ?? "available",
        staffComment: existing?.staff_comment ?? null,
        canRequest:
          mode === "member" &&
          (!existing ||
            existing.status === "in_progress" ||
            existing.status === "rejected"),
      });
    }
    // Custom items of this kind without catalog
    for (const item of items.filter((i) => i.kind === kind && !i.catalog_id)) {
      rows.push({
        key: item.id,
        catalogId: null,
        itemId: item.id,
        kind,
        title: item.title,
        status: item.status,
        staffComment: item.staff_comment,
        canRequest:
          mode === "member" &&
          (item.status === "in_progress" || item.status === "rejected"),
      });
    }
  }

  function request(row: PathRow) {
    const fd = new FormData();
    if (row.itemId) fd.set("item_id", row.itemId);
    if (row.catalogId) fd.set("catalog_id", row.catalogId);
    fd.set("title", row.title);
    fd.set("kind", row.kind);
    startTransition(async () => {
      await requestProgressionAction(fd);
    });
  }

  return (
    <div className="space-y-8">
      {kinds.map((kind) => {
        const kindRows = rows.filter((r) => r.kind === kind);
        if (kindRows.length === 0) return null;
        return (
          <section key={kind}>
            <h2 className="mb-3 text-lg font-semibold">
              {progressionKindLabel[kind]}
            </h2>
            <ol className="relative space-y-3 border-l-2 border-[var(--border)] pl-6">
              {kindRows.map((row, idx) => (
                <li key={row.key} className="relative">
                  <span
                    className={`absolute -left-[1.55rem] top-3 h-3 w-3 rounded-full border-2 ${
                      row.status === "conquered"
                        ? "border-[var(--forest)] bg-[var(--forest)]"
                        : row.status === "requested"
                          ? "border-amber-500 bg-amber-400"
                          : "border-[var(--border)] bg-white"
                    }`}
                  />
                  <div
                    className={`rounded-xl border px-4 py-3 ${statusStyles[row.status]}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {idx + 1}. {row.title}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {row.status === "available"
                            ? "Disponibile nel catalogo"
                            : progressionStatusLabel[row.status as ProgressionStatus]}
                        </p>
                        {row.staffComment ? (
                          <p className="mt-1 text-xs text-[var(--ink)]">
                            Nota capo: {row.staffComment}
                          </p>
                        ) : null}
                      </div>
                      {row.canRequest ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => request(row)}
                          className="rounded-md bg-[var(--forest)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          Richiedi conquista
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
