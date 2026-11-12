import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { RoleSwitcher } from "@/components/role-switcher";
import { SidebarNav } from "@/components/sidebar-nav";
import { navItemsForRole } from "@/lib/nav";
import { roleLabel } from "@/lib/labels";
import type { AppRole } from "@/lib/types";

type DashboardShellProps = {
  title: string;
  subtitle?: string;
  activeRole: AppRole;
  roles: AppRole[];
  children: React.ReactNode;
  headerActions?: React.ReactNode;
};

export function DashboardShell({
  title,
  subtitle,
  activeRole,
  roles,
  children,
  headerActions,
}: DashboardShellProps) {
  const items = navItemsForRole(activeRole);

  return (
    <div className="min-h-full bg-[var(--bg)]">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col md:flex-row">
        <aside className="border-b border-[var(--border)] bg-[var(--surface)] md:w-64 md:shrink-0 md:border-b-0 md:border-r">
          <div className="flex h-full flex-col gap-6 px-4 py-5">
            <div>
              <Link href="/" className="text-lg font-semibold text-[var(--forest)]">
                Scout-Up
              </Link>
              <p className="mt-1 text-xs text-[var(--muted)]">{roleLabel[activeRole]}</p>
            </div>

            <SidebarNav items={items} />

            <div className="mt-auto space-y-4 border-t border-[var(--border)] pt-4">
              <RoleSwitcher roles={roles} activeRole={activeRole} />
              <LogoutButton />
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {subtitle ?? roleLabel[activeRole]}
              </p>
              <h1 className="font-display text-2xl tracking-tight text-[var(--ink)] sm:text-3xl">
                {title}
              </h1>
            </div>
            {headerActions}
          </header>
          <main className="px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
