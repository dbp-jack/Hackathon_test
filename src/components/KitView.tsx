"use client";
import { useEffect, useRef, useState } from "react";
import { type Kit, type ClaudeStep, fmtMoney, fmtDuration, PIPELINE_STEPS } from "@/lib/types";

const STEP_LABEL: Record<ClaudeStep, string> = {
  watch_footage: "Watching your footage", score_frames: "Picking the best frames", extract_attributes: "Reading the product",
  research_comparables: "Checking comparable listings", write_listing: "Writing the listing", price: "Pricing it",
  write_hooks: "Writing three hooks", cut_points: "Cutting the videos", localize: "Translating for four markets", format_for_channel: "Formatting for each channel",
};
const BADGE: Record<string, string> = { etsy: "bg-butter", tiktok: "bg-mint", reels: "bg-blush", shorts: "bg-lilac" };
const PLATFORM: Record<string, string> = { etsy: "Etsy", tiktok: "TikTok", reels: "Reels", shorts: "Shorts" };
const MARKET: Record<string, string> = { GB: "United Kingdom", DE: "Germany · Deutsch", AU: "Australia", CA: "Canada · Français", US: "United States" };

export function KitView({ initial, preview }: { initial: Kit; preview?: { elapsed: number } }) {
  const [kit, setKit] = useState<Kit>(initial);
  const [elapsed, setElapsed] = useState(preview?.elapsed ?? 0);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const live = kit.status !== "ready" && kit.status !== "published" && kit.status !== "failed";
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
    say("Listing copied");
  }
  async function publish() {
    if (preview) { say("Preview only — nothing was published"); return; }
    setBusy("publish");
    const res = await fetch(`/api/v1/launches/${kit.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channels: ["shopify", "tiktok"] }) });
    setBusy(null);
    say(res.ok ? "Queued for Shopify and TikTok" : "Couldn't publish yet");
    setKit(await (await fetch(`/api/v1/launches/${kit.id}/kit`)).json());
  }

  const li = kit.listing;
  const stepLabel = kit.progress.step ? STEP_LABEL[kit.progress.step] : "Starting";

  return (
    <main className="flex flex-col gap-5 px-6 pb-11 pt-4 sm:px-14">
      {/* Status + title + actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          {kit.status === "failed" ? (
            <Pill tone="blush">Something went wrong. {initial.status === "failed" ? "Try uploading again." : ""}</Pill>
          ) : live ? (
            <Pill tone="butter"><Spinner /> {stepLabel} · {fmtDuration(elapsed)} · {kit.progress.pct}%</Pill>
          ) : (
            <Pill tone="mint"><Check /> Ready in {fmtDuration(kit.build_seconds)} · about {Math.floor((kit.minutes_saved_est ?? 0) / 60)} h {(kit.minutes_saved_est ?? 0) % 60} min saved</Pill>
          )}
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight sm:text-4xl">{kit.product_title ?? "Your launch kit"}</h1>
          <div className="text-sm text-ink-mute">
            From {kit.sources.map((s) => s.kind === "video" ? `${s.name ?? "video"} (${fmtDuration(s.duration_sec)})` : null).filter(Boolean).join(", ") || "your upload"}
            {kit.sources.filter((s) => s.kind === "photo").length ? ` and ${kit.sources.filter((s) => s.kind === "photo").length} photos` : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <a href={`/api/v1/launches/${kit.id}/download`} onClick={(e) => { if (preview) { e.preventDefault(); say("Preview only — connect Supabase to download"); } }} className={`btn btn-ghost ${live ? "pointer-events-none opacity-50" : ""}`}>Download everything</a>
          <a href={`/api/v1/launches/${kit.id}/export/etsy.csv`} onClick={(e) => { if (preview) { e.preventDefault(); say("Preview only — connect Supabase to export"); } }} className={`btn btn-ghost ${!li ? "pointer-events-none opacity-50" : ""}`}>Etsy CSV</a>
          <button type="button" onClick={publish} disabled={live || busy === "publish"} className="btn btn-primary disabled:opacity-50">
            {kit.publications.some((p) => p.channel === "shopify" && p.status !== "draft") ? "Queued" : "Publish to Shopify and TikTok"}
          </button>
        </div>
      </div>

      {/* Progress rail while live */}
      {live && (
        <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-mute" aria-label="Build progress">
          {PIPELINE_STEPS.map((s) => {
            const done = kit.what_claude_did.some((w) => w.step === s.step);
            return <li key={s.step} className={done ? "font-semibold text-ink" : ""}>{done ? "✓ " : ""}{STEP_LABEL[s.step]}</li>;
          })}
        </ol>
      )}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        {/* Etsy listing — butter */}
        <section className="tile flex flex-col gap-4 bg-butter p-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Etsy listing</h2>
            <button type="button" onClick={copyAll} disabled={!li} className="btn btn-sm border-ink bg-transparent disabled:opacity-40">Copy all</button>
          </div>
          {li ? (
            <>
              <Card label={`Title · ${li.title_chars} of 140`}><div className="text-[15px] font-medium leading-snug">{li.title}</div></Card>
              <Card label={`Tags · ${li.tags.length} of 13`}><div className="flex flex-wrap gap-1.5">{li.tags.map((t) => <span key={t} className="chip">{t}</span>)}</div></Card>
              <Card label={`Description · ${li.description_words} words`}>
                <Expandable text={li.description} />
              </Card>
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-[32px] font-extrabold tracking-tight">{fmtMoney(li.price)}</span>
                <span className="text-[13px] text-butter-ink">
                  {li.price.comparables.low_cents != null && `similar listings ${fmtMoney({ cents: li.price.comparables.low_cents, currency: li.price.currency })} – ${fmtMoney({ cents: li.price.comparables.high_cents!, currency: li.price.currency })}`}
                  {li.price.cost_basis_cents != null && ` · your materials and work come to about ${fmtMoney({ cents: li.price.cost_basis_cents, currency: li.price.currency })}`}
                </span>
              </div>
            </>
          ) : <Skeleton lines={6} />}
        </section>

        <div className="flex flex-col gap-3.5 lg:col-span-7">
          {/* Photos — blue */}
          <section className="tile flex flex-col gap-3.5 bg-blue p-6 text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{kit.frames.length || 5} photos <span className="text-[15px] font-normal opacity-85">picked from {kit.sources.find((s) => s.frame_count)?.frame_count?.toLocaleString() ?? "your"} frames</span></h2>
              <span className="text-xs opacity-80">Click a photo to swap it</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
              {kit.frames.length ? kit.frames.map((f) => (
                <figure key={f.id} className="m-0 flex flex-col gap-1.5">
                  <img src={f.url_clean ?? f.url_raw} alt={f.label} className="aspect-square w-full rounded-xl bg-white/90 object-cover" />
                  <figcaption className="text-xs opacity-90">{f.label}</figcaption>
                </figure>
              )) : Array.from({ length: 5 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-xl bg-white/30" />)}
            </div>
          </section>

          {/* Videos — ink */}
          <section className="tile flex flex-col gap-3.5 bg-ink p-6 text-white">
            <h2 className="text-xl font-bold">3 shorts <span className="text-[15px] font-normal opacity-80">and a 15 s listing video</span></h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {kit.videos.length ? kit.videos.map((v) => (
                <div key={v.id} className="flex flex-col gap-2">
                  <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-[#2E2E2E]">
                    {v.url && <video src={v.url} className="h-full w-full object-cover" muted playsInline loop onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()} />}
                    <span className={`absolute bottom-2.5 left-2.5 rounded-full px-2 py-1 text-[11px] font-semibold text-ink ${BADGE[v.platform]}`}>
                      {PLATFORM[v.platform]} · {Math.round(v.duration_sec ?? 0)} s
                    </span>
                  </div>
                  <div className={`text-[13px] leading-snug ${v.hook_text ? "font-semibold" : "opacity-90"}`}>{v.hook_text ? `“${v.hook_text}”` : "Wheel, glaze, pour. No text."}</div>
                </div>
              )) : Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-white/15" />)}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {/* Social — lilac */}
            <section className="tile flex flex-col gap-3 bg-lilac p-6 text-lilac-ink">
              <h2 className="text-xl font-bold text-ink">Pin and carousel</h2>
              <div className="flex gap-2.5">
                <div className="h-24 w-16 rounded-[10px] bg-white/90" />
                <div className="h-16 w-16 rounded-[10px] bg-white/90" />
                <div className="h-16 w-16 rounded-[10px] bg-white/90" />
              </div>
              <div className="text-[13px] leading-snug">{kit.social[0]?.title ? `“${kit.social[0].title}”` : <span className="opacity-70">Writing the pin…</span>}</div>
            </section>

            {/* Markets — mint */}
            <section className="tile flex flex-col gap-3 bg-mint p-6 text-mint-ink">
              <h2 className="text-xl font-bold text-ink">{kit.localizations.length || 4} markets</h2>
              <div className="flex flex-col gap-1.5 text-sm">
                {kit.localizations.length ? kit.localizations.map((l) => (
                  <div key={l.id} className="flex justify-between gap-3"><span>{MARKET[l.market] ?? l.market}</span><span className="font-bold">{fmtMoney(l.price)}</span></div>
                )) : <Skeleton lines={4} light />}
              </div>
              <div className="text-xs">Shipping from your studio included.</div>
            </section>
          </div>
        </div>
      </div>

      {/* What Claude did */}
      <div className="tile flex flex-wrap items-center gap-x-7 gap-y-2.5 border-2 border-ink bg-white px-6 py-4.5 text-sm">
        <span className="font-bold">What Claude did</span>
        {kit.what_claude_did.length ? kit.what_claude_did.map((w) => <span key={w.step}>{w.summary}</span>) : <span className="text-ink-mute">Starting up…</span>}
        <span className="ml-auto text-ink-mute">Everything is editable before you publish.</span>
      </div>

      {toast && <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-lg">{toast}</div>}
    </main>
  );
}

function Pill({ tone, children }: { tone: "butter" | "mint" | "blush"; children: React.ReactNode }) {
  const t = { butter: "bg-butter text-butter-ink", mint: "bg-mint text-mint-ink", blush: "bg-blush text-blush-ink" }[tone];
  return <div className={`inline-flex w-max max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold ${t}`}>{children}</div>;
}
function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="card flex flex-col gap-2 px-4.5 py-4"><div className="text-xs font-semibold text-ink-mute">{label}</div>{children}</div>;
}
function Skeleton({ lines, light }: { lines: number; light?: boolean }) {
  return <div className="flex flex-col gap-2">{Array.from({ length: lines }).map((_, i) => <div key={i} className={`h-3.5 animate-pulse rounded ${light ? "bg-white/50" : "bg-white/60"}`} style={{ width: `${90 - (i % 3) * 18}%` }} />)}</div>;
}
function Expandable({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const paras = text.split(/\n\s*\n/);
  const shown = open ? paras : paras.slice(0, 2);
  return (
    <div className="flex flex-col gap-2">
      {shown.map((p, i) => <p key={i} className="m-0 text-[13px] leading-relaxed text-[#33332F]">{p}</p>)}
      {paras.length > 2 && <button type="button" onClick={() => setOpen(!open)} className="self-start text-xs text-ink-mute underline">{open ? "Show less" : `Show the rest (${paras.length - 2} more)`}</button>}
    </div>
  );
}
function Check() { return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>; }
function Spinner() { return <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />; }
