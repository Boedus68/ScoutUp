import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { StaffShell } from "@/components/staff-shell";
import { requireRole } from "@/lib/auth";
import { isCocaUnit, staffUnitId } from "@/lib/staff-unit";
import type { EventRow } from "@/lib/types";
import { updateEventAction } from "../../../actions";
import { DeleteEventButton } from "../../delete-event-button";
import { EventForm } from "../../event-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditEventPage({ params }: PageProps) {
  await connection();
  const { id } = await params;
  const { profile, unit, roles, activeRole, supabase, availableUnits } =
    await requireRole(["leader"]);

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!event) {
    notFound();
  }

  const typed = event as EventRow;
  const coca = isCocaUnit(unit);
  const currentUnit = staffUnitId(profile);
  const sameUnit = typed.unit_id === currentUnit;
  const ownEvent = typed.created_by === profile.id;
  if (!sameUnit && !ownEvent) {
    notFound();
  }

  return (
    <StaffShell
      title={coca ? "Modifica appuntamento" : "Modifica uscita"}
      subtitle={typed.title}
      activeRole={activeRole}
      roles={roles}
      unit={unit}
      availableUnits={availableUnits}
      headerActions={
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/dashboard/staff/events/${typed.id}/presenze`}
            className="text-sm font-medium text-[var(--forest)]"
          >
            Registro
          </Link>
          <Link
            href="/dashboard/staff/calendario"
            className="text-sm font-medium text-[var(--forest)]"
          >
            ← Calendario
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        <EventForm
          action={updateEventAction}
          coca={coca}
          submitLabel="Salva modifiche"
          event={typed}
        />
        <DeleteEventButton eventId={typed.id} />
      </div>
    </StaffShell>
  );
}
