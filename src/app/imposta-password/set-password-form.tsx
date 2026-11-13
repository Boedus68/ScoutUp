"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dashboardPathForRole } from "@/lib/auth-client";
import type { AppRole } from "@/lib/types";

export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La password deve avere almeno 8 caratteri.");
      return;
    }
    if (password !== confirm) {
      setError("Le due password non coincidono.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Sessione scaduta. Apri di nuovo il link nell'email.");
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, active_role")
        .eq("id", user.id)
        .maybeSingle();
      const role =
        ((profile?.active_role ?? profile?.role) as AppRole | undefined) ??
        "member";
      router.replace(dashboardPathForRole(role));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossibile salvare la password.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Nuova password</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Conferma password</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
        />
      </label>
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-[var(--navy)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--navy-deep)] disabled:opacity-60"
      >
        {loading ? "Salvataggio…" : "Salva ed entra"}
      </button>
    </form>
  );
}
