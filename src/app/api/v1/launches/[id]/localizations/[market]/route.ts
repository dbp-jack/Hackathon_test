import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin, currentSellerId } from "@/lib/supabase/admin";
import { getLaunch } from "@/lib/kit";
import { apiError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string; market: string }> };
const Body = z.object({ enabled: z.boolean().optional(), price_cents: z.number().int().positive().optional() });

/** PATCH /launches/{id}/localizations/{market} */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, market } = await params;
  if (!(await getLaunch(id, currentSellerId()))) return apiError(404, "not_found");
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return apiError(400, "invalid_body");
  const { data, error } = await supabaseAdmin().from("listing_localizations").update(parsed.data)
    .eq("launch_id", id).eq("market", market.toUpperCase()).select("*");
  if (error) return apiError(500, "update_failed", error.message);
  return NextResponse.json(data?.[0] ?? null);
}
