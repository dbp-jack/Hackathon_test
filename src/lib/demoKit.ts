import type { Kit, ClaudeStep } from "@/lib/types";

// Sample kit for /preview — the same knit scarf as worker/steps/mock.ts and src/lib/exampleKnit.ts, so the
// result screen can be reviewed without Supabase, Claude or ffmpeg. Media come from public/example/knit.
// Not used by the real pipeline.

export type DemoState = "building" | "ready" | "failed";

const ID = "preview";
const BASE = "/example/knit";

const ACTIONS: { step: ClaudeStep; summary: string }[] = [
  { step: "watch_footage", summary: "watched 10 s of footage" },
  { step: "score_frames", summary: "scored 300 frames, kept 5" },
  { step: "extract_attributes", summary: "identified a hand-knit scarf — chunky yarn, centre cable, powder blue" },
  { step: "research_comparables", summary: "read 40 comparable listings for price and tags" },
  { step: "write_listing", summary: "wrote the title, 13 tags and an 87-word description" },
  { step: "price", summary: "priced it at $80.00 against 40 comparables" },
  { step: "write_hooks", summary: "wrote 3 hooks: “From one ball of yarn to this”, “Every stitch, by hand.”, “Would you wear this blue?”" },
  { step: "cut_points", summary: "cut 4 videos with 3 hooks" },
  { step: "localize", summary: "wrote 4 listings for UK, DE, AU and CA — translated and priced in local currency" },
  { step: "format_for_channel", summary: "formatted for 3 channels, wrote the pin" },
];

// [role, label, file, timecode_sec, score, reason]
const FRAMES: [string, string, string, number | null, number, string][] = [
  ["hero", "Hero · 00:08", "photo-hero.jpg", 8.4, 0.94, "finished scarf laid flat, cable centred, soft even light"],
  ["detail", "Detail · 00:06", "photo-cables.jpg", 6.2, 0.91, "cable crossings fill the frame — texture reads at thumbnail size"],
  ["in_hand", "In hand · 00:07", "photo-closeup.jpg", 7.1, 0.88, "hands holding the knit, shows stitch size and drape"],
  ["process", "On the needles · 00:03", "photo-progress.jpg", 3.5, 0.86, "scarf still on the needles — proof of handmade"],
  ["scale", "Scale · 00:00", "photo-yarn.jpg", 0.8, 0.82, "ball of yarn next to the work, gives a sense of scale"],
];

const TITLE = "Hand-Knit Cable Scarf in Powder Blue | Chunky Knit Winter Scarf | Handmade Cable Knit Wrap | Cozy Gift for Her";
const TAGS = ["cable knit scarf", "hand knit scarf", "powder blue scarf", "chunky knit scarf", "handmade scarf", "winter scarf", "light blue scarf", "knitted scarf", "cozy scarf", "gift for her", "cable scarf", "handknit gift", "soft winter wrap"];
const DESCRIPTION = `Knit by hand, stitch by stitch, this scarf has a raised cable running down the middle and a soft powder blue that sits easily with grey coats, camel and cream.

It is knit in a chunky yarn on wooden needles, so every stitch is big and easy to see. The cables are crossed by hand as the scarf grows, which is why no two come out exactly alike.

Because it is made by hand, yours may differ slightly from the photos. That is how you can tell.`;

const EN_DESC = `Knitted by hand, stitch by stitch, this scarf has a raised cable running down the middle and a soft powder blue that sits easily with grey coats, camel and cream.

It is knitted in a chunky yarn on wooden needles, so every stitch is big and easy to see. The cables are crossed by hand as the scarf grows, which is why no two come out exactly alike.

Because it is made by hand, yours may differ slightly from the photos. That is how you can tell.`;
const EN_TAGS = ["cable knit scarf", "hand knitted scarf", "powder blue scarf", "chunky knit scarf", "handmade scarf", "winter scarf", "light blue scarf", "knitted scarf", "cosy scarf", "gift for her", "cable scarf", "hand knitted gift", "soft winter wrap"];

// [market, locale, currency, price_cents, fx_rate, title, tags, description] — titles/prices as in exampleKnit.ts
const LOCALES: [string, string, string, number, number, string, string[], string][] = [
  ["GB", "en-GB", "GBP", 6000, 0.75, "Hand-Knitted Cable Scarf in Powder Blue | Chunky Knit Winter Scarf", EN_TAGS, EN_DESC],
  ["DE", "de-DE", "EUR", 7100, 0.89, "Handgestrickter Schal mit Zopfmuster in Puderblau | Grobstrick-Winterschal",
    ["zopfmuster schal", "handgestrickter schal", "puderblauer schal", "grobstrick schal", "handgemachter schal", "winterschal", "hellblauer schal", "strickschal", "kuscheliger schal", "geschenk für sie", "zopfschal", "handgestrickt geschenk", "weicher winterschal"],
    `Von Hand gestrickt, Masche für Masche: Dieser Schal hat einen erhabenen Zopf in der Mitte und ein zartes Puderblau, das sich leicht mit grauen Mänteln, Camel und Creme kombinieren lässt.

Er ist aus grober Wolle auf Holznadeln gestrickt, sodass jede Masche groß und gut zu erkennen ist. Die Zöpfe werden von Hand gekreuzt, während der Schal wächst – deshalb gleicht kein Stück dem anderen.

Da er von Hand gefertigt ist, kann Ihr Schal leicht von den Fotos abweichen. Genau daran erkennt man ihn.`],
  ["AU", "en-AU", "AUD", 11400, 1.43, "Hand-Knitted Cable Scarf in Powder Blue | Chunky Winter Scarf", EN_TAGS, EN_DESC],
  ["CA", "fr-CA", "CAD", 11200, 1.40, "Foulard tricoté à la main à torsades, bleu poudre | Foulard d’hiver en grosse maille",
    ["foulard torsades", "foulard tricoté main", "foulard bleu poudre", "foulard grosse maille", "foulard fait main", "foulard d'hiver", "foulard bleu pâle", "foulard tricot", "foulard douillet", "cadeau pour elle", "écharpe torsades", "cadeau tricot main", "écharpe douce hiver"],
    `Tricoté à la main, maille après maille, ce foulard porte une torsade en relief au centre et un bleu poudre tout doux qui s’accorde facilement aux manteaux gris, camel et crème.

Il est tricoté dans une grosse laine sur des aiguilles en bois, de sorte que chaque maille est grande et bien visible. Les torsades sont croisées à la main au fil du tricot, c’est pourquoi deux foulards ne sont jamais tout à fait identiques.

Comme il est fait à la main, le vôtre peut différer légèrement des photos. C’est à cela qu’on le reconnaît.`],
];

export function demoKit(state: DemoState): Kit {
  const ready = state === "ready";
  const done = ready ? ACTIONS : state === "building" ? ACTIONS.slice(0, 4) : ACTIONS.slice(0, 2);

  return {
    id: ID,
    status: ready ? "ready" : state === "building" ? "writing" : "failed",
    product_title: state === "failed" ? null : "Hand-Knit Cable Scarf in Powder Blue",
    build_seconds: ready ? 41 : null,
    minutes_saved_est: ready ? 165 : null,
    progress: ready ? { step: "format_for_channel", pct: 100 } : state === "building" ? { step: "research_comparables", pct: 45 } : { step: "score_frames", pct: 30 },
    sources: [
      { name: "knitting_oct23.mp4", kind: "video", duration_sec: 10, frame_count: 300 },
    ],
    listing: ready ? {
      launch_id: ID, title: TITLE, title_chars: TITLE.length,
      tags: TAGS, description: DESCRIPTION, description_words: 87, cost_basis_cents: 3200, comparables_read: 40,
      price_reasoning: "Mid-range of 40 comparable hand-knit cable scarves ($30–$175, most at $75–$100); covers about $32 of yarn and 6 h of knitting with margin left.",
      price: { cents: 8000, currency: "USD", comparables: { low_cents: 3000, high_cents: 17500, count: 40 }, cost_basis_cents: 3200, reasoning: null },
    } : null,
    frames: state === "failed" ? [] : FRAMES.map(([role, label, file, sec, score, reason], i) => ({
      id: `f${i}`, launch_id: ID, source_id: null, role: role as Kit["frames"][number]["role"], timecode_sec: sec, score, score_reason: reason,
      storage_path_raw: `${BASE}/${file}`, storage_path_clean: null, sort_order: i, selected: true, label, url_raw: `${BASE}/${file}`, url_clean: null,
    })),
    videos: ready ? ([
      ["listing", "etsy", null, 10, "input.mp4"], ["short", "tiktok", "From one ball of yarn to this", 10, "short-tiktok.mp4"],
      ["short", "reels", "Every stitch, by hand.", 6, "short-reels.mp4"], ["short", "shorts", "Would you wear this blue?", 6, "short-shorts.mp4"],
    ] as const).map(([kind, platform, hook, dur, file], n) => ({
      id: `v${n}`, launch_id: ID, kind, platform, hook_text: hook, hook_rationale: null, cut_points: [], duration_sec: dur,
      aspect: kind === "listing" ? "16:9" : "9:16", has_captions: !!hook, storage_path: `${BASE}/${file}`, sort_order: n, url: `${BASE}/${file}`,
    })) : [],
    social: ready ? [
      { id: "s0", launch_id: ID, kind: "pinterest_pin", title: "Hand-knit cable scarf in powder blue — made stitch by stitch", caption: "Chunky cable knit, crossed by hand.", frame_ids: ["f0"], storage_paths: null, sort_order: 0, urls: [`${BASE}/photo-hero.jpg`] },
      { id: "s1", launch_id: ID, kind: "instagram_carousel", title: null, caption: "One ball of yarn, one pair of needles, one scarf. #handknit #cableknit #knittersofinstagram #slowfashion #powderblue", frame_ids: FRAMES.map((_, i) => `f${i}`), storage_paths: null, sort_order: 1, urls: FRAMES.map(([, , file]) => `${BASE}/${file}`) },
    ] : [],
    localizations: ready ? LOCALES.map(([market, locale, currency, cents, fx, title, tags, description], n) => ({
      id: `l${n}`, launch_id: ID, market, locale, title, tags, description, price_cents: cents, currency,
      fx_rate: fx, shipping_cents_included: 1500, enabled: true, price: { cents, currency },
    })) : [],
    publications: ready ? (["etsy", "shopify", "tiktok"] as const).map((channel) => ({
      id: `p-${channel}`, launch_id: ID, channel, status: "draft" as const, external_id: null, external_url: null,
      csv_storage_path: null, error_message: null, published_at: null,
    })) : [],
    what_claude_did: done,
  };
}
