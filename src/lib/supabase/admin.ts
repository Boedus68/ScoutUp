import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/config";

/**
 * Client service-role solo server-side (invite Auth, admin).
 * Mai importare da Client Components. Restituisce null se la key non è configurata.
 */
export function createAdminClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey || serviceKey.includes("YOUR_")) return null;

  const { url } = getSupabaseEnv();
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function hasServiceRoleKey(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(key && !key.includes("YOUR_"));
}
