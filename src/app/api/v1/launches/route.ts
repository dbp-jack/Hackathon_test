import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin, currentSellerId } from "@/lib/supabase/admin";
import { apiError } from "@/lib/api";

const Body = z.object({
  media_ids: z.array(z.string().uuid()).min(1),
  hints: z.object({
    product_name: z.string().optional(),
    materials: z.string().optional(),
    price_cents: z.number().int().positive().optional(),
    ships_from: z.object({ city: z.string().optional(), country: z.string().length(2).optional() }).optional(),
  }).optional(),
  target_channels: z.array(z.enum(["etsy", "shopify", "tiktok", "pinterest", "instagram", "youtube"])).default(["etsy", "shopify", "tiktok"]),
  markets: z.array(z.string().length(2)).default(["GB", "DE", "AU", "CA"]),
});

/** POST /launches — spend 1 credit, adopt uploads, queue the pipeline. 202. */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return apiError(400, "invalid_body", parsed.error.message);
  const db = supabaseAdmin();
  const sellerId = currentSellerId();

  const { data: seller } = await db.from("sellers").select("credits_remaining, plan").eq("id", sellerId).single();
  if (!seller) return apiError(401, "no_seller", "Run supabase/seed.sql");
  if (seller.credits_remaining < 1) return apiError(402, "insufficient_credits");

  if (seller.plan !== "studio") {
    const { count } = await db.from("launches").select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId).in("status", ["analyzing", "writing", "rendering"]);
    if ((count ?? 0) > 0) return apiError(409, "launch_already_running", "One launch at a time on this plan");
  }

  const { data: staged } = await db.from("staged_media").select("*").in("id", parsed.data.media_ids).eq("seller_id", sellerId);
  if (!staged || staged.length !== parsed.data.media_ids.length) return apiError(400, "unknown_media");

  const h = parsed.data.hints;
  const { data: launch, error } = await db.from("launches").insert({
    seller_id: sellerId, status: "uploaded",
    product_name_hint: h?.product_name ?? null, materials_hint: h?.materials ?? null,
    price_hint_cents: h?.price_cents ?? null, target_channels: parsed.data.target_channels,
  }).select("*").single();
  if (error || !launch) return apiError(500, "create_failed", error?.message);

  await db.from("source_media").insert(staged.map((s) => ({
    launch_id: launch.id, kind: s.kind, storage_path: s.storage_path, original_name: s.original_name,
  })));
  await db.from("staged_media").delete().in("id", parsed.data.media_ids);
  await db.from("launch_markets").insert(parsed.data.markets.map((m) => ({ launch_id: launch.id, market: m })));

  await db.from("sellers").update({ credits_remaining: seller.credits_remaining - 1 }).eq("id", sellerId);
  await db.from("credit_ledger").insert({ seller_id: sellerId, launch_id: launch.id, delta: -1, reason: "launch" });

  return NextResponse.json({ launch_id: launch.id, status: "analyzing", credits_remaining: seller.credits_remaining - 1, eta_seconds: 300 }, { status: 202 });
}

/** GET /launches?status=&limit=&cursor= — My launches. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Number(sp.get("limit") ?? 20), 50);
  let q = supabaseAdmin().from("launches").select("id,status,product_title,build_seconds,minutes_saved_est,created_at,finished_at")
    .eq("seller_id", currentSellerId()).order("created_at", { ascending: false }).limit(limit + 1);
  if (sp.get("status")) q = q.eq("status", sp.get("status"));
  if (sp.get("cursor")) q = q.lt("created_at", sp.get("cursor"));
  const { data } = await q;
  const items = (data ?? []).slice(0, limit);
  const next_cursor = (data?.length ?? 0) > limit ? items.at(-1)?.created_at ?? null : null;
  return NextResponse.json({ items, next_cursor });
}
