import { notFound } from "next/navigation";
import { KitView } from "@/components/KitView";
import { currentSellerId } from "@/lib/supabase/admin";
import { getLaunch, buildKit } from "@/lib/kit";

export const dynamic = "force-dynamic";

export default async function LaunchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const launch = await getLaunch(id, currentSellerId());
  if (!launch) notFound();
  const kit = await buildKit(launch);
  return <KitView initial={kit} />;
}
