import { NextResponse } from "next/server";
import { supabaseAdmin, currentSellerId } from "@/lib/supabase/admin";

export async function GET() {
  const db = supabaseAdmin();
  const sellerId = currentSellerId();
  const [{ data: seller }, { data: channels }] = await Promise.all([
    db.from("sellers").select("shop_name,plan,credits_remaining,credits_reset_at").eq("id", sellerId).maybeSingle(),
    db.from("seller_channels").select("channel,display_name").eq("seller_id", sellerId),
  ]);
  return NextResponse.json({ ...(seller ?? {}), channels: channels ?? [] });
}
