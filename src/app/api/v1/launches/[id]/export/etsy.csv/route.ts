import { NextRequest } from "next/server";
import { currentSellerId, supabaseAdmin } from "@/lib/supabase/admin";
import { getLaunch, buildKit, etsyCsv } from "@/lib/kit";
import { apiError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

/** GET /launches/{id}/export/etsy.csv — Etsy bulk-upload CSV. */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const launch = await getLaunch(id, currentSellerId());
  if (!launch) return apiError(404, "not_found");
  const kit = await buildKit(launch);
  if (!kit.listing) return apiError(409, "kit_not_ready");
  await supabaseAdmin().from("publications").upsert({ launch_id: id, channel: "etsy", status: "exported_csv" }, { onConflict: "launch_id,channel" });
  return new Response(etsyCsv(kit), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="etsy-${id.slice(0, 8)}.csv"` },
  });
}
