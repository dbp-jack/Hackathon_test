import { Dropzone } from "@/components/Dropzone";
import { OUTPUTS, PLANS } from "@/lib/types";
import { MESSAGES, fmt, type OutputKey } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

const TILE: Record<string, string> = {
  butter: "bg-butter text-ink [&_.sub]:text-butter-ink",
  blue: "bg-blue text-white [&_.sub]:text-white/90",
  ink: "bg-ink text-white [&_.sub]:text-white/85",
  mint: "bg-mint text-ink [&_.sub]:text-mint-ink",
  lilac: "bg-lilac text-ink [&_.sub]:text-lilac-ink",
  blush: "bg-blush text-ink [&_.sub]:text-blush-ink",
};
const SPAN: Record<string, string> = { listing: "lg:col-span-3", photos: "lg:col-span-2", shorts: "lg:col-span-3", markets: "lg:col-span-2", social: "lg:col-span-2", publish: "lg:col-span-2" };

export default async function UploadPage() {
  const t = MESSAGES[await getLocale()];
  const total = OUTPUTS.reduce((s, o) => s + o.minutes, 0);
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
      </section>

      <section className="flex flex-col gap-3.5 px-6 pt-11 sm:px-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-[15px] font-semibold text-ink-soft">{t.outputs.heading}</h2>
          <span className="text-sm text-ink-mute">{fmt(t.outputs.saved, { h: Math.round(total / 60) })}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {OUTPUTS.map((o) => (
            <div key={o.key} className={`tile flex min-h-[150px] flex-col justify-between p-4.5 ${TILE[o.color]} ${SPAN[o.key]}`}>
              <Icon name={o.key} />
              <div>
                <div className="text-lg font-bold">{t.outputs[o.key as OutputKey][0]}</div>
                <div className="sub text-[13px]">{t.outputs[o.key as OutputKey][1]}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="px-6 pt-12 sm:px-14">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.tier} className={`tile flex flex-col gap-2 border-2 border-ink p-5 ${p.tier === "maker" ? "bg-ink text-white" : "bg-white"}`}>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold">{t.plans[p.tier]}</span>
                <span className="text-2xl font-extrabold tracking-tight">{p.price_cents === 0 ? "$0" : `$${p.price_cents / 100}`}<span className="text-sm font-medium opacity-70">{p.price_cents ? ` ${t.plans.perMonth}` : ""}</span></span>
              </div>
              <div className={`text-sm ${p.tier === "maker" ? "text-white/80" : "text-ink-soft"}`}>
                {p.launches_per_month ? fmt(t.plans.launches, { n: p.launches_per_month }) : t.plans.unlimited}
                {p.tier === "free" && ` · ${t.plans.watermark}`}{p.tier === "studio" && ` · ${t.plans.studioExtras}`}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-4 px-6 py-9 text-sm text-ink-soft sm:px-14">
        <span>{t.footer.extra}</span>
        <span>{t.footer.editable}</span>
      </footer>
    </main>
  );
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
