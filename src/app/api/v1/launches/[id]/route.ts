import { NextRequest, NextResponse } from "next/server";
import { currentSellerId } from "@/lib/supabase/admin";
import { getLaunch, buildKit } from "@/lib/kit";
import { apiError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

/** GET /launches/{id} — status + progress only. */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const launch = await getLaunch(id, currentSellerId());
  if (!launch) return apiError(404, "not_found");
  const kit = await buildKit(launch);
  return NextResponse.json({
    id: launch.id, status: launch.status, product_title: launch.product_title,
    started_at: launch.started_at, finished_at: launch.finished_at, progress: kit.progress,
  });
}
