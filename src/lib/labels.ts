import type { AppRole, AttendanceStatus, ScoutBranch } from "@/lib/types";

export const roleLabel: Record<AppRole, string> = {
  leader: "Capo / Staff",
  member: "Ragazzo / Ragazza",
  parent: "Genitore",
};

export const branchLabel: Record<ScoutBranch, string> = {
  LC: "LC — Lupetti / Coccinelle",
  EG: "EG — Esploratori / Guide",
  RS: "RS — Rover / Scolte",
};

export const attendanceLabel: Record<AttendanceStatus, string> = {
  present: "Presente",
  absent: "Assente",
  justified: "Giustificato",
};

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
  }).format(new Date(iso));
}
