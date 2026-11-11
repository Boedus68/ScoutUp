import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/config";

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase non configurato. Copia .env.local.example in .env.local e inserisci URL e anon key.",
    );
  }
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
