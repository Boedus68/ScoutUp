import { connection } from "next/server";
import { redirect } from "next/navigation";
import { dashboardPathForRole, requireUser } from "@/lib/auth";

export default async function DashboardIndexPage() {
  await connection();
  const { profile } = await requireUser();

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-display text-3xl">Profilo mancante</h1>
        <p className="mt-3 text-[var(--muted)]">
          Sei autenticato ma non esiste una riga in <code>profiles</code> per il
          tuo utente. Crea il profilo (ruolo + unità) dal SQL Editor di Supabase,
          poi ricarica.
        </p>
      </div>
    );
  }

  redirect(dashboardPathForRole(profile.role));
}
