import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { sortAppRoles } from "@/lib/labels";
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

async function loadLeaderUnits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  serviceUnit: Unit | null,
): Promise<Unit[]> {
  if (!serviceUnit) return [];

  const units: Unit[] = [serviceUnit];

  if (serviceUnit.group_id && serviceUnit.branch !== "COCA") {
    const { data: coca } = await supabase
      .from("units")
      .select("*")
      .eq("group_id", serviceUnit.group_id)
      .eq("branch", "COCA")
      .maybeSingle();
    if (coca) {
      units.push(coca as Unit);
    }
  }

  return units;
}

export async function getSessionProfile() {
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
