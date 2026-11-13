import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { sortAppRoles } from "@/lib/labels";
import { buildRoleContextLabel } from "@/lib/role-context-label";
import { staffUnitId } from "@/lib/staff-unit";
import type { AppRole, Profile, Unit } from "@/lib/types";

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

export function effectiveRole(profile: Profile): AppRole {
  return profile.active_role ?? profile.role;
}

export async function requireConfiguredSupabase() {
  if (!isSupabaseConfigured()) {
    redirect("/setup");
  }
}

const leaderBranchOrder = ["LC", "EG", "RS", "COCA"] as const;

async function loadLeaderUnits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  serviceUnit: Unit | null,
): Promise<Unit[]> {
  if (!serviceUnit) return [];

  if (!serviceUnit.group_id) {
    return [serviceUnit];
  }

  // Tutte le unità del gruppo (LC / EG / RS / COCA). RLS: same_unit estesa ai
  // leader del gruppo; COCA resta nascosta a member/parent.
  const { data } = await supabase
    .from("units")
    .select("*")
    .eq("group_id", serviceUnit.group_id);

  const units = (data ?? []) as Unit[];
  if (units.length === 0) {
    return [serviceUnit];
  }

  return [...units].sort((a, b) => {
    const ia = leaderBranchOrder.indexOf(
      a.branch as (typeof leaderBranchOrder)[number],
    );
    const ib = leaderBranchOrder.indexOf(
      b.branch as (typeof leaderBranchOrder)[number],
    );
    const da = ia === -1 ? 99 : ia;
    const db = ib === -1 ? 99 : ib;
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name, "it");
  });
}

async function loadSessionProfile() {
  await requireConfiguredSupabase();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      profile: null,
      unit: null,
      serviceUnit: null,
      availableUnits: [] as Unit[],
      roles: [] as AppRole[],
      supabase,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data: memberships } = await supabase
    .from("role_memberships")
    .select("role")
    .eq("user_id", user.id);

  const typedProfile = profile as Profile | null;

  // Union memberships + ruolo primario (così "member"/Ragazzo non sparisce
  // se manca solo la sync su role_memberships, e l'ordine resta stabile).
  const roles = sortAppRoles([
    ...((memberships ?? []).map((row) => row.role as AppRole)),
    ...(typedProfile ? [typedProfile.role as AppRole] : []),
  ]);

  let serviceUnit: Unit | null = null;
  if (typedProfile?.unit_id) {
    const { data } = await supabase
      .from("units")
      .select("*")
      .eq("id", typedProfile.unit_id)
      .maybeSingle();
    serviceUnit = data as Unit | null;
  }

  const availableUnits =
    typedProfile && roles.includes("leader")
      ? await loadLeaderUnits(supabase, serviceUnit)
      : serviceUnit
        ? [serviceUnit]
        : [];

  const activeId = typedProfile ? staffUnitId(typedProfile) : null;
  let unit: Unit | null =
    availableUnits.find((u) => u.id === activeId) ?? serviceUnit;

  // Se active_unit_id punta a un'unità non più accessibile, ricadi sul servizio.
  if (
    typedProfile?.active_unit_id &&
    !availableUnits.some((u) => u.id === typedProfile.active_unit_id)
  ) {
    unit = serviceUnit;
  }

  return {
    user,
    profile: typedProfile,
    unit,
    serviceUnit,
    availableUnits,
    roles,
    supabase,
  };
}

/** Dedup per request: shell + pagine condividono la stessa sessione. */
export const getSessionProfile = cache(loadSessionProfile);

/** Nome profilo + etichetta ruolo contestuale per la sidebar. */
export async function getSidebarIdentity(activeRole: AppRole) {
  const { profile, unit, supabase } = await getSessionProfile();
  if (!profile) {
    return { profileName: null as string | null, roleContextLabel: null as string | null };
  }

  let subgroupName: string | null = null;
  if (profile.subgroup_id) {
    const { data } = await supabase
      .from("subgroups")
      .select("name")
      .eq("id", profile.subgroup_id)
      .maybeSingle();
    subgroupName = (data?.name as string | undefined) ?? null;
  }

  let childNames: string[] = [];
  if (activeRole === "parent") {
    const { data: links } = await supabase
      .from("parent_child")
      .select("child_id")
      .eq("parent_id", profile.id);
    const childIds = (links ?? []).map((l) => l.child_id as string);
    if (childIds.length > 0) {
      const { data: children } = await supabase
        .from("profiles")
        .select("full_name")
        .in("id", childIds)
        .order("full_name");
      childNames = (children ?? []).map((c) => c.full_name as string);
    }
  }

  const roleContextLabel = buildRoleContextLabel({
    activeRole,
    gender: profile.gender ?? null,
    groupRole: profile.group_role ?? null,
    branch: unit?.branch ?? null,
    unitName: unit?.name ?? null,
    subgroupName,
    childNames,
  });

  return {
    profileName: profile.full_name,
    roleContextLabel,
  };
}

export async function requireUser() {
  const session = await getSessionProfile();
  if (!session.user) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(allowed: AppRole[]) {
  const session = await requireUser();
  if (!session.profile) {
    redirect("/dashboard");
  }

  const active = effectiveRole(session.profile);
  const canAct =
    allowed.includes(active) &&
    (session.roles.includes(active) || session.profile.role === active);

  if (!canAct) {
    redirect(dashboardPathForRole(active));
  }

  return {
    ...session,
    profile: session.profile,
    activeRole: active,
  };
}
