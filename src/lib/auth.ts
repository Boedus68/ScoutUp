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
    return { user: null, profile: null, unit: null, supabase };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

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
  if (!session.profile || !allowed.includes(session.profile.role)) {
    redirect(dashboardPathForRole(session.profile?.role ?? "member"));
  }
  return {
    ...session,
    profile: session.profile,
  };
}
