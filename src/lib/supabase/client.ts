"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;
/** Browser client (anon key) — only used for direct-to-Storage uploads. Lazy so prerendering never touches it. */
export function supabaseBrowser(): SupabaseClient {
  if (!cached) cached = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return cached;
}
