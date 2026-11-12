import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import {
  announcementAudienceLabel,
  formatDateTime,
} from "@/lib/labels";
import type { AnnouncementAudience } from "@/lib/types";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
} from "./actions";

export default async function StaffBachecaPage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase } = await requireRole([
    "leader",
  ]);

  const [annRes, subRes, ackRes] = await Promise.all([
    profile.unit_id
      ? supabase
          .from("announcements")
          .select(
            "id, title, body, audience, subgroup_id, created_at, created_by",
          )
          .eq("unit_id", profile.unit_id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    profile.unit_id
      ? supabase
          .from("subgroups")
          .select("id, name")
          .eq("unit_id", profile.unit_id)
          .order("name")
      : Promise.resolve({ data: [], error: null }),
    supabase.from("announcement_acks").select("announcement_id, user_id"),
  ]);

  const announcements = annRes.data;
  const subgroups = subRes.data;
  const acks = ackRes.data;
  const schemaError = annRes.error?.message ?? null;

  const subgroupName = new Map(
    (subgroups ?? []).map((s) => [s.id, s.name] as const),
  );
  const ackCount = new Map<string, number>();
  for (const a of acks ?? []) {
    ackCount.set(
      a.announcement_id,
      (ackCount.get(a.announcement_id) ?? 0) + 1,
    );
  }

  return (
    <DashboardShell
      title="Bacheca"
      subtitle={
        unit
          ? `Circolari · ${unit.name}`
          : "Circolari mirate con presa visione"
      }
      activeRole={activeRole}
      roles={roles}
    >
      {schemaError ? (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Schema bacheca non disponibile sul database ({schemaError}). Applica
          la migration{" "}
          <code className="text-xs">20261112050000_fase5_bacheca_cassa.sql</code> via
          pooler.
        </p>
      ) : null}
      <form
        action={createAnnouncementAction}
        className="mb-8 max-w-2xl space-y-4 rounded-xl border border-[var(--border)] bg-white p-5"
      >
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--forest)]">
          Nuova circolare
        </h2>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Titolo</span>
          <input
            name="title"
            required
            placeholder="Es. Convocazione Consiglio Capi"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Testo</span>
          <textarea
            name="body"
            required
            rows={4}
            placeholder="Contenuto della comunicazione…"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Destinatari</span>
            <select
              name="audience"
              defaultValue="unit"
              className="w-full rounded-md border border-[var(--border)] px-3 py-2"
            >
              {(
                Object.keys(announcementAudienceLabel) as AnnouncementAudience[]
              ).map((key) => (
                <option key={key} value={key}>
                  {announcementAudienceLabel[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">
              Sottogruppo (se mirata)
            </span>
            <select
              name="subgroup_id"
              className="w-full rounded-md border border-[var(--border)] px-3 py-2"
              defaultValue=""
            >
              <option value="">—</option>
              {(subgroups ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          className="rounded-md bg-[var(--forest)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Pubblica
        </button>
      </form>

      <ul className="space-y-4">
        {(announcements ?? []).length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
            Nessuna circolare pubblicata.
          </li>
        ) : (
          (announcements ?? []).map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-[var(--border)] bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    {announcementAudienceLabel[a.audience as AnnouncementAudience]}
                    {a.subgroup_id
                      ? ` · ${subgroupName.get(a.subgroup_id) ?? "sottogruppo"}`
                      : ""}
                  </p>
                  <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--ink)]">
                    {a.title}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {a.created_at ? formatDateTime(a.created_at) : ""} ·{" "}
                    {ackCount.get(a.id) ?? 0} prese visione
                  </p>
                </div>
                <form action={deleteAnnouncementAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <button
                    type="submit"
                    className="text-sm text-red-700 hover:underline"
                  >
                    Elimina
                  </button>
                </form>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">
                {a.body}
              </p>
            </li>
          ))
        )}
      </ul>
    </DashboardShell>
  );
}
