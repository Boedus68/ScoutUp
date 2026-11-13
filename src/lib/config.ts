export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  return { url, anonKey };
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseEnv();
  return Boolean(url && anonKey && !url.includes("YOUR_") && !anonKey.includes("YOUR_"));
}

/** Origine pubblica per redirect Auth (invite, recovery). Mai con slash finale. */
export function getPublicAppUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (fromEnv && !fromEnv.includes("YOUR_")) {
    return fromEnv;
  }
  return "https://scout-up.it";
}

export function authCallbackUrl(nextPath: string) {
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${getPublicAppUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}
