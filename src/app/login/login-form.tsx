"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dashboardPathForRole } from "@/lib/auth-client";
import type { AppRole } from "@/lib/types";

type Mode = "password" | "magic";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();

      if (mode === "magic") {
        const origin = window.location.origin;
        const { error: magicError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${origin}/auth/callback`,
          },
        });
        if (magicError) throw magicError;
        setMessage("Controlla la casella email: ti abbiamo inviato il link di accesso.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Sessione non disponibile dopo il login.");
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = (profile?.role as AppRole | undefined) ?? "member";
      router.push(dashboardPathForRole(role));
      router.refresh();
    } catch (err) {
      const text =
        err instanceof Error ? err.message : "Accesso non riuscito. Riprova.";
      setError(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex gap-2 rounded-md bg-[var(--surface-muted)] p-1">
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
            mode === "password"
              ? "bg-white text-[var(--ink)] shadow-sm"
              : "text-[var(--muted)]"
          }`}
        >
          Email e password
        </button>
        <button
          type="button"
          onClick={() => setMode("magic")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
            mode === "magic"
              ? "bg-white text-[var(--ink)] shadow-sm"
              : "text-[var(--muted)]"
          }`}
        >
          Magic link
        </button>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
        />
      </label>

      {mode === "password" ? (
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 outline-none ring-[var(--ring)] focus:ring-2"
          />
        </label>
      ) : null}

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-[var(--forest)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--forest-deep)] disabled:opacity-60"
      >
        {loading ? "Attendere…" : mode === "magic" ? "Invia magic link" : "Accedi"}
      </button>
    </form>
  );
}
