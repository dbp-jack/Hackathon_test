import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin, currentSellerId } from "@/lib/supabase/admin";
import { getLaunch, buildKit } from "@/lib/kit";
import { apiError, LIMITS } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };
const Body = z.object({
  title: z.string().min(1).max(LIMITS.titleMax, "title_too_long").optional(),
  tags: z.array(z.string().min(1).max(20)).max(LIMITS.tagsMax, "too_many_tags").optional(),
  description: z.string().min(1).optional(),
  price_cents: z.number().int().positive().optional(),
});

/** PATCH /launches/{id}/listing — seller edits. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const launch = await getLaunch(id, currentSellerId());
  if (!launch) return apiError(404, "not_found");
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue.message, max: issue.path[0] === "title" ? LIMITS.titleMax : LIMITS.tagsMax }, { status: 422 });
  }
  const { error } = await supabaseAdmin().from("listings").update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("launch_id", id);
  if (error) return apiError(500, "update_failed", error.message);
  return NextResponse.json((await buildKit(launch)).listing);
}
