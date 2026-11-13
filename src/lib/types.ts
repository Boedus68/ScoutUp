export type AppRole = "leader" | "member" | "parent";
export type ScoutBranch = "LC" | "EG" | "RS" | "COCA";
/** Sesso anagrafico opzionale (etichette UI). */
export type ProfileGender = "M" | "F";
export type CocaGroupRole =
  | "capo_gruppo"
  | "tesoriere"
  | "segretario"
  | "cambusiere"
  | "maestro_novizi"
  | "capo_unita"
  | "capo_a_disposizione";
/** Incarico in branca (non Co.Ca.). */
export type BranchOfficeKind = "capo_branca" | "aiuto_capo_branca";
/** Branca di servizio L/C E/G R/S (senza Co.Ca.). */
export type YouthBranch = "LC" | "EG" | "RS";
export type AttendanceStatus = "present" | "absent" | "justified" | "late";
export type EventType =
  | "meeting"
  | "overnight"
  | "camp"
  | "route"
  | "council"
  | "formation";
export type PaymentStatus = "unpaid" | "paid" | "waived";
export type ConfirmationStatus = "pending" | "attending" | "not_attending";
export type AuthorizationStatus = "pending" | "authorized" | "revoked";

export type Group = {
  id: string;
  name: string;
  city: string | null;
  created_at?: string;
};

export type Unit = {
  id: string;
  name: string;
  branch: ScoutBranch;
  group_id: string | null;
  association_year: string | null;
  created_at?: string;
};

export type Subgroup = {
  id: string;
  unit_id: string;
  name: string;
  created_at?: string;
};

export type Profile = {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  role: AppRole;
  active_role: AppRole | null;
  unit_id: string | null;
  /** Contesto UI Capo: unità di servizio o Co.Ca. del gruppo. */
  active_unit_id: string | null;
  subgroup_id: string | null;
  totem: string | null;
  phone: string | null;
  birth_date: string | null;
  /** Sesso anagrafico opzionale (lupetto/lupetta, padre/madre, …). */
  gender: ProfileGender | null;
  /** Incarico in Comunità Capi / Gruppo. */
  group_role: CocaGroupRole | null;
  /** Capo branca o Aiuto capo branca. */
  branch_office: BranchOfficeKind | null;
  /** Branca assegnata (LC / EG / RS). Null = Nessuno. */
  assigned_branch: YouthBranch | null;
  created_at?: string;
  updated_at?: string;
};

export type EventRow = {
  id: string;
  unit_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  description: string | null;
  event_type: EventType;
  fee_amount: number | null;
  equipment_list: string | null;
  created_by: string;
  created_at?: string;
};

export type AttendanceRow = {
  id: string;
  event_id: string;
  member_id: string;
  status: AttendanceStatus;
  notes: string | null;
  payment_status: PaymentStatus;
  updated_by: string | null;
  updated_at?: string;
};

export type MedicalRecord = {
  member_id: string;
  food_allergies: string | null;
  drug_allergies: string | null;
  intolerances: string | null;
  ongoing_therapy: string | null;
  health_card_number: string | null;
  blood_type: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  criticality_flag: boolean;
  criticality_notes: string | null;
  updated_by?: string | null;
  updated_at?: string;
};

export type ProgressionKind = "tappa" | "specialita" | "brevetto" | "punto_strada";
export type ProgressionStatus =
  | "in_progress"
  | "requested"
  | "conquered"
  | "rejected";

export type ProgressionCatalogItem = {
  id: string;
  branch: ScoutBranch;
  kind: ProgressionKind;
  code: string | null;
  title: string;
  description: string | null;
  sort_order: number;
};

export type ProgressionItem = {
  id: string;
  member_id: string;
  catalog_id: string | null;
  branch: ScoutBranch;
  kind: ProgressionKind;
  title: string;
  status: ProgressionStatus;
  staff_comment: string | null;
  requested_at: string | null;
  decided_at: string | null;
  decided_by: string | null;
  assigned_by: string | null;
  held_at: string | null;
  location: string | null;
};

export type StaffNote = {
  id: string;
  member_id: string;
  author_id: string;
  body: string;
  created_at?: string;
};

export type AnnouncementAudience = "unit" | "subgroup" | "parents";

export type Announcement = {
  id: string;
  unit_id: string;
  subgroup_id: string | null;
  audience: AnnouncementAudience;
  title: string;
  body: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
};

export type AnnouncementAck = {
  announcement_id: string;
  user_id: string;
  acknowledged_at: string;
};

export type Material = {
  id: string;
  unit_id: string;
  title: string;
  description: string | null;
  file_url: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
};

export type FeeStatus = "unpaid" | "paid" | "waived";

export type AnnualFee = {
  id: string;
  unit_id: string;
  member_id: string;
  title: string;
  amount: number;
  due_date: string | null;
  status: FeeStatus;
  notes: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
};

export type CashEntryKind = "expense" | "reimbursement" | "income";

export type CashEntry = {
  id: string;
  unit_id: string;
  kind: CashEntryKind;
  title: string;
  amount: number;
  receipt_url: string | null;
  member_id: string | null;
  notes: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
};

export type NavItem = {
  href: string;
  label: string;
};
