import type { AppRole } from "@/lib/types";

export function dashboardPathForRole(role: AppRole) {
  switch (role) {
    case "leader":
      return "/dashboard/staff";
    case "parent":
      return "/dashboard/parent";
    case "member":
      return "/dashboard/member";
    default:
      return "/dashboard";
  }
}
