import { DashboardShell } from "@/components/dashboard-shell";
import type { AppRole, Unit } from "@/lib/types";

type StaffShellProps = {
  title: string;
  subtitle?: string;
  activeRole: AppRole;
  roles: AppRole[];
  unit: Unit | null;
  availableUnits: Unit[];
  children: React.ReactNode;
  headerActions?: React.ReactNode;
};

/** Shell Capo con switcher unità (servizio ↔ Co.Ca.). */
export function StaffShell({
  title,
  subtitle,
  activeRole,
  roles,
  unit,
  availableUnits,
  children,
  headerActions,
}: StaffShellProps) {
  return (
    <DashboardShell
      title={title}
      subtitle={subtitle}
      activeRole={activeRole}
      roles={roles}
      availableUnits={availableUnits}
      activeUnitId={unit?.id ?? null}
      activeBranch={unit?.branch ?? null}
      headerActions={headerActions}
    >
      {children}
    </DashboardShell>
  );
}
