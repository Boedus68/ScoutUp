import type {
  AnnouncementAudience,
  AppRole,
  AttendanceStatus,
  AuthorizationStatus,
  CashEntryKind,
  BranchOfficeKind,
  CocaGroupRole,
  YouthBranch,
  ConfirmationStatus,
  EventType,
  FeeStatus,
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

/** Etichette corte per lo switcher di contesto. */
export const roleSwitcherLabel: Record<AppRole, string> = {
  leader: "Capo",
  member: "Ragazzo",
  parent: "Genitore",
};

/** Ordine stabile nello switcher: Capo → Ragazzo → Genitore. */
export const appRoleOrder: AppRole[] = ["leader", "member", "parent"];

export function sortAppRoles(roles: AppRole[]): AppRole[] {
  const unique = [...new Set(roles)];
  return appRoleOrder.filter((role) => unique.includes(role));
}

export const branchLabel: Record<ScoutBranch, string> = {
  LC: "LC — Lupetti / Coccinelle",
  EG: "EG — Esploratori / Guide",
  RS: "RS — Rover / Scolte",
  COCA: "Co.Ca. — Comunità Capi",
};

/** Etichetta corta per sidebar / chip (LC · EG · RS · Co.Ca.). */
export const branchShortLabel: Record<ScoutBranch, string> = {
  LC: "LC",
  EG: "EG",
  RS: "RS",
  COCA: "Co.Ca.",
};

export const groupRoleLabel: Record<CocaGroupRole, string> = {
  capo_gruppo: "Capo Gruppo",
  tesoriere: "Tesoriere",
  segretario: "Segretario",
  cambusiere: "Cambusiere",
  maestro_novizi: "Maestro dei Novizi",
  capo_unita: "Capo Unità",
  capo_a_disposizione: "Capo a disposizione",
};

/** Ordine select incarichi Co.Ca. */
export const groupRoleOptions: CocaGroupRole[] = [
  "capo_gruppo",
  "capo_unita",
  "tesoriere",
  "segretario",
  "cambusiere",
  "maestro_novizi",
  "capo_a_disposizione",
];

export const branchOfficeLabel: Record<BranchOfficeKind, string> = {
  capo_branca: "Capo branca",
  aiuto_capo_branca: "Aiuto capo branca",
};

export const branchOfficeOptions: BranchOfficeKind[] = [
  "capo_branca",
  "aiuto_capo_branca",
];

export const youthBranchLabel: Record<YouthBranch, string> = {
  LC: "L/C",
  EG: "E/G",
  RS: "R/S",
};

export const youthBranchOptions: YouthBranch[] = ["LC", "EG", "RS"];

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
  council: "Consiglio di Gruppo",
  formation: "Formazione",
};

/** Etichette tipiche in contesto Comunità Capi. */
export const cocaEventTypeLabel: Record<EventType, string> = {
  meeting: "Riunione di Co.Ca.",
  overnight: "Uscita di Co.Ca.",
  camp: "Campo / attività Co.Ca.",
  route: "Uscita di Co.Ca.",
  council: "Consiglio di Gruppo",
  formation: "Formazione",
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
  "formation",
];

export const cocaEventTypeOptions: EventType[] = [
  "meeting",
  "overnight",
  "council",
  "formation",
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
    case "COCA":
      return ["tappa"];
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
    case "COCA":
      return "Iter Formativo Capi";
    default:
      return "Progressione";
  }
}

export const announcementAudienceLabel: Record<AnnouncementAudience, string> = {
  unit: "Tutta l'unità",
  subgroup: "Sottogruppo",
  parents: "Solo genitori",
};

export const feeStatusLabel: Record<FeeStatus, string> = {
  unpaid: "Da pagare",
  paid: "Pagata",
  waived: "Esente",
};

export const cashEntryKindLabel: Record<CashEntryKind, string> = {
  expense: "Spesa",
  reimbursement: "Rimborso",
  income: "Entrata",
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

export function formatEuro(amount: number | null | undefined) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(amount));
}
