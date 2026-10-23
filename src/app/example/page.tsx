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

// Each output keeps its color from the home page and result screen; here it only marks the section.
const MARK = { listing: "bg-butter", photos: "bg-blue", shorts: "bg-white", markets: "bg-mint", publish: "bg-blush" } as const;
type Part = keyof typeof MARK;

export default async function ExamplePage() {
  const locale = await getLocale();
  const t = MESSAGES[locale];
  const x = EXAMPLE[locale];
  const li = KNIT.listing;
  const words = li.description.join(" ").split(/\s+/).length;
  const parts: Part[] = ["listing", "photos", "shorts", "markets", "publish"];

  return (
    <main className="flex flex-1 flex-col">
      {/* What goes in */}
      <section className="grid gap-10 px-6 pb-14 pt-6 sm:px-14 lg:grid-cols-12 lg:items-center lg:gap-14">
        <div className="flex flex-col items-start gap-5 lg:col-span-5">
          <span className="rounded-full border-[1.5px] border-ink px-2.5 py-0.5 text-xs font-semibold">{x.sampleTag}</span>
          <h1 className="text-[40px] font-extrabold leading-[1.04] tracking-[-0.03em] [text-wrap:balance] sm:text-[60px]">{x.title}</h1>
          <p className="m-0 max-w-[460px] text-lg leading-relaxed text-ink-soft">{x.sub}</p>
          <p className="m-0 max-w-[460px] text-sm leading-relaxed text-ink-mute">{x.sampleNote}</p>
          <Link href="/" className="btn btn-primary mt-1 text-base no-underline">{x.cta}</Link>
        </div>
        <figure className="m-0 flex flex-col gap-3 lg:col-span-7">
          <AutoVideo src={KNIT.input.src} poster={KNIT.input.poster} label={`${x.inLabel}: ${x.inMeta}`} className="aspect-video w-full rounded-[18px] bg-ink object-cover" />
          <figcaption className="text-sm text-ink-mute"><span className="font-semibold text-ink">{x.inLabel}</span> · {x.inMeta}</figcaption>
        </figure>
      </section>

      {/* What comes out: a one-line index, then each output as it would really look */}
      <div className="flex flex-col gap-4 px-6 pb-4 pt-6 sm:px-14">
        <h2 className="text-[32px] font-extrabold tracking-[-0.02em] sm:text-[40px]">{x.outLabel}</h2>
        <nav aria-label={x.outLabel} className="flex flex-wrap gap-x-6 gap-y-2 text-[15px] font-medium">
          {parts.map((p) => (
            <a key={p} href={`#${p}`} className="inline-flex items-center gap-2 text-ink no-underline hover:underline hover:underline-offset-4">
              <Mark part={p} />{t.outputs[p][0]}
            </a>
          ))}
        </nav>
      </div>

      <Section id="listing" title={t.outputs.listing[0]} sub={t.outputs.listing[1]}>
        <div className="flex max-w-[760px] flex-col gap-9">
          <Field label={fmt(x.titleLabel, { n: li.title.length })}>
            <p lang="en" dir="ltr" className="m-0 text-start text-[21px] font-semibold leading-snug tracking-tight sm:text-[26px]">{li.title}</p>
          </Field>
          <Field label={fmt(x.tagsLabel, { n: li.tags.length })}>
            <ul lang="en" dir="ltr" className="m-0 flex list-none flex-wrap gap-2 p-0">
              {li.tags.map((tag) => <li key={tag} className="rounded-full border border-ink/20 px-3 py-1 text-[13px]">{tag}</li>)}
            </ul>
          </Field>
          <Field label={fmt(x.descLabel, { n: words })}>
            <div lang="en" dir="ltr" className="flex max-w-[62ch] flex-col gap-3 text-start text-[15px] leading-relaxed text-[#33332F]">
              {li.description.map((p) => <p key={p} className="m-0">{p}</p>)}
            </div>
          </Field>
          <Field label={x.askLabel}>
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-[15px]">
              {[x.yarn, x.size, x.care].map((k) => (
                <span key={k} className="inline-flex items-end gap-2">{k}<span aria-hidden className="mb-1 inline-block w-24 border-b-2 border-dashed border-ink/30" /></span>
              ))}
            </div>
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-[48px] font-extrabold leading-none tracking-tight tabular-nums">{li.price}</span>
            <a href={li.comparables.url} target="_blank" rel="noreferrer" className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
              {fmt(x.comparables, { range: `\u2066${li.comparables.range}\u2069`, mid: `\u2066${li.comparables.mid}\u2069` })}
            </a>
          </div>
        </div>
      </Section>

      <Section id="photos" title={t.outputs.photos[0]} sub={t.outputs.photos[1]}>
        <ul className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
          {KNIT.photos.map((p) => (
            <li key={p.key} className="w-[58%] flex-none snap-start sm:w-auto">
              <figure className="m-0 flex flex-col gap-2">
                <img src={p.src} alt={x.photos[p.key]} className="aspect-square w-full rounded-[14px] object-cover" />
                <figcaption className="text-[13px] text-ink-soft">{x.photos[p.key]}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="shorts" title={t.outputs.shorts[0]} sub={t.outputs.shorts[1]} dark>
        <ul className="-mx-6 flex max-w-[860px] snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
          {KNIT.shorts.map((s) => (
            <li key={s.platform} className="flex w-[62%] flex-none snap-start flex-col gap-3 sm:w-auto">
              <AutoVideo src={s.src} poster={s.poster} label={`${s.platform}: “${s.hook}”`} className="aspect-[9/16] w-full rounded-[14px] bg-[#2E2E2E] object-cover" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] text-white/70">{s.platform} · {s.seconds} s</span>
                <span lang="en" dir="ltr" className="text-start text-[15px] font-semibold">“{s.hook}”</span>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="markets" title={t.outputs.markets[0]} sub={t.outputs.markets[1]}>
        <div className="flex max-w-[860px] flex-col gap-3">
          <table className="w-full border-collapse text-[15px]">
            <tbody>
              {KNIT.markets.map((m) => (
                <tr key={m.code} className="border-b border-line align-baseline last:border-b-0">
                  <th scope="row" className="w-12 py-3.5 text-start text-[13px] font-bold">{m.code}</th>
                  <td lang={m.lang} dir="ltr" className="py-3.5 pe-6 text-start">{m.title}</td>
                  <td className="whitespace-nowrap py-3.5 text-end font-bold tabular-nums">{m.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="m-0 text-[13px] text-ink-mute">{x.rates}</p>
        </div>
      </Section>

      <Section id="publish" title={t.outputs.publish[0]} sub={t.outputs.publish[1]}>
        <div className="flex max-w-[520px] flex-col gap-3">
          <ul className="m-0 flex list-none flex-col p-0">
            {KNIT.channels.map((c) => (
              <li key={c} className="flex items-center justify-between gap-4 border-b border-line py-3.5 last:border-b-0">
                <span className="text-lg font-semibold">{c}</span>
                <span className="inline-flex items-center gap-2 text-sm text-ink-soft">
                  <span aria-hidden className="h-2 w-2 rounded-full border-[1.5px] border-ink/50" />{x.draft}
                </span>
              </li>
            ))}
          </ul>
          <p className="m-0 text-[13px] text-ink-mute">{x.drafts}</p>
        </div>
      </Section>

      <section className="flex flex-col items-center gap-10 px-6 pb-24 pt-20 text-center sm:px-14">
        <p className="m-0 text-[44px] font-extrabold leading-[1.1] tracking-[-0.035em] [text-wrap:balance] sm:text-[88px]">{t.hero.line1}<br />{t.hero.line2}</p>
        {/* .btn is unlayered CSS, so the larger size needs ! to win over it */}
        <Link href="/" className="btn btn-primary px-9! py-4.5! text-lg! no-underline sm:px-12! sm:py-5! sm:text-xl!">{x.cta}</Link>
      </section>
    </main>
  );
}

function Mark({ part }: { part: Part }) {
  return <span aria-hidden className={`inline-block h-2.5 w-2.5 flex-none rounded-[3px] ${part === "shorts" ? "bg-ink" : MARK[part]}`} />;
}

function Section({ id, title, sub, dark, children }: { id: Part; title: string; sub: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`grid scroll-mt-4 gap-6 px-6 py-14 sm:px-14 lg:grid-cols-12 lg:gap-10 ${dark ? "my-6 bg-ink py-16 text-white" : ""}`}>
      <header className="flex flex-col gap-2 lg:sticky lg:top-8 lg:col-span-3 lg:self-start">
        <span aria-hidden className={`h-2.5 w-2.5 rounded-[3px] ${MARK[id]}`} />
        <h3 id={`${id}-title`} className="text-2xl font-bold tracking-tight">{title}</h3>
        <p className={`m-0 text-sm leading-relaxed ${dark ? "text-white/70" : "text-ink-soft"}`}>{sub}</p>
      </header>
      <div className="min-w-0 lg:col-span-9">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[13px] font-semibold text-ink-mute">{label}</span>
      {children}
    </div>
  );
}
