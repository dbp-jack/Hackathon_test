import { readFile } from "node:fs/promises";
import path from "node:path";
import { db, upload, logAction, setStatus } from "../lib/db";
import type { LaunchRow } from "../../src/lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Sample assets for the demo scarf (same files as /example and src/lib/exampleKnit.ts). The worker runs from repo root.
const KNIT_DIR = path.resolve(process.cwd(), "public/example/knit");
const asset = (name: string) => readFile(path.join(KNIT_DIR, name));

const TITLE = "Hand-Knit Cable Scarf in Powder Blue | Chunky Knit Winter Scarf | Handmade Cable Knit Wrap | Cozy Gift for Her";
const TAGS = ["cable knit scarf", "hand knit scarf", "powder blue scarf", "chunky knit scarf", "handmade scarf", "winter scarf", "light blue scarf", "knitted scarf", "cozy scarf", "gift for her", "cable scarf", "handknit gift", "soft winter wrap"];
const DESCRIPTION = [
  "Knit by hand, stitch by stitch, this scarf has a raised cable running down the middle and a soft powder blue that sits easily with grey coats, camel and cream.",
  "It is knit in a chunky yarn on wooden needles, so every stitch is big and easy to see. The cables are crossed by hand as the scarf grows, which is why no two come out exactly alike.",
  "Because it is made by hand, yours may differ slightly from the photos. That is how you can tell.",
].join("\n\n");
const WORDS = DESCRIPTION.split(/\s+/).length;

// Four markets: title/price from exampleKnit.ts, description translated by hand. FX frankfurter.dev 2026-10-22, rounded.
const LOCALES: { market: string; locale: string; currency: string; price: number; fx: number; title: string; tags: string[]; description: string }[] = [
  {
    market: "GB", locale: "en-GB", currency: "GBP", price: 6000, fx: 0.75,
    title: "Hand-Knitted Cable Scarf in Powder Blue | Chunky Knit Winter Scarf",
    tags: ["cable knit scarf", "hand knitted scarf", "powder blue scarf", "chunky knit scarf", "handmade scarf", "winter scarf", "light blue scarf", "knitted scarf", "cosy scarf", "gift for her", "cable scarf", "hand knitted gift", "soft winter wrap"],
    description: "Knitted by hand, stitch by stitch, this scarf has a raised cable running down the middle and a soft powder blue that sits easily with grey coats, camel and cream.\n\nIt is knitted in a chunky yarn on wooden needles, so every stitch is big and easy to see. The cables are crossed by hand as the scarf grows, which is why no two come out exactly alike.\n\nBecause it is made by hand, yours may differ slightly from the photos. That is how you can tell.",
  },
  {
    market: "DE", locale: "de-DE", currency: "EUR", price: 7100, fx: 0.89,
    title: "Handgestrickter Schal mit Zopfmuster in Puderblau | Grobstrick-Winterschal",
    tags: ["zopfmuster schal", "handgestrickter schal", "puderblauer schal", "grobstrick schal", "handgemachter schal", "winterschal", "hellblauer schal", "strickschal", "kuscheliger schal", "geschenk für sie", "zopfschal", "handgestrickt geschenk", "weicher winterschal"],
    description: "Von Hand gestrickt, Masche für Masche: Dieser Schal hat einen erhabenen Zopf in der Mitte und ein zartes Puderblau, das sich leicht mit grauen Mänteln, Camel und Creme kombinieren lässt.\n\nEr ist aus grober Wolle auf Holznadeln gestrickt, sodass jede Masche groß und gut zu erkennen ist. Die Zöpfe werden von Hand gekreuzt, während der Schal wächst – deshalb gleicht kein Stück dem anderen.\n\nDa er von Hand gefertigt ist, kann Ihr Schal leicht von den Fotos abweichen. Genau daran erkennt man ihn.",
  },
  {
    market: "AU", locale: "en-AU", currency: "AUD", price: 11400, fx: 1.43,
    title: "Hand-Knitted Cable Scarf in Powder Blue | Chunky Winter Scarf",
    tags: ["cable knit scarf", "hand knitted scarf", "powder blue scarf", "chunky knit scarf", "handmade scarf", "winter scarf", "light blue scarf", "knitted scarf", "cosy scarf", "gift for her", "cable scarf", "hand knitted gift", "soft winter wrap"],
    description: "Knitted by hand, stitch by stitch, this scarf has a raised cable running down the middle and a soft powder blue that sits easily with grey coats, camel and cream.\n\nIt is knitted in a chunky yarn on wooden needles, so every stitch is big and easy to see. The cables are crossed by hand as the scarf grows, which is why no two come out exactly alike.\n\nBecause it is made by hand, yours may differ slightly from the photos. That is how you can tell.",
  },
  {
    market: "CA", locale: "fr-CA", currency: "CAD", price: 11200, fx: 1.40,
    title: "Foulard tricoté à la main à torsades, bleu poudre | Foulard d’hiver en grosse maille",
    tags: ["foulard torsades", "foulard tricoté main", "foulard bleu poudre", "foulard grosse maille", "foulard fait main", "foulard d'hiver", "foulard bleu pâle", "foulard tricot", "foulard douillet", "cadeau pour elle", "écharpe torsades", "cadeau tricot main", "écharpe douce hiver"],
    description: "Tricoté à la main, maille après maille, ce foulard porte une torsade en relief au centre et un bleu poudre tout doux qui s’accorde facilement aux manteaux gris, camel et crème.\n\nIl est tricoté dans une grosse laine sur des aiguilles en bois, de sorte que chaque maille est grande et bien visible. Les torsades sont croisées à la main au fil du tricot, c’est pourquoi deux foulards ne sont jamais tout à fait identiques.\n\nComme il est fait à la main, le vôtre peut différer légèrement des photos. C’est à cela qu’on le reconnaît.",
  },
];

/**
 * MOCK_MODE pipeline: no Claude, no ffmpeg. Emits the demo scarf kit over ~40 s with the same
 * claude_actions cadence, so the result screen fills in exactly as it will with the real worker.
 * Frames and videos are the real sample files from public/example/knit, uploaded to Storage.
 * Useful when the API key or ffmpeg is missing, or for rehearsing the pitch.
 */
export async function runMock(launch: LaunchRow) {
  const sid = launch.seller_id, id = launch.id;

  await sleep(3000);
  await db.from("source_media").update({ duration_sec: 10, fps: 30, frame_count: 300 }).eq("launch_id", id).eq("kind", "video");
  await logAction(id, "watch_footage", "watched 10 s of footage", { metrics: { duration_sec: 10, fps: 30 } });

  await sleep(5000);
  // [role, file, timecode_sec, score, reason] — one pick per role, then two runners-up (selected=false) so /swap has candidates.
  const picks: [string, string, number, number, string][] = [
    ["hero", "photo-hero.jpg", 8.4, 0.94, "finished scarf laid flat, cable centred, soft even light"],
    ["detail", "photo-cables.jpg", 6.2, 0.91, "cable crossings fill the frame — texture reads at thumbnail size"],
    ["in_hand", "photo-closeup.jpg", 7.1, 0.88, "hands holding the knit, shows stitch size and drape"],
    ["process", "photo-progress.jpg", 3.5, 0.86, "scarf still on the needles — proof of handmade"],
    ["scale", "photo-yarn.jpg", 0.8, 0.82, "ball of yarn next to the work, gives a sense of scale"],
  ];
  const files = picks.map((p) => p[1]);
  const buffers = Object.fromEntries(await Promise.all(files.map(async (f) => [f, await asset(f)] as const)));
  let i = 0;
  for (const [n, [role, file, sec, score, reason]] of picks.entries()) {
    const p = await upload(`${sid}/${id}/frames/${role}.jpg`, buffers[file], "image/jpeg");
    await db.from("frames").insert({ launch_id: id, role, timecode_sec: sec, score, score_reason: reason, storage_path_raw: p, sort_order: i++, selected: true });
    for (let k = 1; k <= 2; k++) {
      const alt = files[(n + k) % files.length];
      const q = await upload(`${sid}/${id}/frames/${role}-alt${k}.jpg`, buffers[alt], "image/jpeg");
      await db.from("frames").insert({ launch_id: id, role, timecode_sec: Math.round((sec + k * 0.7) % 10 * 10) / 10, score: Math.round((score - 0.07 * k) * 100) / 100, score_reason: "runner-up for this role", storage_path_raw: q, sort_order: i++, selected: false });
    }
  }
  await logAction(id, "score_frames", "scored 300 frames, kept 5", { metrics: { frames_scored: 300, frames_kept: 5 }, model: "mock" });
  await db.from("launches").update({ product_title: "Hand-Knit Cable Scarf in Powder Blue" }).eq("id", id);
  await logAction(id, "extract_attributes", "identified a hand-knit scarf — chunky yarn, centre cable, powder blue");
  await setStatus(id, "writing");

  await sleep(5000);
  await logAction(id, "research_comparables", "read 40 comparable listings for price and tags", { metrics: { low_cents: 3000, high_cents: 17500, mid_low_cents: 7500, mid_high_cents: 10000 } });

  await sleep(6000);
  await db.from("listings").upsert({
    launch_id: id, title: TITLE, tags: TAGS, description: DESCRIPTION,
    price_cents: 8000, currency: "USD", price_low_cents: 3000, price_high_cents: 17500, cost_basis_cents: 3200, comparables_read: 40,
    price_reasoning: "Mid-range of 40 comparable hand-knit cable scarves ($30–$175, most at $75–$100); covers about $32 of yarn and 6 h of knitting with margin left.",
  });
  await logAction(id, "write_listing", `wrote the title, 13 tags and a ${WORDS}-word description`, { metrics: { words: WORDS, title_chars: TITLE.length } });
  await logAction(id, "price", "priced it at $80.00 against 40 comparables");

  await sleep(4000);
  await logAction(id, "write_hooks", "wrote 3 hooks: “From one ball of yarn to this”, “Every stitch, by hand.”, “Would you wear this blue?”");
  await setStatus(id, "rendering");
  await sleep(6000);
  // [kind, platform, hook, duration_sec, file] — the Etsy listing video is the source clip itself.
  const vids = [
    ["listing", "etsy", null, 10, "input.mp4"], ["short", "tiktok", "From one ball of yarn to this", 10, "short-tiktok.mp4"],
    ["short", "reels", "Every stitch, by hand.", 6, "short-reels.mp4"], ["short", "shorts", "Would you wear this blue?", 6, "short-shorts.mp4"],
  ] as const;
  const paths = await Promise.all(vids.map(async ([, platform, , , file]) => upload(`${sid}/${id}/videos/${platform}.mp4`, await asset(file), "video/mp4")));
  await db.from("videos").insert(vids.map(([kind, platform, hook, dur], n) => ({
    launch_id: id, kind, platform, hook_text: hook, hook_rationale: hook ? "demo" : null,
    cut_points: dur === 10 ? [{ in: 0, out: 10, caption: hook }] : [{ in: 0.8, out: 2.8, caption: hook }, { in: 3.5, out: 5.5, caption: null }, { in: 8.0, out: 10.0, caption: null }],
    duration_sec: dur, aspect: kind === "listing" ? "16:9" : "9:16", has_captions: !!hook, storage_path: paths[n], sort_order: n,
  })));
  await logAction(id, "cut_points", "cut 4 videos with 3 hooks", { metrics: { videos: 4 } });

  await sleep(5000);
  await db.from("listing_localizations").insert(LOCALES.map((l) => ({
    launch_id: id, market: l.market, locale: l.locale, title: l.title, tags: l.tags, description: l.description,
    price_cents: l.price, currency: l.currency, fx_rate: l.fx, shipping_cents_included: 1500, enabled: true,
  })));
  await logAction(id, "localize", "wrote 4 listings for UK, DE, AU and CA — translated and priced in local currency", { metrics: { markets: 4 } });

  await sleep(2000);
  const { data: frames } = await db.from("frames").select("id").eq("launch_id", id).eq("selected", true).order("sort_order");
  const ids = (frames ?? []).map((f) => f.id);
  await db.from("social_assets").insert([
    { launch_id: id, kind: "pinterest_pin", title: "Hand-knit cable scarf in powder blue — made stitch by stitch", caption: "Chunky cable knit, crossed by hand.", frame_ids: ids.slice(0, 1), sort_order: 0 },
    { launch_id: id, kind: "instagram_carousel", caption: "One ball of yarn, one pair of needles, one scarf. #handknit #cableknit #knittersofinstagram #slowfashion #powderblue", frame_ids: ids, sort_order: 1 },
  ]);
  await db.from("publications").upsert((launch.target_channels ?? ["etsy", "shopify", "tiktok"]).map((channel) => ({ launch_id: id, channel, status: "draft" })), { onConflict: "launch_id,channel" });
  await logAction(id, "format_for_channel", "formatted for 3 channels, wrote the pin");
}
