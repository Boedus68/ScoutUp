import Image from "next/image";
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
    <div className="min-h-full">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image
                src="/images/compass-mark.svg"
                alt=""
                width={32}
                height={32}
              />
              <span className="font-display text-xl tracking-tight text-[var(--navy)]">
                Scout-Up
              </span>
            </Link>
            <p className="hidden text-sm text-[var(--muted)] sm:block">
              {subtitle ?? title}
            </p>
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
