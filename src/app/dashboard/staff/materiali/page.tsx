import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/labels";
import {
  createMaterialAction,
  deleteMaterialAction,
} from "./actions";

export default async function StaffMaterialiPage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase } = await requireRole([
    "leader",
  ]);

  const { data: materials } = profile.unit_id
    ? await supabase
        .from("materials")
        .select("id, title, description, file_url, created_at")
        .eq("unit_id", profile.unit_id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <DashboardShell
      title="Materiali"
      subtitle={
        unit
          ? `Archivio capi · ${unit.name}`
          : "Archivio materiali (titolo, descrizione, URL)"
      }
      activeRole={activeRole}
      roles={roles}
    >
      <form
        action={createMaterialAction}
        className="mb-8 max-w-2xl space-y-4 rounded-xl border border-[var(--border)] bg-white p-5"
      >
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--forest)]">
          Aggiungi materiale
        </h2>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Titolo</span>
          <input
            name="title"
            required
            placeholder="Es. Programma campo estate"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Descrizione</span>
          <textarea
            name="description"
            rows={2}
            placeholder="Breve descrizione (opzionale)"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">URL file / link</span>
          <input
            name="file_url"
            type="url"
            required
            placeholder="https://…"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
          />
        </label>
        <p className="text-xs text-[var(--muted)]">
          Storage Supabase opzionale: per l&apos;MVP basta un URL (Drive, Dropbox,
          ecc.).
        </p>
        <button
          type="submit"
          className="rounded-md bg-[var(--forest)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Salva
        </button>
      </form>

      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        {(materials ?? []).length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            Nessun materiale in archivio.
          </li>
        ) : (
          (materials ?? []).map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-start justify-between gap-3 px-4 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{m.title}</p>
                {m.description ? (
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {m.description}
                  </p>
                ) : null}
                <a
                  href={m.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block break-all text-sm font-medium text-[var(--forest)] hover:underline"
                >
                  Apri link
                </a>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {m.created_at ? formatDateTime(m.created_at) : ""}
                </p>
              </div>
              <form action={deleteMaterialAction}>
                <input type="hidden" name="id" value={m.id} />
                <button
                  type="submit"
                  className="text-sm text-red-700 hover:underline"
                >
                  Elimina
                </button>
              </form>
            </li>
          ))
        )}
      </ul>
    </DashboardShell>
  );
}
