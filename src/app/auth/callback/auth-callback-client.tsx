"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dashboardPathForRole } from "@/lib/auth-client";
import type { AppRole } from "@/lib/types";
import type { EmailOtpType } from "@supabase/supabase-js";

const passwordTypes = new Set(["invite", "recovery", "signup"]);

const otpTypes = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function asOtpType(value: string | null): EmailOtpType | null {
  if (value && otpTypes.has(value as EmailOtpType)) {
    return value as EmailOtpType;
  }
  return null;
}

export function AuthCallbackClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const queryType = asOtpType(url.searchParams.get("type"));
      const nextParam = url.searchParams.get("next");
      const errorDesc =
        url.searchParams.get("error_description") ||
        url.searchParams.get("error");

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const hashType = asOtpType(hash.get("type"));
      const hashError = hash.get("error_description") || hash.get("error");

      if (errorDesc || hashError) {
        throw new Error(errorDesc || hashError || "Link non valido.");
      }

      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) throw exErr;
      } else if (tokenHash && queryType) {
        const { error: otpErr } = await supabase.auth.verifyOtp({
          type: queryType,
          token_hash: tokenHash,
        });
        if (otpErr) throw otpErr;
      } else if (accessToken && refreshToken) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (setErr) throw setErr;
      } else {
        throw new Error(
          "Link di accesso incompleto. Apri di nuovo il messaggio email.",
        );
      }

      const authType = hashType || queryType;
      const needsPassword =
        (authType ? passwordTypes.has(authType) : false) ||
        nextParam === "/imposta-password";

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Sessione non disponibile dopo il link.");
      }

      if (needsPassword) {
        router.replace("/imposta-password");
        router.refresh();
        return;
      }

      if (nextParam?.startsWith("/")) {
        router.replace(nextParam);
        router.refresh();
        return;
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
    }

    run().catch((err) => {
      if (cancelled) return;
      const text =
        err instanceof Error ? err.message : "Accesso dal link non riuscito.";
      setError(text);
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-2xl">Link non valido</h1>
        <p className="mt-3 text-sm text-red-800">{error}</p>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Richiedi un nuovo invito o usa «Password dimenticata» su Accedi. Non
          c&apos;è registrazione pubblica: solo chi è stato invitato può
          entrare.
        </p>
        <a
          href="/login"
          className="mt-6 inline-flex rounded-md bg-[var(--navy)] px-4 py-2 text-sm font-semibold text-white"
        >
          Vai ad Accedi
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-2xl">Accesso in corso…</h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Stiamo confermando il link. Un attimo.
      </p>
    </div>
  );
}
