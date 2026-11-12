"use client";

import { useMemo, useState, useTransition } from "react";
import {
  censusHasBlockingErrors,
  parseCensusCsv,
  type CensusIssue,
  type CensusRow,
} from "@/lib/csv-census";
import {
  importCensusAction,
  type ImportRowResult,
} from "./actions";

export function CsvCensusImport() {
  const [rows, setRows] = useState<CensusRow[]>([]);
  const [issues, setIssues] = useState<CensusIssue[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [results, setResults] = useState<ImportRowResult[] | null>(null);
  const [pending, startTransition] = useTransition();

  const blocking = useMemo(() => censusHasBlockingErrors(issues), [issues]);

  function onFile(file: File | null) {
    setResults(null);
    if (!file) {
      setRows([]);
      setIssues([]);
      setFileName(null);
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseCensusCsv(text);
      setRows(parsed.rows);
      setIssues(parsed.issues);
    };
    reader.readAsText(file);
  }

  return (
    <section className="mb-8 space-y-4 rounded-xl border border-[var(--border)] bg-white p-5">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--forest)]">
          Importa Censimento (CSV)
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Colonne: Nome, Cognome, Data di nascita, Sestiglia/Squadriglia/Pattuglia,
          Email ragazzo, Email genitore 1, Telefono genitore 1. Header flessibili
          in italiano. Anteprima e validazione prima del salvataggio.
        </p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          <strong>Limite Auth:</strong> non crea utenti in{" "}
          <code>auth.users</code> dal client (niente service-role). Se l&apos;email
          non esiste già in Authentication, la riga viene saltata senza errore
          bloccante. Duplicati email → aggiornamento (upsert) del profilo /
          link genitore.
        </p>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">File CSV</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
      </label>

      {fileName ? (
        <p className="text-xs text-[var(--muted)]">
          File: {fileName} · {rows.length} righe
        </p>
      ) : null}

      {issues.length > 0 ? (
        <ul className="space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {issues.map((i, idx) => (
            <li key={`${i.rowNumber}-${idx}`}>
              {i.level === "error" ? "Errore" : "Avviso"} riga {i.rowNumber}:{" "}
              {i.message}
            </li>
          ))}
        </ul>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Cognome</th>
                <th className="px-3 py-2">Nascita</th>
                <th className="px-3 py-2">Sottogruppo</th>
                <th className="px-3 py-2">Email ragazzo</th>
                <th className="px-3 py-2">Email genitore</th>
                <th className="px-3 py-2">Tel. genitore</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((r) => (
                <tr key={r.rowNumber}>
                  <td className="px-3 py-2 text-[var(--muted)]">{r.rowNumber}</td>
                  <td className="px-3 py-2">{r.nome}</td>
                  <td className="px-3 py-2">{r.cognome}</td>
                  <td className="px-3 py-2">{r.birthDate ?? "—"}</td>
                  <td className="px-3 py-2">{r.subgroup ?? "—"}</td>
                  <td className="px-3 py-2">{r.memberEmail ?? "—"}</td>
                  <td className="px-3 py-2">{r.parentEmail ?? "—"}</td>
                  <td className="px-3 py-2">{r.parentPhone ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <button
        type="button"
        disabled={pending || rows.length === 0 || blocking}
        onClick={() => {
          startTransition(async () => {
            const res = await importCensusAction(rows);
            setResults(res.results);
          });
        }}
        className="rounded-md bg-[var(--forest)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
      >
        {pending ? "Import in corso…" : "Importa in anagrafica"}
      </button>

      {results ? (
        <ul className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm">
          {results.map((r) => (
            <li key={r.rowNumber}>
              Riga {r.rowNumber}: <strong>{r.status}</strong> — {r.detail}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
