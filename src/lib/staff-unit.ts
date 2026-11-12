import type { Profile, ScoutBranch, Unit } from "@/lib/types";

/** Unità attiva in UI Capo: Co.Ca. o unità di servizio. */
export function staffUnitId(profile: Profile): string | null {
  return profile.active_unit_id ?? profile.unit_id;
}

export function isCocaUnit(unit: Unit | null | undefined): boolean {
  return unit?.branch === "COCA";
}

export function isCocaBranch(branch: ScoutBranch | null | undefined): boolean {
  return branch === "COCA";
}
