"use client";
import { useEffect, useRef, useState } from "react";
import { type Kit, fmtMoney, fmtTimecode, PIPELINE_STEPS } from "@/lib/types";
import { fmt, type Locale } from "@/lib/i18n";
import { LOCALE_TAG, fmtDur, type KitMessages } from "@/lib/i18n-kit";

const BADGE: Record<string, string> = { etsy: "bg-butter", tiktok: "bg-mint", reels: "bg-blush", shorts: "bg-lilac" };
const PLATFORM: Record<string, string> = { etsy: "Etsy", tiktok: "TikTok", reels: "Reels", shorts: "Shorts" };

export function KitView({ initial, preview, t, locale }: { initial: Kit; preview?: { elapsed: number }; t: KitMessages; locale: Locale }) {
  const [kit, setKit] = useState<Kit>(initial);
  const [elapsed, setElapsed] = useState(preview?.elapsed ?? 0);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const failed = kit.status === "failed";
  const live = kit.status !== "ready" && kit.status !== "published" && !failed;
  const started = useRef(Date.now());

  // Live timer while building — the demo's stopwatch
  useEffect(() => {
    if (!live || preview) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [live]);

  // SSE: each step event carries the partial kit → cards fill in one by one
  useEffect(() => {
    if (!live || preview) return;
    const es = new EventSource(`/api/v1/launches/${kit.id}/events`);
    const refetch = async () => setKit(await (await fetch(`/api/v1/launches/${kit.id}/kit`)).json());
    es.addEventListener("step", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      setKit((k) => ({ ...k, ...d.partial, progress: { step: d.step, pct: d.pct }, what_claude_did: [...k.what_claude_did.filter((w) => w.step !== d.step), { step: d.step, summary: d.summary }] }));
    });
    es.addEventListener("done", () => { refetch(); es.close(); });
    es.addEventListener("error", () => { refetch(); es.close(); });
    return () => es.close();
  }, [kit.id, live]);

  function say(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2200); }

  async function copyAll() {
    const li = kit.listing; if (!li) return;
    await navigator.clipboard.writeText(`${li.title}\n\n${li.tags.join(", ")}\n\n${li.description}`);
    say(t.toast.copied);
  }
  async function publish() {
    if (preview) { say(t.toast.previewPublish); return; }
    setBusy("publish");
    const res = await fetch(`/api/v1/launches/${kit.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channels: ["shopify", "tiktok"] }) });
    setBusy(null);
    say(res.ok ? t.toast.queued : t.toast.failed);
    setKit(await (await fetch(`/api/v1/launches/${kit.id}/kit`)).json());
  }

  const li = kit.listing;
  const stepLabel = kit.progress.step ? t.steps[kit.progress.step] : t.status.starting;
  const video = kit.sources.find((s) => s.kind === "video");
  const photoCount = kit.sources.filter((s) => s.kind === "photo").length;
  const noVideo = !video;
  const sourceLine = video
    ? fmt(photoCount ? t.header.fromVideoAndPhotos : t.header.fromVideo, { video: video.name ?? t.header.video, dur: fmtDur(t, video.duration_sec), n: photoCount })
    : photoCount ? fmt(t.header.fromPhotosNoVideo, { n: photoCount }) : t.header.fromUpload;
  const frameCount = kit.sources.find((s) => s.frame_count)?.frame_count;
  const marketName = (m: string) => t.markets.names[m as keyof typeof t.markets.names] ?? m;
  const frameLabel = (f: Kit["frames"][number]) => `${t.roles[f.role] ?? f.role}${f.timecode_sec != null ? ` · ${fmtTimecode(f.timecode_sec)}` : ""}`;

  return (
    <main className="flex flex-col gap-5 px-6 pb-11 pt-4 sm:px-14">
      {/* Status + title + actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          {kit.status === "failed" ? (
            <div className="flex flex-wrap items-center gap-3">
              <Pill tone="blush">{t.status.failed}</Pill>
              <a href="/" className="text-sm font-semibold underline underline-offset-4">{t.status.uploadAgain}</a>
            </div>
          ) : live ? (
            <Pill tone="butter"><Spinner /> {stepLabel} · {fmtDur(t, elapsed)} · {kit.progress.pct}%</Pill>
          ) : (
            <Pill tone="mint"><Check /> {fmt(t.status.ready, { time: fmtDur(t, kit.build_seconds), h: Math.floor((kit.minutes_saved_est ?? 0) / 60), m: (kit.minutes_saved_est ?? 0) % 60 })}</Pill>
          )}
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight sm:text-4xl">{kit.product_title ?? t.header.title}</h1>
          <div className="text-sm text-ink-mute">{sourceLine}</div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <a href={`/api/v1/launches/${kit.id}/download`} onClick={(e) => { if (preview) { e.preventDefault(); say(t.toast.previewDownload); } }} aria-disabled={live || failed} className={`btn btn-ghost ${live || failed ? "pointer-events-none opacity-50" : ""}`}>{t.buttons.downloadAll}</a>
          <a href={`/api/v1/launches/${kit.id}/export/etsy.csv`} onClick={(e) => { if (preview) { e.preventDefault(); say(t.toast.previewExport); } }} className={`btn btn-ghost ${!li ? "pointer-events-none opacity-50" : ""}`}>{t.buttons.etsyCsv}</a>
          <button type="button" onClick={publish} disabled={live || failed || busy === "publish"} className="btn btn-primary disabled:opacity-50">
            {kit.publications.some((p) => p.channel === "shopify" && p.status !== "draft") ? t.buttons.queued : t.buttons.publish}
          </button>
        </div>
      </div>

      {/* Progress rail while live */}
      {live && (
        <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-mute" aria-label={t.status.progress}>
          {PIPELINE_STEPS.map((s) => {
            const done = kit.what_claude_did.some((w) => w.step === s.step);
            return <li key={s.step} className={done ? "font-semibold text-ink" : ""}>{done ? "✓ " : ""}{t.steps[s.step]}</li>;
          })}
        </ol>
      )}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        {/* Etsy listing — butter */}
        <section className="tile flex flex-col gap-4 bg-butter p-6 lg:col-span-5 lg:self-start">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{t.listing.title}</h2>
            <button type="button" onClick={copyAll} disabled={!li} className="btn btn-sm border-ink bg-transparent disabled:opacity-40">{t.buttons.copyAll}</button>
          </div>
          {li ? (
            <>
              <Card label={fmt(t.listing.titleCount, { n: li.title_chars })}><div className="text-[15px] font-medium leading-snug">{li.title}</div></Card>
              <Card label={fmt(t.listing.tagsCount, { n: li.tags.length })}><div className="flex flex-wrap gap-1.5">{li.tags.map((tag) => <span key={tag} className="chip">{tag}</span>)}</div></Card>
              <Card label={fmt(t.listing.descCount, { n: li.description_words })}>
                <Expandable text={li.description} t={t} />
              </Card>
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-[32px] font-extrabold tracking-tight">{fmtMoney(li.price)}</span>
                <span className="text-[13px] text-butter-ink">
                  {li.price.comparables.low_cents != null && fmt(t.listing.similar, { low: fmtMoney({ cents: li.price.comparables.low_cents, currency: li.price.currency }), high: fmtMoney({ cents: li.price.comparables.high_cents!, currency: li.price.currency }) })}
                  {li.price.cost_basis_cents != null && ` · ${fmt(t.listing.cost, { cost: fmtMoney({ cents: li.price.cost_basis_cents, currency: li.price.currency }) })}`}
                </span>
              </div>
            </>
          ) : <Skeleton lines={6} still={failed} />}
        </section>

        <div className="flex flex-col gap-3.5 lg:col-span-7">
          {/* Photos — blue */}
          <section className="tile flex flex-col gap-3.5 bg-blue p-6 text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{fmt(t.photos.title, { n: kit.frames.length || 5 })} <span className="text-[15px] font-normal opacity-85">{frameCount ? fmt(t.photos.pickedFrom, { n: frameCount.toLocaleString(LOCALE_TAG[locale]) }) : t.photos.pickedFromUpload}</span></h2>
              <span className="text-xs opacity-80">{t.buttons.swapHint}</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
              {kit.frames.length ? kit.frames.map((f) => (
                <figure key={f.id} className="m-0 flex flex-col gap-1.5">
                  <img src={f.url_clean ?? f.url_raw} alt={frameLabel(f)} className="aspect-square w-full rounded-xl bg-white/90 object-cover" />
                  <figcaption className="text-xs opacity-90">{frameLabel(f)}</figcaption>
                </figure>
              )) : Array.from({ length: 5 }).map((_, i) => <div key={i} className={`aspect-square rounded-xl bg-white/30 ${failed ? "" : "animate-pulse"}`} />)}
            </div>
          </section>

          {/* Videos — ink */}
          <section className="tile flex flex-col gap-3.5 bg-ink p-6 text-white">
            <h2 className="text-xl font-bold">{t.videos.title} <span className="text-[15px] font-normal opacity-80">{fmt(t.videos.listingVideo, { n: Math.round(kit.videos.find((v) => v.kind === "listing")?.duration_sec ?? 15) })}</span></h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {kit.videos.length ? kit.videos.map((v) => (
                <div key={v.id} className="flex flex-col gap-2">
                  <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-[#2E2E2E]">
                    {v.url && <video src={v.url} className="h-full w-full object-cover" muted playsInline loop onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()} />}
                    <span className={`absolute bottom-2.5 left-2.5 rounded-full px-2 py-1 text-[11px] font-semibold text-ink ${BADGE[v.platform]}`}>
                      {PLATFORM[v.platform]} · {fmt(t.videos.secs, { n: Math.round(v.duration_sec ?? 0) })}
                    </span>
                  </div>
                  <div className={`text-[13px] leading-snug ${v.hook_text ? "font-semibold" : "opacity-90"}`}>{v.hook_text ? `“${v.hook_text}”` : t.videos.noText}</div>
                </div>
              )) : Array.from({ length: 4 }).map((_, i) => <div key={i} className={`aspect-[9/16] rounded-xl bg-white/15 ${failed ? "" : "animate-pulse"}`} />)}
            </div>
            {!live && !failed && noVideo && (
              <div className="rounded-xl bg-white/10 px-4 py-3 text-sm leading-relaxed">{t.videos.fromPhotos}</div>
            )}
          </section>

          {/* Markets — mint */}
          <section className="tile flex flex-col gap-3 bg-mint p-6 text-mint-ink">
            <h2 className="text-xl font-bold text-ink">{fmt(t.markets.title, { n: kit.localizations.length || 4 })} <span className="text-[15px] font-normal">{t.markets.sub}</span></h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {kit.localizations.length ? kit.localizations.map((l) => (
                <MarketCard key={l.id} l={l} t={t} name={marketName(l.market)} onCopy={() => { navigator.clipboard.writeText(`${l.title}\n\n${l.tags.join(", ")}\n\n${l.description}`); say(fmt(t.toast.marketCopied, { market: marketName(l.market) })); }} />
              )) : <Skeleton lines={4} light still={failed} />}
            </div>
            <div className="text-xs">{t.markets.shipping}</div>
          </section>
        </div>
      </div>

      {/* What Claude did */}
      <div className="tile flex flex-wrap items-center gap-x-7 gap-y-2.5 border-2 border-ink bg-white px-6 py-4.5 text-sm">
        <span className="font-bold">{t.did.title}</span>
        {kit.what_claude_did.length ? kit.what_claude_did.map((w) => <span key={w.step}>{w.summary}</span>) : <span className="text-ink-mute">{t.did.starting}</span>}
        <span className="ms-auto text-ink-mute">{t.did.editable}</span>
      </div>

      {toast && <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-lg">{toast}</div>}
    </main>
  );
}

function Pill({ tone, children }: { tone: "butter" | "mint" | "blush"; children: React.ReactNode }) {
  const t = { butter: "bg-butter text-butter-ink", mint: "bg-mint text-mint-ink", blush: "bg-blush text-blush-ink" }[tone];
  return <div className={`inline-flex w-max max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold ${t}`}>{children}</div>;
}
/** One localized listing: market, language, price, translated title; description + tags fold out. */
function MarketCard({ l, t, name, onCopy }: { l: Kit["localizations"][number]; t: KitMessages; name: string; onCopy: () => void }) {
  const [open, setOpen] = useState(false);
  const lang = l.locale.startsWith("de") ? t.markets.langs.de : l.locale.startsWith("fr") ? t.markets.langs.fr : l.locale.endsWith("GB") ? t.markets.langs.enGB : l.locale.endsWith("AU") ? t.markets.langs.enAU : l.locale;
  return (
    <div className="card flex flex-col gap-2 px-4 py-3.5 text-ink">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold text-ink-mute">{name} · {lang}</span>
        <span className="font-bold tabular-nums">{fmtMoney(l.price)}</span>
      </div>
      <div lang={l.locale} className="text-[13px] font-medium leading-snug">{l.title}</div>
      {open && (
        <>
          <div className="flex flex-wrap gap-1">{l.tags.map((tag) => <span key={tag} className="chip text-[11px]">{tag}</span>)}</div>
          <div lang={l.locale} className="whitespace-pre-line text-[12px] leading-relaxed text-[#33332F]">{l.description}</div>
        </>
      )}
      <div className="flex gap-3 text-xs">
        <button type="button" onClick={() => setOpen(!open)} className="text-ink-mute underline">{open ? t.buttons.hide : t.buttons.showDesc}</button>
        <button type="button" onClick={onCopy} className="text-ink-mute underline">{t.buttons.copy}</button>
      </div>
    </div>
  );
}
function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="card flex flex-col gap-2 px-4.5 py-4"><div className="text-xs font-semibold text-ink-mute">{label}</div>{children}</div>;
}
function Skeleton({ lines, light, still }: { lines: number; light?: boolean; still?: boolean }) {
  return <div className="flex flex-col gap-2">{Array.from({ length: lines }).map((_, i) => <div key={i} className={`h-3.5 rounded ${still ? "" : "animate-pulse"} ${light ? "bg-white/50" : "bg-white/60"}`} style={{ width: `${90 - (i % 3) * 18}%` }} />)}</div>;
}
function Expandable({ text, t }: { text: string; t: KitMessages }) {
  const [open, setOpen] = useState(false);
  const paras = text.split(/\n\s*\n/);
  const shown = open ? paras : paras.slice(0, 2);
  return (
    <div className="flex flex-col gap-2">
      {shown.map((p, i) => <p key={i} className="m-0 text-[13px] leading-relaxed text-[#33332F]">{p}</p>)}
      {paras.length > 2 && <button type="button" onClick={() => setOpen(!open)} className="self-start text-xs text-ink-mute underline">{open ? t.buttons.showLess : fmt(t.buttons.showRest, { n: paras.length - 2 })}</button>}
    </div>
  );
}
function Check() { return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>; }
function Spinner() { return <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />; }
