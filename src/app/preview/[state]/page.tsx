import { notFound } from "next/navigation";
import { KitView } from "@/components/KitView";
import { demoKit, type DemoState } from "@/lib/demoKit";
import { KIT } from "@/lib/i18n-kit";
import { getLocale } from "@/lib/i18n-server";

// Design preview of the result screen with sample data. No Supabase or keys needed.
const STATES: DemoState[] = ["building", "ready", "failed"];

export default async function PreviewPage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  if (!STATES.includes(state as DemoState)) notFound();
  const locale = await getLocale();
  return <KitView key={`${state}-${locale}`} initial={demoKit(state as DemoState)} preview={{ elapsed: state === "building" ? 161 : 0 }} t={KIT[locale]} locale={locale} />;
}
