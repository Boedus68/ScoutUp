import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { RoleSwitcher } from "@/components/role-switcher";
import { UnitSwitcher } from "@/components/unit-switcher";
import { SidebarNav } from "@/components/sidebar-nav";
import { navItemsForRole } from "@/lib/nav";
import { roleLabel } from "@/lib/labels";
import type { AppRole, Unit } from "@/lib/types";

type DashboardShellProps = {
  title: string;
  subtitle?: string;
  activeRole: AppRole;
  roles: AppRole[];
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  /** Unità disponibili per lo switcher Capo (servizio + Co.Ca.). */
  availableUnits?: Unit[];
  activeUnitId?: string | null;
  activeBranch?: Unit["branch"] | null;
};

export function DashboardShell({
  title,
  subtitle,
  activeRole,
  roles,
  children,
  headerActions,
  availableUnits = [],
  activeUnitId = null,
  activeBranch = null,
}: DashboardShellProps) {
  const items = navItemsForRole(activeRole, activeBranch);

  return (
    <div className="min-h-full">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col md:flex-row">
        <aside className="shell-aside border-b border-[var(--border)] md:w-64 md:shrink-0 md:border-b-0 md:border-r">
          <div className="flex h-full flex-col gap-6 px-4 py-5">
            <div className="motion-fade">
              <Link href="/" className="group inline-flex items-center gap-2.5">
                <Image
                  src="/images/compass-mark.svg"
                  alt=""
                  width={36}
                  height={36}
                  className="transition duration-300 group-hover:rotate-12"
                />
                <span className="font-display text-xl tracking-tight text-[var(--navy)]">
                  Scout-Up
                </span>
              </Link>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                {roleLabel[activeRole]}
                {activeBranch === "COCA" ? " · Co.Ca." : ""}
              </p>
              <div
                className="uniform-stripe mt-3 h-1 w-full rounded-sm"
                aria-hidden="true"
              />
            </div>

            <SidebarNav items={items} />

            <div className="mt-auto space-y-4 border-t border-[var(--border)] pt-4">
              {activeRole === "leader" && availableUnits.length > 0 ? (
                <UnitSwitcher
                  units={availableUnits}
                  activeUnitId={activeUnitId}
                />
              ) : null}
              <RoleSwitcher roles={roles} activeRole={activeRole} />
              <LogoutButton />
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 py-4 backdrop-blur-sm sm:px-6">
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-45"
              style={{
                background:
                  "radial-gradient(420px 120px at 100% 0%, rgba(106,169,208,0.28), transparent 70%)",
              }}
            />
            <div className="relative flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  {subtitle ?? roleLabel[activeRole]}
                </p>
                <h1 className="font-display text-2xl tracking-tight text-[var(--ink)] sm:text-3xl">
                  {title}
                </h1>
              </div>
              {headerActions}
            </div>
          </header>
          <main className="px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
