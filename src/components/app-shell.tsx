import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  nav?: React.ReactNode;
};

export function AppShell({ title, subtitle, children, nav }: AppShellProps) {
  return (
    <div className="min-h-full bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <Link href="/" className="text-lg font-semibold tracking-tight text-[var(--forest)]">
              Scout-Up
            </Link>
            <p className="mt-0.5 text-sm text-[var(--muted)]">{subtitle ?? title}</p>
          </div>
          <div className="flex items-center gap-3">
            {nav}
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
          {title}
        </h1>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
