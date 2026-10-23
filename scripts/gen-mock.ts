// Claude-powered generator for the hackathon demo dataset (mock/kits.json).
// Usage: npx tsx scripts/gen-mock.ts [--count 8] [--out mock/kits.json] [--only slug,slug]  (--only regenerates those and merges into --out)
// One Claude call per product (claude-opus-5-5 via worker/lib/claude.ts structured()), 3 at a time,
// validated in code against mock/types.ts, one retry per product with the violations appended to the prompt.
import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { structured, type Usage } from "../worker/lib/claude";
import type { MockKit, MockMarket } from "../mock/types";

const MODEL = "claude-opus-5-5";

// ---------- CLI ----------
const argv = process.argv.slice(2);
const flag = (name: string, def: string) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : def; };
const COUNT = Math.max(1, Math.min(8, Number(flag("count", "8"))));
const OUT = path.resolve(flag("out", "mock/kits.json"));
const ONLY = flag("only", "").split(",").map((x) => x.trim()).filter(Boolean);

// ---------- markets (same constants as worker/steps/localize.ts fallback) ----------
const FX: Record<string, number> = { GBP: 0.79, EUR: 0.92, AUD: 1.52, CAD: 1.36 };
const MARKETS: Record<MockMarket, { locale: string; currency: string; language: string; shipping_cents: number }> = {
  GB: { locale: "en-GB", currency: "GBP", language: "British English (en-GB spelling: colour, favourite; cm and ml)", shipping_cents: 1800 },
  DE: { locale: "de-DE", currency: "EUR", language: "German (Sie form, cm and ml, German gift occasions)", shipping_cents: 2200 },
  AU: { locale: "en-AU", currency: "AUD", language: "Australian English (en-AU spelling; cm and ml)", shipping_cents: 2600 },
  CA: { locale: "fr-CA", currency: "CAD", language: "Canadian French (fr-CA, cm and ml)", shipping_cents: 1500 },
};
const MARKET_ORDER: MockMarket[] = ["GB", "DE", "AU", "CA"];
const localPrice = (usdCents: number, m: MockMarket) => Math.round(Math.round((usdCents + MARKETS[m].shipping_cents) * FX[MARKETS[m].currency]) / 50) * 50;

const STEPS = ["watch_footage", "score_frames", "extract_attributes", "research_comparables", "write_listing", "price", "write_hooks", "cut_points", "localize", "format_for_channel"] as const;
const ROLES = ["hero", "in_hand", "detail", "process", "scale"] as const;
const PLATFORMS = ["etsy", "tiktok", "reels", "shorts"] as const;

// ---------- the fixed product list ----------
// `given` is what the model must copy verbatim; `fixed` is applied in code after generation (so the demo numbers never drift).
type Product = {
  slug: string; brief: string;
  given: Record<string, unknown>;
  fixed?: { localization_prices?: Record<MockMarket, number>; listing?: Partial<MockKit["listing"]>; frames?: Record<string, number> };
};

const PRODUCTS: Product[] = [
  {
    slug: "speckled-stoneware-mug",
    brief: "Hand-thrown speckled stoneware mug, 12 oz. This is the persona product from the pitch deck: Maya, 36, potter in Portland, Oregon. Everything below is canonical and must be reproduced exactly.",
    given: {
      category: "ceramic mug", product_title: "Hand-thrown Speckled Stoneware Mug",
      seller: { name: "Maya", city: "Portland", state: "OR", craft: "potter" },
      source: { video_name: "mug_making_oct21.mov", duration_sec: 492, fps: 30, photos: 0 },
      production_hours: 2.5,
      listing: { price_cents: 4200, price_low_cents: 3400, price_high_cents: 5800, comparables_read: 40, cost_basis_cents: 3100 },
      frames_timecode_sec: { hero: 468, in_hand: 482, detail: 375, process: 134, scale: "pick a timecode inside a scene that shows the mug next to a hand or another object" },
      frame_reasons_hint: "hero 07:48, in hand 08:02, glaze detail 06:15, on the wheel 02:14",
      videos: { etsy: { duration_sec: 15 }, tiktok: { duration_sec: 28, hook_text: "3 hours at the wheel. 30 seconds." }, reels: { duration_sec: 22, hook_text: "What goes into one $42 mug" }, shorts: { duration_sec: 19, hook_text: "No talking. Just clay." } },
      what_claude_did_hints: ["watched 8 min 12 s of footage", "scored 14,760 frames, kept 5", "read 40 comparable listings for price and tags", "wrote about 1,240 words in 5 languages", "cut 4 videos with 3 hooks"],
      title_length_target: 128, description_words_target: 212,
    },
    fixed: { localization_prices: { GB: 3350, DE: 3900, AU: 6400, CA: 5700 } },
  },
  {
    slug: "knit-cable-scarf",
    brief: "Hand-knit cable scarf in powder blue. This is the worked example on the /example page; the listing title, tags, price, hooks and market titles are canonical and must be reproduced exactly. Only what a 10-second knitting video shows may be claimed (yarn fibre, exact size and care are NOT visible — describe them as chunky yarn on wooden needles, and say the seller will confirm fibre and care).",
    given: {
      category: "knit scarf", product_title: "Hand-Knit Cable Scarf in Powder Blue",
      seller: { name: "Ellie", city: "Burlington", state: "VT", craft: "knitter" },
      source: { video_name: "knitting_oct23.mp4", duration_sec: 10, fps: 30, photos: 0 },
      listing: {
        title: "Hand-Knit Cable Scarf in Powder Blue | Chunky Knit Winter Scarf | Handmade Cable Knit Wrap | Cozy Gift for Her",
        tags: ["cable knit scarf", "hand knit scarf", "powder blue scarf", "chunky knit scarf", "handmade scarf", "winter scarf", "light blue scarf", "knitted scarf", "cozy scarf", "gift for her", "cable scarf", "handknit gift", "soft winter wrap"],
        price_cents: 8000, price_low_cents: 3000, price_high_cents: 17500, comparables_read: 40,
        price_note: "Etsy cable knit scarves run $30–$175 with most hand-knit chunky ones at $75–$100",
      },
      frames_timecode_sec: { hero: 8.4, detail: 6.2, in_hand: 7.1, process: 3.5, scale: 0.8 },
      videos: { etsy: { duration_sec: 10 }, tiktok: { duration_sec: 10, hook_text: "From one ball of yarn to this" }, reels: { duration_sec: 6, hook_text: "Every stitch, by hand." }, shorts: { duration_sec: 6, hook_text: "Would you wear this blue?" } },
      video_rule_override: "The source video is only 10 s long, so all cuts must lie within 0–10 s and the per-platform duration targets above replace the usual 12–30 s rules.",
      localization_titles: {
        GB: "Hand-Knitted Cable Scarf in Powder Blue | Chunky Knit Winter Scarf",
        DE: "Handgestrickter Schal mit Zopfmuster in Puderblau | Grobstrick-Winterschal",
        AU: "Hand-Knitted Cable Scarf in Powder Blue | Chunky Winter Scarf",
        CA: "Foulard tricoté à la main à torsades, bleu poudre | Foulard d’hiver en grosse maille",
      },
    },
    fixed: {
      localization_prices: { GB: 6000, DE: 7100, AU: 11400, CA: 11200 },
      listing: {
        title: "Hand-Knit Cable Scarf in Powder Blue | Chunky Knit Winter Scarf | Handmade Cable Knit Wrap | Cozy Gift for Her",
        tags: ["cable knit scarf", "hand knit scarf", "powder blue scarf", "chunky knit scarf", "handmade scarf", "winter scarf", "light blue scarf", "knitted scarf", "cozy scarf", "gift for her", "cable scarf", "handknit gift", "soft winter wrap"],
        price_cents: 8000, price_low_cents: 3000, price_high_cents: 17500,
      },
      frames: { hero: 8.4, detail: 6.2, in_hand: 7.1, process: 3.5, scale: 0.8 },
    },
  },
  { slug: "walnut-cutting-board", brief: "End-grain or edge-grain black walnut cutting board, hand-finished with food-safe oil. The seller below is fixed. Source video 2–9 minutes.", given: { category: "cutting board", seller: { name: "Dana Whitfield", city: "Knoxville", state: "TN", craft: "woodworker" } } },
  { slug: "soy-candle-amber", brief: "Hand-poured soy wax candle in an amber glass jar with a cotton wick. The seller below is fixed. Source video 2–9 minutes.", given: { category: "soy candle", seller: { name: "Rosa Delgado", city: "Tucson", state: "AZ", craft: "chandler" } } },
  { slug: "leather-card-wallet", brief: "Hand-stitched full-grain leather card wallet (saddle stitch, burnished edges). The seller below is fixed. Source video 2–9 minutes.", given: { category: "leather wallet", seller: { name: "Anders Holm", city: "Duluth", state: "MN", craft: "leatherworker" } } },
  { slug: "macrame-wall-hanging", brief: "Macramé wall hanging in natural cotton cord on a driftwood or dowel rod. The seller below is fixed. Source video 2–9 minutes.", given: { category: "macrame wall hanging", seller: { name: "Hannah Reyes", city: "Boise", state: "ID", craft: "fiber artist" } } },
  { slug: "linen-tote-bag", brief: "Sewn linen tote bag with an interior pocket and reinforced straps. The seller below is fixed. Source video 2–9 minutes.", given: { category: "linen tote bag", seller: { name: "Tess Whitaker", city: "Dubuque", state: "IA", craft: "sewist" } } },
  { slug: "sterling-stacking-rings", brief: "Set of three hammered sterling silver stacking rings. The seller below is fixed. Source video 2–9 minutes.", given: { category: "sterling silver rings", seller: { name: "Priya Natarajan", city: "Asheville", state: "NC", craft: "metalsmith" } } },
];

// ---------- prompt ----------
const SYSTEM = `You generate ONE complete demo record for "Launch Kit", a hackathon project: a solo handmade seller films one making-of video on their phone, and Claude turns it into an Etsy listing, 5 product photos, 4 short videos, 4 localized listings and a Pinterest pin / Instagram carousel. The judging criterion is "same resources, N× value": the seller puts in one product and one video and gets seven channels back. Every what_claude_did summary must therefore carry a concrete number (frames scored, comparables read, words written, videos cut, languages).

Audience and voice: US English, USD. The record is fictional but must read as real: a plausible solo seller, a plausible phone video, plausible Etsy prices. Be honest and conservative: only claim attributes a making-of video could actually show (what is visible on camera); say "the seller will confirm" for anything it cannot show (e.g. fibre content, exact fragrance oil, metal purity stamps).

Etsy listing rules (the live pipeline enforces them, so do you):
- Title ≤140 characters, front-load the exact product noun, separate 3–5 phrases with " | ", include one gift angle and one feature. No ALL CAPS, no emoji.
- Exactly 13 tags, each ≤20 characters, all lowercase, multi-word long-tail phrases, no single word repeated more than 3 times across the tags.
- Description 180–260 words, first person, plain sentences, exactly 4 paragraphs separated by a blank line. P1: what it is and how it feels to use. P2: materials, exact dimensions (inches/oz), care. P3: made-to-order / lead time / ships from <city>. P4: a one-line note that each piece varies. No hype words (stunning, amazing, perfect, gorgeous, beautiful, unique, must-have).
- Price: a point inside the comparable range (price_low_cents..price_high_cents) that reflects production hours; price_reasoning in two sentences. cost_basis_cents = materials estimate + production_hours × $12/h. comparables_read is typically 30–45.

Frames: exactly 5, one per role in this order: hero, in_hand, detail, process, scale. timecode_sec inside the video (0..duration). score 0–100 (hero highest). reason names what the frame shows (focus, light, composition).
Scenes: 4–8 scenes covering the whole video in order, non-overlapping, with start/end seconds inside the duration.

Videos: exactly 4, one per platform, in this order:
1) kind "listing", platform "etsy": 12–15 s, 3 cuts, no hooks, no captions — process/finish rhythm.
2) kind "short", platform "tiktok": 20–30 s, hook style time compression ("3 hours at the wheel. 30 seconds.").
3) kind "short", platform "reels": 18–25 s, hook style cost/what-goes-in ("What goes into one $42 mug"); captions name materials and hours.
4) kind "short", platform "shorts": 15–20 s, hook style no talking / ASMR — at most one caption.
Each cut 2–6 s, in < out, both inside [0, duration_sec] of the source video and inside a real scene; the last cut always shows the finished product; duration_sec equals the sum of cut lengths (±0.5 s). hook_text ≤50 chars (null for etsy), captions ≤40 chars or null. hook_rationale: one sentence on why this hook fits the platform.

Localizations: exactly 4, in this order: GB (en-GB, GBP), DE (de-DE, EUR), AU (en-AU, AUD), CA (fr-CA, CAD). Translate meaning, not words: convert units to cm and ml, use en-GB / en-AU spelling (colour, favourite, centimetre), proper German and Canadian French, local gift occasions. Title ≤140 chars; exactly 13 lowercase tags ≤20 chars in the target language; description keeps the 4-paragraph structure. price_cents = round((usd_price_cents + shipping_cents_for_market) × fx) to the nearest 50 cents, with fx GBP 0.79, EUR 0.92, AUD 1.52, CAD 1.36 and shipping GB 1800, DE 2200, AU 2600, CA 1500 cents.

Social: pin_title ≤60 chars, concrete, no hashtags. pin_caption 1–2 sentences. carousel_caption ≤150 chars plus exactly 5 hashtags.

what_claude_did: exactly 10 entries in this order with these step ids: watch_footage, score_frames, extract_attributes, research_comparables, write_listing, price, write_hooks, cut_points, localize, format_for_channel. Summaries are lowercase, short, in the voice of the pipeline logs, each with a number, e.g.
  "watched 8 min 12 s of footage" · "scored 14,760 frames, kept 5" (frames = duration_sec × fps, formatted with a thousands separator) · "identified a ceramic mug — stoneware clay, speckled glaze; 6 scenes" · "read 40 comparable listings for price and tags" · "wrote the title, 13 tags and a 212-word description" · "priced it at $42.00 against 40 comparables" · "wrote 3 hooks: “…”, “…”, “…”" · "cut 4 videos with 3 hooks, 13 cuts" · "wrote about 1,240 words in 5 languages" · "formatted for 3 channels, wrote the pin".
The numbers must agree with the rest of the record (word counts, frame count, comparables, price).

image_queries: 3–5 concrete Creative-Commons photo search phrases, most specific first (e.g. "speckled stoneware mug", "pottery wheel hands clay", "ceramic mug on wooden table").
build_seconds: 150–330. minutes_saved_est: 170–200.
Copy every value in the GIVEN block verbatim where a field is given; invent the rest realistically. Fill the slug exactly as given.`;

const SCHEMA = {
  type: "object",
  required: ["slug", "category", "product_title", "image_queries", "seller", "source", "attributes", "scenes", "frames", "listing", "videos", "localizations", "social", "what_claude_did", "build_seconds", "minutes_saved_est"],
  properties: {
    slug: { type: "string" }, category: { type: "string" }, product_title: { type: "string" },
    image_queries: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
    seller: { type: "object", required: ["name", "city", "state", "craft"], properties: { name: { type: "string" }, city: { type: "string" }, state: { type: "string" }, craft: { type: "string" } } },
    source: { type: "object", required: ["video_name", "duration_sec", "fps", "photos"], properties: { video_name: { type: "string" }, duration_sec: { type: "number" }, fps: { type: "integer" }, photos: { type: "integer" } } },
    attributes: {
      type: "object", required: ["materials", "colors", "dimensions", "care", "production_hours", "made_to_order", "lead_time_days"],
      properties: {
        materials: { type: "array", items: { type: "string" } }, colors: { type: "array", items: { type: "string" } },
        dimensions: { type: "object", additionalProperties: { type: ["number", "string"] } },
        care: { type: "array", items: { type: "string" } }, production_hours: { type: "number" }, made_to_order: { type: "boolean" },
        lead_time_days: { type: "array", items: { type: "integer" }, minItems: 2, maxItems: 2 },
      },
    },
    scenes: { type: "array", minItems: 4, maxItems: 8, items: { type: "object", required: ["label", "start_sec", "end_sec", "what_happens"], properties: { label: { type: "string" }, start_sec: { type: "number" }, end_sec: { type: "number" }, what_happens: { type: "string" } } } },
    frames: { type: "array", minItems: 5, maxItems: 5, items: { type: "object", required: ["role", "timecode_sec", "score", "reason"], properties: { role: { type: "string", enum: [...ROLES] }, timecode_sec: { type: ["number", "null"] }, score: { type: "number" }, reason: { type: "string" } } } },
    listing: {
      type: "object", required: ["title", "tags", "description", "price_cents", "price_low_cents", "price_high_cents", "comparables_read", "cost_basis_cents", "price_reasoning"],
      properties: {
        title: { type: "string", maxLength: 140 }, tags: { type: "array", items: { type: "string", maxLength: 20 }, minItems: 13, maxItems: 13 }, description: { type: "string" },
        price_cents: { type: "integer" }, price_low_cents: { type: "integer" }, price_high_cents: { type: "integer" }, comparables_read: { type: "integer" }, cost_basis_cents: { type: "integer" }, price_reasoning: { type: "string" },
      },
    },
    videos: {
      type: "array", minItems: 4, maxItems: 4,
      items: {
        type: "object", required: ["kind", "platform", "hook_text", "hook_rationale", "duration_sec", "cuts"],
        properties: {
          kind: { type: "string", enum: ["listing", "short"] }, platform: { type: "string", enum: [...PLATFORMS] },
          hook_text: { type: ["string", "null"], maxLength: 50 }, hook_rationale: { type: ["string", "null"] }, duration_sec: { type: "number" },
          cuts: { type: "array", minItems: 1, maxItems: 10, items: { type: "object", required: ["in", "out", "caption"], properties: { in: { type: "number" }, out: { type: "number" }, caption: { type: ["string", "null"], maxLength: 40 } } } },
        },
      },
    },
    localizations: {
      type: "array", minItems: 4, maxItems: 4,
      items: {
        type: "object", required: ["market", "locale", "currency", "price_cents", "title", "tags", "description"],
        properties: { market: { type: "string", enum: MARKET_ORDER }, locale: { type: "string" }, currency: { type: "string" }, price_cents: { type: "integer" }, title: { type: "string", maxLength: 140 }, tags: { type: "array", items: { type: "string" }, minItems: 13, maxItems: 13 }, description: { type: "string" } },
      },
    },
    social: { type: "object", required: ["pin_title", "pin_caption", "carousel_caption"], properties: { pin_title: { type: "string", maxLength: 60 }, pin_caption: { type: "string" }, carousel_caption: { type: "string" } } },
    what_claude_did: { type: "array", minItems: 10, maxItems: 10, items: { type: "object", required: ["step", "summary"], properties: { step: { type: "string", enum: [...STEPS] }, summary: { type: "string" } } } },
    build_seconds: { type: "integer" }, minutes_saved_est: { type: "integer" },
  },
};

// ---------- validation (mirrors mock/types.ts comments + pipeline rules) ----------
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const HYPE = /\b(stunning|amazing|perfect|gorgeous|must-have)\b/i;

function validate(kit: MockKit, p: Product): string[] {
  const v: string[] = [];
  const dur = kit.source?.duration_sec ?? 0;
  if (kit.slug !== p.slug) v.push(`slug must be "${p.slug}" (got "${kit.slug}")`);
  if (!(kit.image_queries?.length >= 3 && kit.image_queries.length <= 5)) v.push("image_queries must have 3–5 entries");
  if (!(dur > 0) || !(kit.source.fps > 0)) v.push("source.duration_sec and fps must be positive");

  const L = kit.listing;
  if (!L) v.push("listing missing");
  else {
    if (L.title.length > 140) v.push(`listing.title is ${L.title.length} chars (max 140)`);
    if (!L.title.includes(" | ")) v.push('listing.title must separate phrases with " | "');
    if (L.tags.length !== 13) v.push(`listing.tags has ${L.tags.length} tags (need exactly 13)`);
    L.tags.forEach((t, i) => { if (t.length > 20) v.push(`listing.tags[${i}] "${t}" is ${t.length} chars (max 20)`); if (t !== t.toLowerCase()) v.push(`listing.tags[${i}] "${t}" must be lowercase`); });
    const w = words(L.description);
    if (w < 180 || w > 260) v.push(`listing.description has ${w} words (need 180–260)`);
    const paras = L.description.split(/\n\s*\n/).filter((x) => x.trim());
    if (paras.length !== 4) v.push(`listing.description has ${paras.length} paragraphs (need exactly 4, separated by blank lines)`);
    const hype = L.description.match(HYPE); if (hype) v.push(`listing.description contains hype word "${hype[0]}"`);
    if (L.price_cents < L.price_low_cents || L.price_cents > L.price_high_cents) v.push(`listing.price_cents ${L.price_cents} is outside comparable range ${L.price_low_cents}–${L.price_high_cents}`);
    if (!(L.comparables_read > 0)) v.push("listing.comparables_read must be > 0");
  }

  if (kit.frames?.length !== 5) v.push(`frames has ${kit.frames?.length ?? 0} entries (need 5)`);
  else ROLES.forEach((r) => { const n = kit.frames.filter((f) => f.role === r).length; if (n !== 1) v.push(`frames needs exactly one "${r}" (got ${n})`); });
  kit.frames?.forEach((f) => { if (f.timecode_sec != null && (f.timecode_sec < 0 || f.timecode_sec > dur)) v.push(`frame ${f.role} timecode ${f.timecode_sec} outside [0, ${dur}]`); });

  if (kit.videos?.length !== 4) v.push(`videos has ${kit.videos?.length ?? 0} entries (need 4)`);
  else PLATFORMS.forEach((pl) => { const n = kit.videos.filter((x) => x.platform === pl).length; if (n !== 1) v.push(`videos needs exactly one "${pl}" (got ${n})`); });
  kit.videos?.forEach((x) => {
    if (!x.cuts?.length) v.push(`video ${x.platform} has no cuts`);
    x.cuts?.forEach((c, i) => { if (c.in < 0 || c.out > dur || c.out <= c.in) v.push(`video ${x.platform} cut[${i}] ${c.in}–${c.out} must satisfy 0 ≤ in < out ≤ ${dur}`); if (c.caption && c.caption.length > 40) v.push(`video ${x.platform} cut[${i}] caption >40 chars`); });
    if (x.hook_text && x.hook_text.length > 50) v.push(`video ${x.platform} hook_text >50 chars`);
    if ((x.platform === "etsy") !== (x.kind === "listing")) v.push(`video ${x.platform} kind must be ${x.platform === "etsy" ? "listing" : "short"}`);
  });

  if (kit.localizations?.length !== 4) v.push(`localizations has ${kit.localizations?.length ?? 0} entries (need 4)`);
  else MARKET_ORDER.forEach((m) => { const n = kit.localizations.filter((x) => x.market === m).length; if (n !== 1) v.push(`localizations needs exactly one "${m}" (got ${n})`); });
  kit.localizations?.forEach((x) => {
    if (x.title.length > 140) v.push(`localization ${x.market} title >140 chars`);
    if (x.tags.length !== 13) v.push(`localization ${x.market} has ${x.tags.length} tags (need 13)`);
    x.tags.forEach((t, i) => { if (t.length > 20) v.push(`localization ${x.market} tag[${i}] "${t}" >20 chars`); if (t !== t.toLowerCase()) v.push(`localization ${x.market} tag[${i}] "${t}" must be lowercase`); });
    if (words(x.description) < 120) v.push(`localization ${x.market} description too short (${words(x.description)} words)`);
  });

  if (kit.what_claude_did?.length !== 10) v.push(`what_claude_did has ${kit.what_claude_did?.length ?? 0} entries (need 10)`);
  else kit.what_claude_did.forEach((s, i) => {
    if (s.step !== STEPS[i]) v.push(`what_claude_did[${i}].step must be "${STEPS[i]}" (got "${s.step}")`);
    if (!/\d/.test(s.summary)) v.push(`what_claude_did[${i}] "${s.summary}" must contain a number`);
  });
  if (!(kit.build_seconds >= 150 && kit.build_seconds <= 330)) v.push(`build_seconds ${kit.build_seconds} must be 150–330`);
  if (!(kit.minutes_saved_est >= 170 && kit.minutes_saved_est <= 200)) v.push(`minutes_saved_est ${kit.minutes_saved_est} must be 170–200`);
  if (kit.social?.pin_title?.length > 60) v.push("social.pin_title >60 chars");
  return v;
}

// Deterministic post-processing: pinned demo values + computed localized prices.
function applyFixed(kit: MockKit, p: Product): MockKit {
  kit.slug = p.slug;
  if (p.fixed?.listing) Object.assign(kit.listing, p.fixed.listing);
  if (p.fixed?.frames) for (const f of kit.frames ?? []) if (p.fixed.frames[f.role] != null) f.timecode_sec = p.fixed.frames[f.role];
  for (const l of kit.localizations ?? []) {
    const m = MARKETS[l.market]; if (!m) continue;
    l.locale = m.locale; l.currency = m.currency;
    l.price_cents = p.fixed?.localization_prices?.[l.market] ?? localPrice(kit.listing.price_cents, l.market);
  }
  kit.localizations?.sort((a, b) => MARKET_ORDER.indexOf(a.market) - MARKET_ORDER.indexOf(b.market));
  kit.frames?.sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role));
  kit.videos?.sort((a, b) => PLATFORMS.indexOf(a.platform) - PLATFORMS.indexOf(b.platform));
  return kit;
}

// ---------- generation ----------
async function generate(p: Product, index: number): Promise<{ kit: MockKit; usages: Usage[]; retried: boolean }> {
  const usages: Usage[] = [];
  let violations: string[] = [];
  let last: MockKit | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const content = `Product ${index + 1} of ${PRODUCTS.length}: slug "${p.slug}".
${p.brief}

GIVEN (copy verbatim; "hint" fields guide but are not copied):
${JSON.stringify(p.given, null, 2)}
${violations.length ? `\nYour previous attempt failed validation. Fix every item below and return the complete record again:\n- ${violations.join("\n- ")}\n` : ""}
Call make_kit once with the complete record.`;
    const { data, usage } = await structured<MockKit>({ model: MODEL, system: SYSTEM, content, schema: SCHEMA, toolName: "make_kit", maxTokens: 16000 }); // SDK caps non-streaming requests around here; the retry covers a truncated first answer
    usages.push(usage);
    last = applyFixed(data, p);
    violations = validate(last, p);
    if (!violations.length) return { kit: last, usages, retried: attempt > 0 };
    console.warn(`[${p.slug}] attempt ${attempt + 1} failed validation:\n  - ${violations.join("\n  - ")}`);
  }
  throw new Error(`[${p.slug}] still invalid after retry:\n  - ${violations.join("\n  - ")}`);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set (load it via .env)");
  const products = ONLY.length ? PRODUCTS.filter((p) => ONLY.includes(p.slug)) : PRODUCTS.slice(0, COUNT);
  if (ONLY.length && products.length !== ONLY.length) throw new Error(`unknown slug in --only: ${ONLY.filter((s) => !PRODUCTS.some((p) => p.slug === s)).join(", ")}`);
  console.log(`gen-mock: ${products.length} products with ${MODEL}, 3 at a time → ${OUT}`);
  const t0 = Date.now();
  const results: { kit: MockKit; usages: Usage[]; retried: boolean }[] = [];
  const failures: string[] = [];
  for (let i = 0; i < products.length; i += 3) {
    const batch = products.slice(i, i + 3);
    const settled = await Promise.all(batch.map((p, j) => generate(p, i + j).then((r) => { console.log(`  done ${p.slug} (${r.usages.length} call${r.usages.length > 1 ? "s" : ""})`); return r; }).catch((e) => { failures.push(e instanceof Error ? e.message : String(e)); return null; })));
    for (const r of settled) if (r) results.push(r);
  }
  // keep the fixed order
  results.sort((a, b) => PRODUCTS.findIndex((p) => p.slug === a.kit.slug) - PRODUCTS.findIndex((p) => p.slug === b.kit.slug));

  // --only: merge regenerated kits into the existing file, keeping the canonical order
  let kits = results.map((r) => r.kit);
  if (ONLY.length) {
    const existing: MockKit[] = await readFile(OUT, "utf8").then((t) => JSON.parse(t) as MockKit[]).catch(() => []);
    const merged = new Map(existing.map((k) => [k.slug, k]));
    for (const k of kits) merged.set(k.slug, k);
    kits = PRODUCTS.map((p) => merged.get(p.slug)).filter((k): k is MockKit => !!k);
  }
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(kits, null, 2) + "\n");

  console.log("\nslug | title chars | price | build_seconds | retried");
  for (const r of results) console.log(`${r.kit.slug} | ${r.kit.listing.title.length} | $${(r.kit.listing.price_cents / 100).toFixed(2)} | ${r.kit.build_seconds}s${r.retried ? " | retried" : ""}`);
  const all = results.flatMap((r) => r.usages);
  const inTok = all.reduce((s, u) => s + u.input_tokens, 0), outTok = all.reduce((s, u) => s + u.output_tokens, 0), cents = all.reduce((s, u) => s + u.cost_cents, 0);
  console.log(`\n${all.length} Claude calls · ${inTok.toLocaleString()} in / ${outTok.toLocaleString()} out tokens · $${(cents / 100).toFixed(2)} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  console.log(`wrote ${results.length} kit(s)${ONLY.length ? ` (merged into ${kits.length})` : ""} → ${OUT}`);
  if (failures.length) { console.error(`\n${failures.length} product(s) FAILED:\n${failures.join("\n")}`); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
