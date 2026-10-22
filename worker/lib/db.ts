import { createClient } from "@supabase/supabase-js";
import type { ClaudeStep } from "../../src/lib/types";

export const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
export const BUCKET = process.env.SUPABASE_BUCKET ?? "launches";

export async function setStatus(launchId: string, status: string, extra: Record<string, unknown> = {}) {
  await db.from("launches").update({ status, ...extra }).eq("id", launchId);
}

/** One row per Claude step — feeds the SSE stream and the "What Claude did" strip. */
export async function logAction(launchId: string, step: ClaudeStep, summary: string, opts: {
  metrics?: Record<string, unknown>; model?: string; input_tokens?: number; output_tokens?: number; cost_cents?: number; started_at?: Date;
} = {}) {
  await db.from("claude_actions").insert({
    launch_id: launchId, step, summary, metrics: opts.metrics ?? null, model: opts.model ?? null,
    input_tokens: opts.input_tokens ?? null, output_tokens: opts.output_tokens ?? null, cost_cents: opts.cost_cents ?? null,
    started_at: (opts.started_at ?? new Date()).toISOString(), finished_at: new Date().toISOString(),
  });
}

export async function upload(path: string, body: Buffer, contentType: string) {
  const { error } = await db.storage.from(BUCKET).upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(`upload ${path}: ${error.message}`);
  return path;
}

export async function download(path: string): Promise<Buffer> {
  const { data, error } = await db.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`download ${path}: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}
