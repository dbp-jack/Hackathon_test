import type { Kit, FrameRole } from "@/lib/types";
import type { MockKit } from "../../mock/types";
import kits from "../../mock/kits.json";
import { KNIT_SLUG, KNIT_PUBLIC_FILES, KNIT_PUBLIC_VIDEOS, FRAME_ROLES, findKit, kitActions, wordCount, frameCount, fxRate } from "@/lib/mockKits";
import { fmtTimecode } from "@/lib/types";

// Sample kit for /preview — the knit-cable-scarf kit from mock/kits.json (same dataset the MOCK_MODE worker
// emits), with media served from public/example/knit so the result screen can be reviewed without Supabase,
// Claude or ffmpeg. Not used by the real pipeline.

export type DemoState = "building" | "ready" | "failed";

const ID = "preview";
const BASE = "/example/knit";
const ROLE_LABEL: Record<string, string> = { hero: "Hero", in_hand: "In hand", detail: "Detail", process: "On the needles", scale: "Scale" };

const KIT: MockKit = findKit(kits as unknown as MockKit[], KNIT_SLUG) ?? (kits as unknown as MockKit[])[0];
const ACTIONS = kitActions(KIT);
const FRAMES = FRAME_ROLES.flatMap((role) => KIT.frames.filter((f) => f.role === role));

export function demoKit(state: DemoState): Kit {
  const ready = state === "ready";
  const done = ready ? ACTIONS : state === "building" ? ACTIONS.slice(0, 4) : ACTIONS.slice(0, 2);
  const { listing, source } = KIT;
  const frameUrl = (role: string) => `${BASE}/${KNIT_PUBLIC_FILES[role as keyof typeof KNIT_PUBLIC_FILES] ?? KNIT_PUBLIC_FILES.hero}`;

  return {
    id: ID,
    status: ready ? "ready" : state === "building" ? "writing" : "failed",
    product_title: state === "failed" ? null : KIT.product_title,
    build_seconds: ready ? KIT.build_seconds : null,
    minutes_saved_est: ready ? KIT.minutes_saved_est : null,
    progress: ready ? { step: "format_for_channel", pct: 100 } : state === "building" ? { step: "research_comparables", pct: 45 } : { step: "score_frames", pct: 30 },
    sources: [
      { name: source.video_name, kind: "video", duration_sec: source.duration_sec, frame_count: frameCount(KIT) },
    ],
    listing: ready ? {
      launch_id: ID, title: listing.title, title_chars: listing.title.length,
      tags: listing.tags, description: listing.description, description_words: wordCount(listing.description),
      cost_basis_cents: listing.cost_basis_cents, comparables_read: listing.comparables_read, price_reasoning: listing.price_reasoning,
      price: { cents: listing.price_cents, currency: "USD", comparables: { low_cents: listing.price_low_cents, high_cents: listing.price_high_cents, count: listing.comparables_read }, cost_basis_cents: listing.cost_basis_cents, reasoning: null },
    } : null,
    frames: state === "failed" ? [] : FRAMES.map((f, i) => ({
      id: `f${i}`, launch_id: ID, source_id: null, role: f.role as FrameRole, timecode_sec: f.timecode_sec, score: f.score, score_reason: f.reason,
      storage_path_raw: frameUrl(f.role), storage_path_clean: null, sort_order: i, selected: true,
      label: `${ROLE_LABEL[f.role] ?? f.role}${f.timecode_sec != null ? ` · ${fmtTimecode(f.timecode_sec)}` : ""}`,
      url_raw: frameUrl(f.role), url_clean: null,
    })),
    videos: ready ? KIT.videos.map((v, n) => ({
      id: `v${n}`, launch_id: ID, kind: v.kind, platform: v.platform, hook_text: v.hook_text, hook_rationale: v.hook_rationale, cut_points: v.cuts, duration_sec: v.duration_sec,
      aspect: v.kind === "listing" ? "16:9" : "9:16", has_captions: !!v.hook_text, storage_path: `${BASE}/${KNIT_PUBLIC_VIDEOS[v.platform]}`, sort_order: n, url: `${BASE}/${KNIT_PUBLIC_VIDEOS[v.platform]}`,
    })) : [],
    social: ready ? [
      { id: "s0", launch_id: ID, kind: "pinterest_pin", title: KIT.social.pin_title, caption: KIT.social.pin_caption, frame_ids: ["f0"], storage_paths: null, sort_order: 0, urls: [frameUrl(FRAMES[0]?.role ?? "hero")] },
      { id: "s1", launch_id: ID, kind: "instagram_carousel", title: null, caption: KIT.social.carousel_caption, frame_ids: FRAMES.map((_, i) => `f${i}`), storage_paths: null, sort_order: 1, urls: FRAMES.map((f) => frameUrl(f.role)) },
    ] : [],
    localizations: ready ? KIT.localizations.map((l, n) => ({
      id: `l${n}`, launch_id: ID, market: l.market, locale: l.locale, title: l.title, tags: l.tags, description: l.description, price_cents: l.price_cents, currency: l.currency,
      fx_rate: fxRate(KIT, l), shipping_cents_included: 1500, enabled: true, price: { cents: l.price_cents, currency: l.currency },
    })) : [],
    publications: ready ? (["etsy", "shopify", "tiktok"] as const).map((channel) => ({
      id: `p-${channel}`, launch_id: ID, channel, status: "draft" as const, external_id: null, external_url: null,
      csv_storage_path: null, error_message: null, published_at: null,
    })) : [],
    what_claude_did: done,
  };
}
