import { NextRequest, NextResponse } from "next/server";
import { currentSellerId } from "@/lib/supabase/admin";
import { getLaunch, buildKit } from "@/lib/kit";
import { apiError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

/** GET /launches/{id}/kit — the whole result screen. */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const launch = await getLaunch(id, currentSellerId());
  if (!launch) return apiError(404, "not_found");
  return NextResponse.json(await buildKit(launch));
}
