import { notFound } from "next/navigation";
import { KitView } from "@/components/KitView";
import { currentSellerId } from "@/lib/supabase/admin";
import { getLaunch, buildKit } from "@/lib/kit";
import { KIT } from "@/lib/i18n-kit";
import { getLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function LaunchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const launch = await getLaunch(id, currentSellerId());
  if (!launch) notFound();
  const kit = await buildKit(launch);
  const locale = await getLocale();
  return <KitView initial={kit} t={KIT[locale]} locale={locale} />;
}
