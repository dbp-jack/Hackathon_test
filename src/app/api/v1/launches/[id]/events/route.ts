import { NextRequest } from "next/server";
import { supabaseAdmin, currentSellerId } from "@/lib/supabase/admin";
import { getLaunch, buildKit } from "@/lib/kit";
import { PIPELINE_STEPS, type ClaudeActionRow } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel: longest allowed function run (s)
const MAX_STREAM_MS = 20 * 60 * 1000; // stop polling after 20 min so an abandoned tab never leaves a zombie stream

/**
 * GET /launches/{id}/events — Server-Sent Events.
 * Polls claude_actions every second and emits one `step` event per new row,
 * carrying the partial kit so the result screen fills in card by card.
 * Ends with `done` (ready/published) or `error` (failed).
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const sellerId = currentSellerId();
  const launch = await getLaunch(id, sellerId);
  if (!launch) return new Response("not found", { status: 404 });

  const enc = new TextEncoder();
  let lastActionId = 0;
  let closed = false;
  const startedAt = Date.now();
  req.signal.addEventListener("abort", () => { closed = true; });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      while (!closed) {
        const db = supabaseAdmin();
        const { data: actions } = await db.from("claude_actions").select("*").eq("launch_id", id).gt("id", lastActionId).order("id");
        const fresh = (actions ?? []) as ClaudeActionRow[];
        const current = await getLaunch(id, sellerId);
        if (!current) break;

        if (fresh.length) {
          const kit = await buildKit(current);
          for (const a of fresh) {
            lastActionId = a.id;
            send("step", {
              step: a.step, summary: a.summary, metrics: a.metrics,
              pct: PIPELINE_STEPS.find((s) => s.step === a.step)?.pct ?? 0,
              partial: { listing: kit.listing, frames: kit.frames, videos: kit.videos, localizations: kit.localizations, social: kit.social },
            });
          }
        }
        if (current.status === "ready" || current.status === "published") {
          send("done", { status: current.status, build_seconds: current.build_seconds, minutes_saved_est: current.minutes_saved_est });
          break;
        }
        if (current.status === "failed") { send("error", { message: current.error_message }); break; }
        if (Date.now() - startedAt > MAX_STREAM_MS) { send("error", { message: "stream timed out — reload to reconnect" }); break; }
        controller.enqueue(enc.encode(": keepalive\n\n"));
        await new Promise((r) => setTimeout(r, 1000));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
