import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import {
  cashEntryKindLabel,
  feeStatusLabel,
  formatDate,
  formatDateTime,
  formatEuro,
} from "@/lib/labels";
import type { CashEntryKind, FeeStatus } from "@/lib/types";
import {
  createAnnualFeeAction,
  createCashEntryAction,
  deleteCashEntryAction,
  updateFeeStatusAction,
} from "./actions";

export default async function StaffCassaPage() {
  await connection();
  const { profile, unit, roles, activeRole, supabase } = await requireRole([
    "leader",
  ]);

  const [{ data: members }, { data: fees }, { data: entries }] =
    await Promise.all([
      profile.unit_id
        ? supabase
            .from("profiles")
            .select("id, full_name, totem")
            .eq("unit_id", profile.unit_id)
            .eq("role", "member")
            .order("full_name")
        : Promise.resolve({ data: [] }),
      profile.unit_id
        ? supabase
            .from("annual_fees")
            .select(
              "id, member_id, title, amount, due_date, status, notes, created_at",
            )
            .eq("unit_id", profile.unit_id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      profile.unit_id
        ? supabase
            .from("cash_entries")
            .select(
              "id, kind, title, amount, receipt_url, member_id, notes, created_at",
            )
            .eq("unit_id", profile.unit_id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

  const memberName = new Map(
    (members ?? []).map(
      (m) =>
        [m.id, m.totem ? `${m.full_name} (${m.totem})` : m.full_name] as const,
    ),
  );

  const unpaid = (fees ?? []).filter((f) => f.status === "unpaid");
  const balance = (entries ?? []).reduce((acc, e) => {
    const n = Number(e.amount);
    if (e.kind === "expense" || e.kind === "reimbursement") return acc - n;
    return acc + n;
  }, 0);

  return (
    <DashboardShell
      title="Cassa / Economato"
      subtitle={
        unit
          ? `Quote e movimenti · ${unit.name}`
          : "Quote annuali, spese e rimborsi"
      }
      activeRole={activeRole}
      roles={roles}
    >
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-white px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Quote da saldare
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold">
            {unpaid.length}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Saldo movimenti
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold">
            {formatEuro(balance)}
          </p>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--forest)]">
          Quote annuali
        </h2>
        <form
          action={createAnnualFeeAction}
          className="mb-4 grid max-w-3xl gap-3 rounded-xl border border-[var(--border)] bg-white p-4 sm:grid-cols-2"
        >
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Ragazzo</span>
            <select
              name="member_id"
              required
              className="w-full rounded-md border border-[var(--border)] px-3 py-2"
              defaultValue=""
            >
              <option value="" disabled>
                Seleziona…
              </option>
              {(members ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {memberName.get(m.id)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Titolo</span>
            <input
              name="title"
              required
              defaultValue="Quota associativa 2025/2026"
              className="w-full rounded-md border border-[var(--border)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Importo (€)</span>
            <input
              name="amount"
              type="number"
              min="0"
              step="0.01"
              required
              className="w-full rounded-md border border-[var(--border)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Scadenza</span>
            <input
              name="due_date"
              type="date"
              className="w-full rounded-md border border-[var(--border)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Note</span>
            <input
              name="notes"
              className="w-full rounded-md border border-[var(--border)] px-3 py-2"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-[var(--forest)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Registra quota
            </button>
          </div>
        </form>

        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          {(fees ?? []).length === 0 ? (
            <li className="px-4 py-6 text-sm text-[var(--muted)]">
              Nessuna quota registrata.
            </li>
          ) : (
            (fees ?? []).map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium">
                    {f.title} · {memberName.get(f.member_id) ?? "—"}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {formatEuro(Number(f.amount))}
                    {f.due_date ? ` · scad. ${formatDate(f.due_date)}` : ""} ·{" "}
                    {feeStatusLabel[f.status as FeeStatus]}
                  </p>
                </div>
                <form action={updateFeeStatusAction} className="flex gap-2">
                  <input type="hidden" name="id" value={f.id} />
                  <select
                    name="status"
                    defaultValue={f.status}
                    className="rounded-md border border-[var(--border)] px-2 py-1 text-sm"
                  >
                    {(Object.keys(feeStatusLabel) as FeeStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {feeStatusLabel[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-md border border-[var(--border)] px-3 py-1 text-sm hover:bg-[var(--surface-muted)]"
                  >
                    Aggiorna
                  </button>
                </form>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--forest)]">
          Spese e rimborsi
        </h2>
        <form
          action={createCashEntryAction}
          className="mb-4 grid max-w-3xl gap-3 rounded-xl border border-[var(--border)] bg-white p-4 sm:grid-cols-2"
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Tipo</span>
            <select
              name="kind"
              defaultValue="expense"
              className="w-full rounded-md border border-[var(--border)] px-3 py-2"
            >
              {(Object.keys(cashEntryKindLabel) as CashEntryKind[]).map((k) => (
                <option key={k} value={k}>
                  {cashEntryKindLabel[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Importo (€)</span>
            <input
              name="amount"
              type="number"
              min="0"
              step="0.01"
              required
              className="w-full rounded-md border border-[var(--border)] px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Titolo</span>
            <input
              name="title"
              required
              placeholder="Es. Materiale cancelleria"
              className="w-full rounded-md border border-[var(--border)] px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">
              URL ricevuta (opzionale)
            </span>
            <input
              name="receipt_url"
              type="url"
              placeholder="https://…"
              className="w-full rounded-md border border-[var(--border)] px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">
              Collegato a ragazzo (opz.)
            </span>
            <select
              name="member_id"
              className="w-full rounded-md border border-[var(--border)] px-3 py-2"
              defaultValue=""
            >
              <option value="">—</option>
              {(members ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {memberName.get(m.id)}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-[var(--forest)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Registra movimento
            </button>
          </div>
        </form>

        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          {(entries ?? []).length === 0 ? (
            <li className="px-4 py-6 text-sm text-[var(--muted)]">
              Nessun movimento.
            </li>
          ) : (
            (entries ?? []).map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium">
                    {cashEntryKindLabel[e.kind as CashEntryKind]} · {e.title}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {formatEuro(Number(e.amount))}
                    {e.member_id
                      ? ` · ${memberName.get(e.member_id) ?? ""}`
                      : ""}
                    {e.created_at ? ` · ${formatDateTime(e.created_at)}` : ""}
                  </p>
                  {e.receipt_url ? (
                    <a
                      href={e.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-sm text-[var(--forest)] hover:underline"
                    >
                      Ricevuta
                    </a>
                  ) : null}
                </div>
                <form action={deleteCashEntryAction}>
                  <input type="hidden" name="id" value={e.id} />
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
      </section>
    </DashboardShell>
  );
}
