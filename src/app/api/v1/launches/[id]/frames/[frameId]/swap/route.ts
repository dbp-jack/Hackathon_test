import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, currentSellerId, publicUrl } from "@/lib/supabase/admin";
import { getLaunch } from "@/lib/kit";
import { apiError } from "@/lib/api";
import type { FrameRow } from "@/lib/types";

type Ctx = { params: Promise<{ id: string; frameId: string }> };

/**
 * POST /launches/{id}/frames/{frameId}/swap — candidates for the same role.
 * The worker stores runner-up frames with selected=false; we surface the next 3.
 */
export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id, frameId } = await params;
  if (!(await getLaunch(id, currentSellerId()))) return apiError(404, "not_found");
  const db = supabaseAdmin();
  const { data: current } = await db.from("frames").select("*").eq("id", frameId).eq("launch_id", id).maybeSingle();
  if (!current) return apiError(404, "frame_not_found");
  const { data } = await db.from("frames").select("*").eq("launch_id", id).eq("role", (current as FrameRow).role)
    .eq("selected", false).order("score", { ascending: false }).limit(3);
  return NextResponse.json({
    candidates: ((data ?? []) as FrameRow[]).map((f) => ({ frame_id: f.id, timecode_sec: f.timecode_sec, score: f.score, thumb_url: publicUrl(f.storage_path_raw) })),
  });
}
