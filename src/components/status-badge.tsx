import { attendanceLabel } from "@/lib/labels";
import type { AttendanceStatus } from "@/lib/types";

const styles: Record<AttendanceStatus, string> = {
  present: "bg-emerald-100 text-emerald-900",
  absent: "bg-stone-200 text-stone-800",
  justified: "bg-sky-100 text-sky-900",
};

export function StatusBadge({ status }: { status: AttendanceStatus | null }) {
  if (!status) {
    return (
      <span className="inline-flex rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
        Non registrata
      </span>
    );
  }

  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {attendanceLabel[status]}
    </span>
  );
}
