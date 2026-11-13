import Link from "next/link";
import { SetPasswordForm } from "./set-password-form";

export default function ImpostaPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Link
        href="/"
        className="text-sm font-semibold text-[var(--navy)] hover:text-[var(--celeste)]"
      >
        ← Scout-Up
      </Link>
      <h1 className="mt-6 font-display text-3xl tracking-tight">
        Scegli la password
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Hai aperto il link di invito o di recupero. Imposta una password per
        accedere la prossima volta. Non c&apos;è registrazione pubblica.
      </p>
      <div className="mt-8 rounded-xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
        <SetPasswordForm />
      </div>
    </div>
  );
}
