import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin, currentSellerId } from "@/lib/supabase/admin";
import { getLaunch } from "@/lib/kit";
import { apiError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string; frameId: string }> };

const Put = z.object({ frame_id: z.string().uuid() });

/** PUT /launches/{id}/frames/{frameId} — confirm a candidate; it takes over the slot. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id, frameId } = await params;
  if (!(await getLaunch(id, currentSellerId()))) return apiError(404, "not_found");
  const parsed = Put.safeParse(await req.json());
  if (!parsed.success) return apiError(400, "invalid_body");
  const db = supabaseAdmin();
  const { data: old } = await db.from("frames").select("sort_order").eq("id", frameId).single();
  await db.from("frames").update({ selected: false }).eq("id", frameId);
  await db.from("frames").update({ selected: true, sort_order: old?.sort_order ?? 0 }).eq("id", parsed.data.frame_id);
  return NextResponse.json({ ok: true });
}
