import type { Metadata } from "next";
import Link from "next/link";
import { AutoVideo } from "@/components/AutoVideo";
import { KNIT } from "@/lib/exampleKnit";
import { MESSAGES, fmt } from "@/lib/i18n";
import { EXAMPLE } from "@/lib/i18n-example";
import { getLocale } from "@/lib/i18n-server";

export const metadata: Metadata = {
  title: "Launch Kit — One video in, a whole launch out",
  description: "A 10-second knitting video and everything Launch Kit makes from it: listing, photos, shorts, four markets.",
};

export default async function ExamplePage() {
  const locale = await getLocale();
  const t = MESSAGES[locale];
  const x = EXAMPLE[locale];
  const li = KNIT.listing;
  const words = li.description.join(" ").split(/\s+/).length;

  return (
    <main className="flex flex-1 flex-col gap-5 px-6 pb-12 pt-4 sm:px-14">
      {/* What goes in */}
      <section className="grid items-center gap-8 pt-2 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col items-start gap-5 lg:col-span-5">
          <h1 className="break-keep text-[40px] font-extrabold leading-[1.04] tracking-[-0.03em] [text-wrap:balance] sm:text-[56px]">{x.title}</h1>
          <p className="max-w-[460px] break-keep text-lg leading-relaxed text-ink-soft">{x.sub}</p>
          <Link href="/" className="btn btn-primary text-base no-underline">{x.cta}</Link>
        </div>
        <figure className="m-0 flex flex-col gap-2.5 lg:col-span-7">
          <div className="tile relative overflow-hidden border-2 border-ink bg-ink">
            <AutoVideo src={KNIT.input.src} poster={KNIT.input.poster} label={x.inLabel} className="aspect-video w-full object-cover" />
            <span className="absolute start-3 top-3 rounded-full bg-butter px-3 py-1.5 text-[13px] font-semibold text-ink">{x.inLabel}</span>
          </div>
          <figcaption className="text-sm text-ink-mute">{x.inMeta}</figcaption>
        </figure>
      </section>

      <div className="flex items-center gap-3 pt-8">
        <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-ink text-white" aria-hidden>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
        </span>
        <h2 className="text-[15px] font-semibold text-ink-soft">{x.outLabel}</h2>
        <span className="h-px flex-1 bg-line" />
      </div>

      {/* What comes out */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        <section className="tile flex flex-col gap-4 bg-butter p-6 lg:col-span-5">
          <h3 className="text-xl font-bold">{t.outputs.listing[0]}</h3>
          <Card label={fmt(x.titleLabel, { n: li.title.length })}>
            <div lang="en" dir="ltr" className="text-start text-[15px] font-medium leading-snug">{li.title}</div>
          </Card>
          <Card label={fmt(x.tagsLabel, { n: li.tags.length })}>
            <div lang="en" dir="ltr" className="flex flex-wrap gap-1.5">{li.tags.map((tag) => <span key={tag} className="chip">{tag}</span>)}</div>
          </Card>
          <Card label={fmt(x.descLabel, { n: words })}>
            <div lang="en" dir="ltr" className="flex flex-col gap-2 text-start">
              {li.description.map((p) => <p key={p} className="m-0 text-[13px] leading-relaxed text-[#33332F]">{p}</p>)}
            </div>
            <div className="mt-1 flex flex-col gap-2 rounded-xl border-2 border-dashed border-line p-3">
              <span className="text-xs font-semibold text-ink-mute">{x.askLabel}</span>
              <div className="flex flex-wrap gap-1.5">
                {[x.yarn, x.size, x.care].map((k) => (
                  <span key={k} className="rounded-full border border-dashed border-ink/35 px-2.5 py-1 text-xs font-medium">{k} <span className="text-ink-mute">____</span></span>
                ))}
              </div>
            </div>
          </Card>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[32px] font-extrabold tracking-tight">{li.price}</span>
            <a href={li.comparables.url} target="_blank" rel="noreferrer" className="text-[13px] text-butter-ink underline underline-offset-2">
              {fmt(x.comparables, { range: li.comparables.range, mid: li.comparables.mid })}
            </a>
          </div>
        </section>

        <div className="flex flex-col gap-3.5 lg:col-span-7">
          <section className="tile flex flex-col gap-3.5 bg-blue p-6 text-white">
            <h3 className="text-xl font-bold">{t.outputs.photos[0]} <span className="text-[15px] font-normal opacity-85">{t.outputs.photos[1]}</span></h3>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
              {KNIT.photos.map((p) => (
                <figure key={p.key} className="m-0 flex flex-col gap-1.5">
                  <img src={p.src} alt={x.photos[p.key]} className="aspect-square w-full rounded-xl object-cover" />
                  <figcaption className="text-xs opacity-90">{x.photos[p.key]}</figcaption>
                </figure>
              ))}
            </div>
          </section>

          <section className="tile flex flex-col gap-3.5 bg-ink p-6 text-white">
            <h3 className="text-xl font-bold">{t.outputs.shorts[0]} <span className="text-[15px] font-normal opacity-80">{t.outputs.shorts[1]}</span></h3>
            <div className="grid grid-cols-3 gap-3">
              {KNIT.shorts.map((s) => (
                <div key={s.platform} className="relative aspect-[9/16] overflow-hidden rounded-xl bg-[#2E2E2E]">
                  <AutoVideo src={s.src} poster={s.poster} label={`${s.platform}: “${s.hook}”`} className="h-full w-full object-cover" />
                  <span className={`absolute bottom-2.5 start-2.5 rounded-full px-2 py-1 text-[11px] font-semibold text-ink ${s.badge}`}>{s.platform} · {s.seconds} s</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="tile flex flex-col gap-3 bg-mint p-6 text-mint-ink lg:col-span-7">
          <h3 className="text-xl font-bold text-ink">{t.outputs.markets[0]} <span className="text-[15px] font-normal">{t.outputs.markets[1]}</span></h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {KNIT.markets.map((m) => (
              <li key={m.code} className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2.5 text-sm text-ink">
                <span className="w-8 flex-none rounded-md bg-mint py-0.5 text-center text-xs font-bold">{m.code}</span>
                <span lang={m.lang} dir="ltr" className="min-w-0 flex-1 truncate text-start">{m.title}</span>
                <span className="flex-none font-bold tabular-nums">{m.price}</span>
              </li>
            ))}
          </ul>
          <div className="text-xs">{x.rates}</div>
        </section>

        <section className="tile flex flex-col gap-3 bg-blush p-6 text-blush-ink lg:col-span-5">
          <h3 className="text-xl font-bold text-ink">{t.outputs.publish[0]}</h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {KNIT.channels.map((c) => (
              <li key={c} className="flex items-center justify-between rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink">
                <span>{c}</span>
                <span className="rounded-full border border-dashed border-ink/40 px-2.5 py-0.5 text-xs font-medium">{x.draft}</span>
              </li>
            ))}
          </ul>
          <div className="text-xs">{x.drafts}</div>
        </section>
      </div>

      <div className="tile mt-6 flex flex-wrap items-center justify-between gap-4 border-2 border-ink bg-white px-6 py-5">
        <span className="text-xl font-bold tracking-tight">{t.hero.line1} {t.hero.line2}</span>
        <Link href="/" className="btn btn-primary no-underline">{x.cta}</Link>
      </div>
    </main>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="card flex flex-col gap-2 px-4.5 py-4"><div className="text-xs font-semibold text-ink-mute">{label}</div>{children}</div>;
}
