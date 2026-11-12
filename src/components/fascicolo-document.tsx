import type { MedicalRecord } from "@/lib/types";

export type FascicoloMember = {
  id: string;
  full_name: string;
  totem: string | null;
  medical: MedicalRecord | null;
};

export function FascicoloDocument({
  unitName,
  eventTitle,
  eventMeta,
  members,
  generatedAt,
}: {
  unitName: string;
  eventTitle?: string | null;
  eventMeta?: string | null;
  members: FascicoloMember[];
  generatedAt: string;
}) {
  const critical = members.filter((m) => m.medical?.criticality_flag);

  return (
    <div className="fascicolo mx-auto max-w-3xl bg-white px-6 py-8 text-[var(--ink)] print:max-w-none print:px-0">
      <header className="border-b border-[var(--border)] pb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--forest)]">
          Scout-Up · Fascicolo Sicurezza
        </p>
        <h1 className="mt-1 font-display text-3xl">
          {eventTitle ?? "Unità"} — {unitName}
        </h1>
        {eventMeta ? (
          <p className="mt-1 text-sm text-[var(--muted)]">{eventMeta}</p>
        ) : null}
        <p className="mt-2 text-xs text-[var(--muted)]">
          Generato il {generatedAt}. Documento riservato — solo staff in uscita.
          Dati sanitari ex GDPR: non distribuire fuori dal contesto di sicurezza.
        </p>
      </header>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Allerte critiche ({critical.length})</h2>
        {critical.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">Nessuna criticità segnalata.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {critical.map((m) => (
              <li
                key={m.id}
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm"
              >
                <strong>{m.full_name}</strong>
                {m.totem ? ` (${m.totem})` : ""}:{" "}
                {m.medical?.criticality_notes || "Criticità segnalata"}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 space-y-6">
        <h2 className="text-lg font-semibold">Schede complete</h2>
        {members.map((m) => (
          <article
            key={m.id}
            className="break-inside-avoid rounded-lg border border-[var(--border)] p-4"
          >
            <h3 className="font-semibold">
              {m.full_name}
              {m.totem ? (
                <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                  ({m.totem})
                </span>
              ) : null}
              {m.medical?.criticality_flag ? (
                <span className="ml-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                  Allerta
                </span>
              ) : null}
            </h3>
            {!m.medical ? (
              <p className="mt-2 text-sm text-[var(--muted)]">
                Scheda sanitaria non compilata dal genitore.
              </p>
            ) : (
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <Field label="Allergie alimentari" value={m.medical.food_allergies} />
                <Field label="Allergie farmaci" value={m.medical.drug_allergies} />
                <Field label="Intolleranze" value={m.medical.intolerances} />
                <Field label="Terapia" value={m.medical.ongoing_therapy} />
                <Field label="Gruppo sanguigno" value={m.medical.blood_type} />
                <Field label="Tessera sanitaria" value={m.medical.health_card_number} />
                <Field
                  label="Emergenza"
                  value={
                    [
                      m.medical.emergency_contact_name,
                      m.medical.emergency_contact_phone,
                    ]
                      .filter(Boolean)
                      .join(" · ") || null
                  }
                />
                <Field label="Note criticità" value={m.medical.criticality_notes} />
              </dl>
            )}
          </article>
        ))}
      </section>

      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .fascicolo { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="font-medium whitespace-pre-wrap">{value?.trim() || "—"}</dd>
    </div>
  );
}
