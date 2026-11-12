export type AppRole = "leader" | "member" | "parent";
export type ScoutBranch = "LC" | "EG" | "RS";
export type AttendanceStatus = "present" | "absent" | "justified" | "late";
export type EventType = "meeting" | "overnight" | "camp" | "route" | "council";
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
  role: AppRole;
  active_role: AppRole | null;
  unit_id: string | null;
  subgroup_id: string | null;
  totem: string | null;
  phone: string | null;
  birth_date: string | null;
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

export type NavItem = {
  href: string;
  label: string;
};
