import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin, currentSellerId } from "@/lib/supabase/admin";
import { getLaunch } from "@/lib/kit";
import { apiError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };
const Body = z.object({
  channels: z.array(z.enum(["shopify", "tiktok", "pinterest", "instagram", "youtube", "etsy"])).min(1),
  video_ids: z.array(z.string().uuid()).optional(),
});

/**
 * POST /launches/{id}/publish — queue publications. 202.
 * MVP: Shopify is the only live connector (see worker/steps/publish.ts); others stay queued → mock.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const launch = await getLaunch(id, currentSellerId());
  if (!launch) return apiError(404, "not_found");
  if (launch.status !== "ready" && launch.status !== "published") return apiError(409, "kit_not_ready");
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return apiError(400, "invalid_body");
  if (parsed.data.channels.includes("etsy")) return apiError(409, "channel_not_available", undefined, "Use /export/etsy.csv");

  const db = supabaseAdmin();
  const rows = parsed.data.channels.map((channel) => ({ launch_id: id, channel, status: "queued" as const, payload: { video_ids: parsed.data.video_ids ?? [] } }));
  const { data, error } = await db.from("publications").upsert(rows, { onConflict: "launch_id,channel" }).select("channel,status");
  if (error) return apiError(500, "publish_failed", error.message);
  return NextResponse.json({ publications: data }, { status: 202 });
}
