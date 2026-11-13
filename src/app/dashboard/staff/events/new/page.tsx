import Link from "next/link";
import { connection } from "next/server";
import { StaffShell } from "@/components/staff-shell";
import { requireRole } from "@/lib/auth";
import { isCocaUnit } from "@/lib/staff-unit";
import { createEventAction } from "../../actions";
import { EventForm } from "../event-form";

export default async function NewEventPage() {
  await connection();
  const { unit, roles, activeRole, availableUnits } = await requireRole([
    "leader",
  ]);
  const coca = isCocaUnit(unit);

  return (
    <StaffShell
      title={coca ? "Nuovo appuntamento Co.Ca." : "Nuova uscita"}
      subtitle={unit ? unit.name : "Unità"}
      activeRole={activeRole}
      roles={roles}
      unit={unit}
      availableUnits={availableUnits}
      headerActions={
        <Link href="/dashboard/staff/calendario" className="text-sm font-medium text-[var(--forest)]">
          ← Calendario
        </Link>
      }
    >
      <EventForm
        action={createEventAction}
        coca={coca}
        submitLabel={coca ? "Crea e apri registro" : "Crea e apri Presenze"}
      />
    </StaffShell>
  );
}
