import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/** Service-role client for route handlers and the worker. Never ship to the browser. */
export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

export const BUCKET = process.env.SUPABASE_BUCKET ?? "launches";

/** MVP has no auth: every request acts as the demo seller. Swap for auth.getUser() later. */
export function currentSellerId(): string {
  return process.env.DEMO_SELLER_ID ?? "00000000-0000-0000-0000-000000000001";
}

export function publicUrl(path: string | null): string | null {
  if (!path) return null;
  return supabaseAdmin().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
