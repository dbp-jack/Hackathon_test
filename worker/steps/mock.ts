import sharp from "sharp";
import { db, upload, logAction, setStatus } from "../lib/db";
import type { LaunchRow } from "../../src/lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * MOCK_MODE pipeline: no Claude, no ffmpeg. Emits the demo mug kit over ~40 s with the same
 * claude_actions cadence, so the result screen fills in exactly as it will with the real worker.
 * Useful when the API key or ffmpeg is missing, or for rehearsing the pitch.
 */
export async function runMock(launch: LaunchRow) {
  const sid = launch.seller_id, id = launch.id;
  const colored = async (hex: string, w = 1200, h = 1200) =>
    sharp({ create: { width: w, height: h, channels: 3, background: hex } }).jpeg().toBuffer();

  await sleep(3000);
  await db.from("source_media").update({ duration_sec: 492, fps: 30, frame_count: 14760 }).eq("launch_id", id).eq("kind", "video");
  await logAction(id, "watch_footage", "watched 8 min 12 s of footage", { metrics: { duration_sec: 492 } });

  await sleep(5000);
  const picks: [string, string, number | null, number, string][] = [
    ["hero", "#D9CBB8", 468, 0.93, "sharp focus, glaze visible, neutral background"],
    ["in_hand", "#C9B8A3", 482, 0.88, "shows scale and grip"],
    ["detail", "#E3D8C8", 375, 0.86, "speckle texture fills the frame"],
    ["process", "#A89C8C", 134, 0.84, "hands centering clay — proof of handmade"],
    ["scale", "#CFC4B4", null, 0.8, "uploaded photo next to a notebook"],
  ];
  let i = 0;
  for (const [role, hex, sec, score, reason] of picks) {
    const p = await upload(`${sid}/${id}/frames/${role}.jpg`, await colored(hex), "image/jpeg");
    await db.from("frames").insert({ launch_id: id, role, timecode_sec: sec, score, score_reason: reason, storage_path_raw: p, sort_order: i++, selected: true });
  }
  await logAction(id, "score_frames", "scored 14,760 frames, kept 5", { metrics: { frames_scored: 14760, frames_kept: 5 }, model: "mock" });
  await db.from("launches").update({ product_title: "Hand-thrown Speckled Stoneware Mug" }).eq("id", id);
  await logAction(id, "extract_attributes", "identified a ceramic mug — stoneware clay, food-safe glaze");
  await setStatus(id, "writing");

  await sleep(5000);
  await logAction(id, "research_comparables", "read 40 comparable listings for price and tags", { metrics: { low_cents: 3400, high_cents: 5800 } });

  await sleep(6000);
  await db.from("listings").upsert({
    launch_id: id,
    title: "Handmade Speckled Stoneware Mug 12 oz | Wheel-Thrown Ceramic Coffee Cup | Minimalist Pottery Gift for Her | Microwave Safe",
    tags: ["speckled mug", "handmade ceramic mug", "stoneware coffee cup", "wheel thrown pottery", "pottery gift for her", "minimalist mug", "12 oz mug", "rustic kitchen", "housewarming gift", "microwave safe mug", "artisan ceramics", "cozy mug", "handmade in oregon"],
    description: `Thrown on the wheel in my Portland studio, this 12 oz mug is glazed in a warm speckled white that shows the clay body underneath. It holds comfortably in one hand, the handle fits three fingers, and it goes through the microwave and dishwasher without complaint.

Materials: stoneware clay, food-safe glaze. Size: 3.6 in tall, 3.2 in across, holds 12 oz. Hand wash is kindest to the glaze, but it is dishwasher safe.

Each mug is made to order and ships in 5–7 days from Oregon, wrapped in recycled paper. If you would like a set, message me and I will throw them together so they match.

Because every one is thrown by hand, yours will be a little different from the photos — that is the point.`,
    price_cents: 4200, currency: "USD", price_low_cents: 3400, price_high_cents: 5800, cost_basis_cents: 3100, comparables_read: 40,
    price_reasoning: "Mid-range of 40 comparable 12 oz speckled mugs; keeps a 35% margin over materials and 2.5 h of labor.",
  });
  await logAction(id, "write_listing", "wrote the title, 13 tags and a 212-word description", { metrics: { words: 212, title_chars: 128 } });
  await logAction(id, "price", "priced it at $42.00 against 40 comparables");

  await sleep(4000);
  await logAction(id, "write_hooks", "wrote 3 hooks: “3 hours at the wheel. 30 seconds.”, “What goes into one $42 mug”, “No talking. Just clay.”");
  await setStatus(id, "rendering");
  await sleep(6000);
  const vids = [
    ["listing", "etsy", null, 15], ["short", "tiktok", "3 hours at the wheel. 30 seconds.", 28],
    ["short", "reels", "What goes into one $42 mug", 22], ["short", "shorts", "No talking. Just clay.", 19],
  ] as const;
  await db.from("videos").insert(vids.map(([kind, platform, hook, dur], n) => ({ launch_id: id, kind, platform, hook_text: hook, hook_rationale: hook ? "demo" : null, cut_points: [{ in: 134, out: 139, caption: hook }, { in: 375, out: 380, caption: null }, { in: 480, out: 485, caption: null }], duration_sec: dur, aspect: "9:16", has_captions: !!hook, sort_order: n })));
  await logAction(id, "cut_points", "cut 4 videos with 3 hooks", { metrics: { videos: 4 } });

  await sleep(5000);
  const locs = [
    ["GB", "en-GB", "GBP", 3350, "Handmade Speckled Stoneware Mug 340 ml | Wheel-Thrown Ceramic Coffee Cup | Minimalist Pottery Gift | Microwave Safe"],
    ["DE", "de-DE", "EUR", 3900, "Handgefertigte Steinzeugtasse 340 ml | Gedrehte Keramik-Kaffeetasse | Minimalistisches Töpfer-Geschenk | Mikrowellengeeignet"],
    ["AU", "en-AU", "AUD", 6400, "Handmade Speckled Stoneware Mug 340 ml | Wheel-Thrown Ceramic Coffee Cup | Minimalist Pottery Gift | Microwave Safe"],
    ["CA", "fr-CA", "CAD", 5700, "Tasse en grès mouchetée faite main 340 ml | Tasse à café en céramique tournée | Cadeau poterie minimaliste | Va au micro-ondes"],
  ] as const;
  await db.from("listing_localizations").insert(locs.map(([market, locale, currency, price, title]) => ({ launch_id: id, market, locale, title, tags: ["handmade mug", "stoneware", "ceramic cup", "pottery gift", "speckled", "wheel thrown", "coffee cup", "minimalist", "kitchen", "housewarming", "artisan", "cozy", "oregon"], description: "(translated description)", price_cents: price, currency, fx_rate: null, shipping_cents_included: 2000, enabled: true })));
  await logAction(id, "localize", "wrote about 1,240 words in 5 languages");

  await sleep(2000);
  const { data: frames } = await db.from("frames").select("id").eq("launch_id", id).eq("selected", true).order("sort_order");
  const ids = (frames ?? []).map((f) => f.id);
  await db.from("social_assets").insert([
    { launch_id: id, kind: "pinterest_pin", title: "Handmade speckled mug — slow mornings start here", caption: "Thrown by hand in Portland.", frame_ids: ids.slice(0, 1), sort_order: 0 },
    { launch_id: id, kind: "instagram_carousel", caption: "One mug, three hours, one pair of hands. #handmade #pottery #ceramics #stoneware #slowliving", frame_ids: ids, sort_order: 1 },
  ]);
  await db.from("publications").upsert((launch.target_channels ?? ["etsy", "shopify", "tiktok"]).map((channel) => ({ launch_id: id, channel, status: "draft" })), { onConflict: "launch_id,channel" });
  await logAction(id, "format_for_channel", "formatted for 3 channels, wrote the pin");
}
