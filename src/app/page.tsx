import Link from "next/link";
import { Dropzone } from "@/components/Dropzone";
import { OutputExample } from "@/components/OutputExample";
import { OUTPUTS, PLANS } from "@/lib/types";
import { MESSAGES, fmt, type OutputKey } from "@/lib/i18n";
import { EXAMPLE } from "@/lib/i18n-example";
import { getLocale } from "@/lib/i18n-server";

const TILE: Record<string, string> = {
  butter: "bg-butter text-ink [&_.sub]:text-butter-ink",
  blue: "bg-blue text-white [&_.sub]:text-white/90",
  ink: "bg-ink text-white [&_.sub]:text-white/85",
  mint: "bg-mint text-ink [&_.sub]:text-mint-ink",
  lilac: "bg-lilac text-ink [&_.sub]:text-lilac-ink",
  blush: "bg-blush text-ink [&_.sub]:text-blush-ink",
};
const SPAN: Record<string, string> = { listing: "sm:col-span-2 lg:col-span-3", photos: "lg:col-span-2", shorts: "lg:col-span-3", markets: "lg:col-span-2", publish: "lg:col-span-2" };
// Outputs that only the Studio plan includes, by the plan feature that unlocks them
const NEEDS: Partial<Record<string, string>> = { markets: "localization", publish: "auto_publish" };
// What Claude itself does, in pipeline order, marked with the color of the output it makes
const CLAUDE = [
  { key: "photos", color: "bg-blue" }, { key: "listing", color: "bg-butter" },
  { key: "shorts", color: "bg-ink" }, { key: "markets", color: "bg-mint" },
] as const;

export default async function UploadPage() {
  const locale = await getLocale();
  const t = MESSAGES[locale];
  const total = OUTPUTS.reduce((s, o) => s + o.minutes, 0);
  const has = (p: (typeof PLANS)[number], f: string) => (p.features as readonly string[]).includes(f);
  const studioOnly = (f?: string) => !!f && PLANS.every((p) => has(p, f) === (p.tier === "studio"));
  const rows: { label: string; note?: string; values: (string | boolean)[] }[] = [
    { label: t.plans.launchesRow, values: PLANS.map((p) => p.launches_per_month ? String(p.launches_per_month) : t.plans.unlimitedShort) },
    { label: [t.outputs.listing[0], t.outputs.photos[0], t.outputs.shorts[0]].join(" · "), values: PLANS.map(() => true) },
    { label: t.plans.noWatermark, values: PLANS.map((p) => !has(p, "watermark")) },
    { label: t.outputs.markets[0], note: t.outputs.markets[1], values: PLANS.map((p) => has(p, "localization")) },
    { label: t.plans.autoPublish, values: PLANS.map((p) => has(p, "auto_publish")) },
    { label: t.plans.analytics, values: PLANS.map((p) => has(p, "analytics")) },
  ];

  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-col items-center gap-5 px-6 pt-10 text-center sm:px-14 sm:pt-12">
        <h1 className="max-w-[760px] text-[44px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[64px]">
          {t.hero.line1}<br />{t.hero.line2}
        </h1>
        <p className="max-w-[540px] text-lg leading-relaxed text-ink-soft">
          {t.hero.sub}
        </p>
        <div className="mt-2 flex w-full justify-center"><Dropzone t={t.drop} /></div>
        <Link href="/example" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft underline underline-offset-4 hover:text-ink">
          {EXAMPLE[locale].seeExample}
          <svg className="h-3.5 w-3.5 rtl:-scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </Link>
      </section>

      <section className="flex flex-col gap-3.5 px-6 pt-11 sm:px-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-[15px] font-semibold text-ink-soft">{t.outputs.heading}</h2>
          <span className="text-sm text-ink-mute">{fmt(t.outputs.saved, { h: Math.round(total / 60) })}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {OUTPUTS.map((o) => (
            <div key={o.key} className={`tile flex flex-col gap-3 p-4.5 ${TILE[o.color]} ${SPAN[o.key]}`}>
              <div className="flex items-start justify-between gap-2">
                <Icon name={o.key} />
                {studioOnly(NEEDS[o.key]) && <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-ink">Studio</span>}
              </div>
              <div>
                <div className="text-lg font-bold">{t.outputs[o.key as OutputKey][0]}</div>
                <div className="sub text-[13px]">{t.outputs[o.key as OutputKey][1]}</div>
              </div>
              <div aria-hidden className="mt-auto h-[136px]"><OutputExample kind={o.key} /></div>
            </div>
          ))}
        </div>
      </section>

      {/* The work Claude does itself, so it is clear what the tool is for */}
      <section className="flex flex-col gap-5 px-6 pt-16 sm:px-14">
        <h2 className="text-[15px] font-semibold text-ink-soft">{t.claude.heading}</h2>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {CLAUDE.map((c) => (
            <li key={c.key} className="flex gap-3 border-t border-line pt-4 text-[15px] leading-relaxed">
              <span aria-hidden className={`mt-[7px] h-2.5 w-2.5 flex-none rounded-[3px] ${c.color}`} />
              <span>{t.claude[c.key]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="pricing" className="flex scroll-mt-6 flex-col items-center gap-8 px-6 pt-24 sm:px-14">
        <h2 className="text-[40px] font-extrabold tracking-[-0.03em] sm:text-[56px]">{t.nav.pricing}</h2>
        <div className="w-full max-w-[960px] overflow-x-auto">
          <table className="w-full min-w-[340px] table-fixed border-collapse text-[15px] sm:text-base">
            <thead>
              <tr className="border-b-2 border-ink align-top">
                <td className="w-[31%] py-4 sm:w-[34%]" />
                {PLANS.map((p) => (
                  <th key={p.tier} scope="col" className="px-2 py-4 text-center font-normal">
                    <div className="text-base font-bold sm:text-xl">{t.plans[p.tier]}</div>
                    <div className="text-[28px] font-extrabold leading-tight tracking-tight tabular-nums sm:text-[44px]">
                      {p.price_cents === 0 ? "$0" : `$${p.price_cents / 100}`}
                      {p.price_cents > 0 && <span className="block text-[13px] font-medium tracking-normal text-ink-mute sm:ms-1 sm:inline sm:text-base">{t.plans.perMonth}</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-line align-top">
                  <th scope="row" className="py-4 pe-3 text-start font-medium">
                    {r.label}
                    {r.note && <div className="text-[13px] font-normal text-ink-mute">{r.note}</div>}
                  </th>
                  {r.values.map((v, i) => (
                    <td key={PLANS[i].tier} className="px-2 py-4 text-center">
                      {typeof v === "string" ? <span className="font-semibold tabular-nums">{v}</span> : v ? <Check /> : <span aria-label="–" className="text-ink-mute/60">–</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-center gap-1 text-center text-sm text-ink-mute">
          <p className="m-0">{t.plans.limits}</p>
          <p className="m-0">{t.footer.extra}</p>
        </div>
      </section>

      <footer className="mt-auto px-6 pb-9 pt-16 text-center text-sm text-ink-soft sm:px-14">
        {t.footer.editable}
      </footer>
    </main>
  );
}

function Check() {
  return <svg className="mx-auto h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-label="✓"><path d="M20 6 9 17l-5-5" /></svg>;
}

function Icon({ name }: { name: string }) {
  const c = "h-[26px] w-[26px]";
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "listing": return <svg className={c} viewBox="0 0 24 24" {...p}><path d="M4 5h16v14H4z" /><path d="M8 10h8M8 14h5" /></svg>;
    case "photos": return <svg className={c} viewBox="0 0 24 24" {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="m21 16-5-4-7 7" /></svg>;
    case "shorts": return <svg className={c} viewBox="0 0 24 24" {...p}><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></svg>;
    case "markets": return <svg className={c} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
    case "social": return <svg className={c} viewBox="0 0 24 24" {...p}><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><path d="M17 7h.01" /></svg>;
    default: return <svg className={c} viewBox="0 0 24 24" {...p}><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
  }
}
