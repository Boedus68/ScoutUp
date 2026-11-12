import type {
  AppRole,
  AttendanceStatus,
  AuthorizationStatus,
  ConfirmationStatus,
  EventType,
  PaymentStatus,
  ProgressionKind,
  ProgressionStatus,
  ScoutBranch,
} from "@/lib/types";

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
  late: "Ritardo",
};

export const eventTypeLabel: Record<EventType, string> = {
  meeting: "Riunione / Attività",
  overnight: "Uscita con pernotto",
  camp: "Campo",
  route: "Route",
  council: "Consiglio Capi",
};

export const paymentLabel: Record<PaymentStatus, string> = {
  unpaid: "Non pagata",
  paid: "Pagata",
  waived: "Esente",
};

export const confirmationLabel: Record<ConfirmationStatus, string> = {
  pending: "In attesa",
  attending: "Confermata",
  not_attending: "Non partecipa",
};

export const authorizationLabel: Record<AuthorizationStatus, string> = {
  pending: "Da autorizzare",
  authorized: "Autorizzata",
  revoked: "Revocata",
};

export const eventTypeOptions: EventType[] = [
  "meeting",
  "overnight",
  "camp",
  "route",
  "council",
];

export const progressionKindLabel: Record<ProgressionKind, string> = {
  tappa: "Tappa",
  specialita: "Specialità",
  brevetto: "Brevetto",
  punto_strada: "Punto strada",
};

export const progressionStatusLabel: Record<ProgressionStatus, string> = {
  in_progress: "In corso",
  requested: "Richiesta",
  conquered: "Conquistata",
  rejected: "Rifiutata",
};

export function progressionKindsForBranch(branch: ScoutBranch): ProgressionKind[] {
  switch (branch) {
    case "LC":
      return ["tappa", "specialita"];
    case "EG":
      return ["tappa", "brevetto", "specialita"];
    case "RS":
      return ["punto_strada", "specialita"];
    default:
      return ["tappa", "specialita"];
  }
}

export function progressionPathTitle(branch: ScoutBranch) {
  switch (branch) {
    case "LC":
      return "Sentiero LC";
    case "EG":
      return "Progressione EG";
    case "RS":
      return "Strada RS";
    default:
      return "Progressione";
  }
}

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

export function formatEuro(amount: number | null | undefined) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(amount));
}
