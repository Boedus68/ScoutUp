"use client";

export function PrintButton({ label = "Stampa / Salva PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-md bg-[var(--forest)] px-3 py-1.5 text-sm font-semibold text-white"
    >
      {label}
    </button>
  );
}
