import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { dashboardPathForRole } from "@/lib/auth-client";
import type { AppRole } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/setup`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, active_role")
          .eq("id", user.id)
          .maybeSingle();
        const role =
          ((profile?.active_role ?? profile?.role) as AppRole | undefined) ??
          "member";
        const destination = next?.startsWith("/") ? next : dashboardPathForRole(role);
        return NextResponse.redirect(`${origin}${destination}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
