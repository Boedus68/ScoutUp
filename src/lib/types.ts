export type AppRole = "leader" | "member" | "parent";
export type ScoutBranch = "LC" | "EG" | "RS";
export type AttendanceStatus = "present" | "absent" | "justified";

export type Profile = {
  id: string;
  full_name: string;
  role: AppRole;
  unit_id: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Unit = {
  id: string;
  name: string;
  branch: ScoutBranch;
  created_at?: string;
};

export type EventRow = {
  id: string;
  unit_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  description: string | null;
  created_by: string;
  created_at?: string;
};

export type AttendanceRow = {
  id: string;
  event_id: string;
  member_id: string;
  status: AttendanceStatus;
  notes: string | null;
  updated_by: string | null;
  updated_at?: string;
};
