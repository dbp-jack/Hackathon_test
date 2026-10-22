import type { Kit, ClaudeStep } from "@/lib/types";

// Sample kit for /preview — the same mug as worker/steps/mock.ts, so the result screen
// can be reviewed without Supabase, Claude or ffmpeg. Not used by the real pipeline.

export type DemoState = "building" | "ready" | "failed";

const ID = "preview";
const swatch = (hex: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="${hex}"/></svg>`)}`;

const ACTIONS: { step: ClaudeStep; summary: string }[] = [
  { step: "watch_footage", summary: "watched 8 min 12 s of footage" },
  { step: "score_frames", summary: "scored 14,760 frames, kept 5" },
  { step: "extract_attributes", summary: "identified a ceramic mug — stoneware clay, food-safe glaze" },
  { step: "research_comparables", summary: "read 40 comparable listings for price and tags" },
  { step: "write_listing", summary: "wrote the title, 13 tags and a 212-word description" },
  { step: "price", summary: "priced it at $42.00 against 40 comparables" },
  { step: "write_hooks", summary: "wrote 3 hooks: “3 hours at the wheel. 30 seconds.”, “What goes into one $42 mug”, “No talking. Just clay.”" },
  { step: "cut_points", summary: "cut 4 videos with 3 hooks" },
  { step: "localize", summary: "wrote about 1,240 words in 5 languages" },
  { step: "format_for_channel", summary: "formatted for 3 channels" },
];

const FRAMES: [string, string, string, number | null, number, string][] = [
  ["hero", "Hero · 07:48", "#D9CBB8", 468, 0.93, "sharp focus, glaze visible, neutral background"],
  ["in_hand", "In hand · 08:02", "#C9B8A3", 482, 0.88, "shows scale and grip"],
  ["detail", "Detail · 06:15", "#E3D8C8", 375, 0.86, "speckle texture fills the frame"],
  ["process", "On the wheel · 02:14", "#A89C8C", 134, 0.84, "hands centering clay — proof of handmade"],
  ["scale", "Scale", "#CFC4B4", null, 0.8, "uploaded photo next to a notebook"],
];

const TITLE = "Handmade Speckled Stoneware Mug 12 oz | Wheel-Thrown Ceramic Coffee Cup | Minimalist Pottery Gift for Her | Microwave Safe";
const DESCRIPTION = `Thrown on the wheel in my Portland studio, this 12 oz mug is glazed in a warm speckled white that shows the clay body underneath. It holds comfortably in one hand, the handle fits three fingers, and it goes through the microwave and dishwasher without complaint.

Materials: stoneware clay, food-safe glaze. Size: 3.6 in tall, 3.2 in across, holds 12 oz. Hand wash is kindest to the glaze, but it is dishwasher safe.

Each mug is made to order and ships in 5–7 days from Oregon, wrapped in recycled paper. If you would like a set, message me and I will throw them together so they match.

Because every one is thrown by hand, yours will be a little different from the photos — that is the point.`;

export function demoKit(state: DemoState): Kit {
  const ready = state === "ready";
  const done = ready ? ACTIONS : state === "building" ? ACTIONS.slice(0, 4) : ACTIONS.slice(0, 2);

  return {
    id: ID,
    status: ready ? "ready" : state === "building" ? "writing" : "failed",
    product_title: state === "failed" ? null : "Hand-thrown Speckled Stoneware Mug",
    build_seconds: ready ? 272 : null,
    minutes_saved_est: ready ? 170 : null,
    progress: ready ? { step: "format_for_channel", pct: 100 } : state === "building" ? { step: "research_comparables", pct: 45 } : { step: "score_frames", pct: 30 },
    sources: [
      { name: "mug_making_oct21.mov", kind: "video", duration_sec: 492, frame_count: 14760 },
      { name: "IMG_2041.jpg", kind: "photo", duration_sec: null, frame_count: null },
      { name: "IMG_2042.jpg", kind: "photo", duration_sec: null, frame_count: null },
    ],
    listing: ready ? {
      launch_id: ID, title: TITLE, title_chars: TITLE.length,
      tags: ["speckled mug", "handmade ceramic mug", "stoneware coffee cup", "wheel thrown pottery", "pottery gift for her", "minimalist mug", "12 oz mug", "rustic kitchen", "housewarming gift", "microwave safe mug", "artisan ceramics", "cozy mug", "handmade in oregon"],
      description: DESCRIPTION, description_words: 212, cost_basis_cents: 3100, comparables_read: 40,
      price_reasoning: "Mid-range of 40 comparable 12 oz speckled mugs; keeps a 35% margin over materials and 2.5 h of labor.",
      price: { cents: 4200, currency: "USD", comparables: { low_cents: 3400, high_cents: 5800, count: 40 }, cost_basis_cents: 3100, reasoning: null },
    } : null,
    frames: state === "failed" ? [] : FRAMES.map(([role, label, hex, sec, score, reason], i) => ({
      id: `f${i}`, launch_id: ID, source_id: null, role: role as Kit["frames"][number]["role"], timecode_sec: sec, score, score_reason: reason,
      storage_path_raw: "", storage_path_clean: null, sort_order: i, selected: true, label, url_raw: swatch(hex), url_clean: null,
    })),
    videos: ready ? ([
      ["listing", "etsy", null, 15], ["short", "tiktok", "3 hours at the wheel. 30 seconds.", 28],
      ["short", "reels", "What goes into one $42 mug", 22], ["short", "shorts", "No talking. Just clay.", 19],
    ] as const).map(([kind, platform, hook, dur], n) => ({
      id: `v${n}`, launch_id: ID, kind, platform, hook_text: hook, hook_rationale: null, cut_points: [], duration_sec: dur,
      aspect: "9:16", has_captions: !!hook, storage_path: null, sort_order: n, url: null,
    })) : [],
    social: ready ? [
      { id: "s0", launch_id: ID, kind: "pinterest_pin", title: "Handmade speckled mug — slow mornings start here", caption: "Thrown by hand in Portland.", frame_ids: [], storage_paths: null, sort_order: 0, urls: [] },
      { id: "s1", launch_id: ID, kind: "instagram_carousel", title: null, caption: "One mug, three hours, one pair of hands.", frame_ids: [], storage_paths: null, sort_order: 1, urls: [] },
    ] : [],
    localizations: ready ? ([["AU", "en-AU", "AUD", 6400], ["CA", "fr-CA", "CAD", 5700], ["DE", "de-DE", "EUR", 3900], ["GB", "en-GB", "GBP", 3350]] as const).map(([market, locale, currency, cents], n) => ({
      id: `l${n}`, launch_id: ID, market, locale, title: TITLE, tags: [], description: "", price_cents: cents, currency,
      fx_rate: null, shipping_cents_included: 2000, enabled: true, price: { cents, currency },
    })) : [],
    publications: ready ? (["etsy", "shopify", "tiktok"] as const).map((channel) => ({
      id: `p-${channel}`, launch_id: ID, channel, status: "draft" as const, external_id: null, external_url: null,
      csv_storage_path: null, error_message: null, published_at: null,
    })) : [],
    what_claude_did: done,
  };
}
