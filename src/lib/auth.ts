import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
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

  const roles = (memberships ?? []).map((row) => row.role as AppRole);
  if (profile && roles.length === 0) {
    roles.push(profile.role as AppRole);
  }

  let unit: Unit | null = null;
  if (profile?.unit_id) {
    const { data } = await supabase
      .from("units")
      .select("*")
      .eq("id", profile.unit_id)
      .maybeSingle();
    unit = data as Unit | null;
  }

  return {
    user,
    profile: profile as Profile | null,
    unit,
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
