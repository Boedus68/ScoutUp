import { acknowledgeAnnouncementAction } from "@/app/dashboard/actions/announcement-ack";
import {
  announcementAudienceLabel,
  formatDateTime,
} from "@/lib/labels";
import type { AnnouncementAudience } from "@/lib/types";

export type AnnouncementView = {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  subgroup_id: string | null;
  created_at: string | null;
  acknowledged: boolean;
  subgroupName?: string | null;
};

export function AnnouncementList({ items }: { items: AnnouncementView[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
        Nessuna comunicazione per te al momento.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((a) => (
        <li
          key={a.id}
          className="rounded-xl border border-[var(--border)] bg-white p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                {announcementAudienceLabel[a.audience]}
                {a.subgroupName ? ` · ${a.subgroupName}` : ""}
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">
                {a.title}
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {a.created_at ? formatDateTime(a.created_at) : ""}
              </p>
            </div>
            {a.acknowledged ? (
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                Presa visione
              </span>
            ) : (
              <form action={acknowledgeAnnouncementAction}>
                <input type="hidden" name="announcement_id" value={a.id} />
                <button
                  type="submit"
                  className="rounded-md bg-[var(--forest)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  Presa visione
                </button>
              </form>
            )}
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
            {a.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
