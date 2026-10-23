import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db, BUCKET, upload, logAction, setStatus } from "../lib/db";
import type { LaunchRow } from "../../src/lib/types";
import type { MockKit } from "../../mock/types";
import {
  DEFAULT_KITS_PATH, SAMPLE_KITS_PATH, mockPrefix, FRAME_ROLES, ALT_SUFFIXES, KNIT_SLUG, KNIT_PUBLIC_FILES, KNIT_PUBLIC_VIDEOS,
  pickKit, kitActions, wordCount, frameCount, fxRate,
} from "../../src/lib/mockKits";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The worker runs from repo root. Knit sample files double as the no-seeder fallback.
const ROOT = process.cwd();
const KNIT_DIR = path.resolve(ROOT, "public/example/knit");

/** Loads MOCK_KITS (default mock/kits.json), falling back to mock/kits.sample.json. */
async function loadKits(): Promise<MockKit[]> {
  const candidates = [process.env.MOCK_KITS, DEFAULT_KITS_PATH, SAMPLE_KITS_PATH].filter((p): p is string => !!p);
  for (const p of candidates) {
    try {
      const kits = JSON.parse(await readFile(path.resolve(ROOT, p), "utf8")) as MockKit[];
      if (Array.isArray(kits) && kits.length) return kits;
    } catch { /* try next */ }
  }
  throw new Error(`no mock kits file found (tried ${candidates.join(", ")})`);
}

/** Server-side copy of a seeded Storage object; false when the seeder has not uploaded it. */
async function copyObject(from: string, to: string): Promise<boolean> {
  const { error } = await db.storage.from(BUCKET).copy(from, to);
  if (!error) return true;
  if (/not found|does not exist|404/i.test(error.message)) return false;
  // Re-running the same launch: the target already exists — remove and retry once.
  await db.storage.from(BUCKET).remove([to]);
  const retry = await db.storage.from(BUCKET).copy(from, to);
  if (!retry.error) return true;
  if (/not found|does not exist|404/i.test(retry.error.message)) return false;
  throw new Error(`copy ${from} → ${to}: ${retry.error.message}`);
}

const ROLE_HUE: Record<string, string> = { hero: "#e8dfd0", in_hand: "#d9cbb8", detail: "#cdbfae", process: "#b9ab9b", scale: "#e2d6c6" };

/** Neutral placeholder frame when neither the seeded asset nor a local sample exists. */
async function placeholderJpeg(kit: MockKit, role: string, variant: string): Promise<Buffer> {
  const bg = ROLE_HUE[role] ?? "#ddd3c4";
  const title = kit.product_title.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const label = `${role.replace("_", " ")}${variant ? ` ${variant.replace("_", "")}` : ""}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200">
    <rect width="1200" height="1200" fill="${bg}"/>
    <circle cx="600" cy="560" r="260" fill="#ffffff" fill-opacity="0.35"/>
    <text x="600" y="980" font-family="Helvetica, Arial, sans-serif" font-size="44" text-anchor="middle" fill="#3b3028">${title}</text>
    <text x="600" y="1040" font-family="Helvetica, Arial, sans-serif" font-size="30" text-anchor="middle" fill="#6b5d50">${label} · mock frame</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}

/** Copies a seeded frame into the launch folder, else uploads a local knit photo or a generated JPEG. */
async function placeFrame(kit: MockKit, sid: string, id: string, role: string, variant: string, altIndex: number): Promise<string> {
  const to = `${sid}/${id}/frames/${role}${variant}.jpg`;
  if (await copyObject(`${mockPrefix(kit.slug)}/frames/${role}${variant}.jpg`, to)) return to;
  let body: Buffer | null = null;
  if (kit.slug === KNIT_SLUG) {
    const files = FRAME_ROLES.map((r) => KNIT_PUBLIC_FILES[r]);
    const base = files.indexOf(KNIT_PUBLIC_FILES[role as keyof typeof KNIT_PUBLIC_FILES] ?? files[0]);
    body = await readFile(path.join(KNIT_DIR, files[(base + altIndex) % files.length])).catch(() => null);
  }
  return upload(to, body ?? await placeholderJpeg(kit, role, variant), "image/jpeg");
}

/** Copies a seeded video, else the local knit clip; null when neither exists (storage_path stays null). */
async function placeVideo(kit: MockKit, sid: string, id: string, platform: keyof typeof KNIT_PUBLIC_VIDEOS): Promise<string | null> {
  const to = `${sid}/${id}/videos/${platform}.mp4`;
  if (await copyObject(`${mockPrefix(kit.slug)}/videos/${platform}.mp4`, to)) return to;
  if (kit.slug !== KNIT_SLUG) return null;
  const body = await readFile(path.join(KNIT_DIR, KNIT_PUBLIC_VIDEOS[platform])).catch(() => null);
  return body ? upload(to, body, "video/mp4") : null;
}

/**
 * MOCK_MODE pipeline: no Claude, no ffmpeg. Emits one kit from mock/kits.json over ~40 s with the same
 * claude_actions cadence, so the result screen fills in exactly as it will with the real worker.
 * The kit is chosen from the seller's product hint, else rotated by how many launches the seller has made.
 * Frames/videos are copied from the seeded `mock/<slug>/...` Storage objects (scripts/seed-mock.ts);
 * without the seeder it falls back to public/example/knit or a generated placeholder, so it never crashes.
 */
export async function runMock(launch: LaunchRow) {
  const sid = launch.seller_id, id = launch.id;
  const kits = await loadKits();
  const { count } = await db.from("launches").select("id", { count: "exact", head: true }).eq("seller_id", sid).neq("id", id);
  const kit = pickKit(kits, launch.product_name_hint, count ?? 0);
  const act = kitActions(kit);
  const say = (step: (typeof act)[number]["step"]) => act.find((a) => a.step === step)!.summary;
  const { source, listing } = kit;
  const frames = frameCount(kit);
  console.log(`  mock kit: ${kit.slug}${launch.product_name_hint ? ` (hint "${launch.product_name_hint}")` : ` (rotation ${count ?? 0})`}`);

  await sleep(3000);
  await db.from("source_media").update({ duration_sec: source.duration_sec, fps: source.fps, frame_count: frames }).eq("launch_id", id).eq("kind", "video");
  await logAction(id, "watch_footage", say("watch_footage"), { metrics: { duration_sec: source.duration_sec, fps: source.fps } });

  await sleep(5000);
  // One pick per role (from kit.frames), then two runners-up (selected=false) so /swap has candidates.
  const byRole = new Map(kit.frames.map((f) => [f.role, f]));
  let i = 0;
  for (const role of FRAME_ROLES) {
    const f = byRole.get(role);
    if (!f) continue;
    const sec = f.timecode_sec;
    const p = await placeFrame(kit, sid, id, role, "", 0);
    await db.from("frames").insert({ launch_id: id, role, timecode_sec: sec, score: f.score, score_reason: f.reason, storage_path_raw: p, sort_order: i++, selected: true });
    for (const [k, suffix] of ALT_SUFFIXES.entries()) {
      const q = await placeFrame(kit, sid, id, role, suffix, k + 1);
      const altSec = sec == null ? null : Math.round(((sec + (k + 1) * 0.7) % source.duration_sec) * 10) / 10;
      await db.from("frames").insert({ launch_id: id, role, timecode_sec: altSec, score: Math.round((f.score - 0.07 * (k + 1)) * 100) / 100, score_reason: "runner-up for this role", storage_path_raw: q, sort_order: i++, selected: false });
    }
  }
  await logAction(id, "score_frames", say("score_frames"), { metrics: { frames_scored: frames, frames_kept: kit.frames.length }, model: "mock" });
  await db.from("launches").update({ product_title: kit.product_title }).eq("id", id);
  await logAction(id, "extract_attributes", say("extract_attributes"), { metrics: { materials: kit.attributes.materials, colors: kit.attributes.colors } });
  await setStatus(id, "writing");

  await sleep(5000);
  await logAction(id, "research_comparables", say("research_comparables"), { metrics: { comparables: listing.comparables_read, low_cents: listing.price_low_cents, high_cents: listing.price_high_cents } });

  await sleep(6000);
  const words = wordCount(listing.description);
  await db.from("listings").upsert({
    launch_id: id, title: listing.title, tags: listing.tags, description: listing.description,
    price_cents: listing.price_cents, currency: "USD", price_low_cents: listing.price_low_cents, price_high_cents: listing.price_high_cents,
    cost_basis_cents: listing.cost_basis_cents, comparables_read: listing.comparables_read, price_reasoning: listing.price_reasoning,
  });
  await logAction(id, "write_listing", say("write_listing"), { metrics: { words, tags: listing.tags.length, title_chars: listing.title.length } });
  await logAction(id, "price", say("price"), { metrics: { price_cents: listing.price_cents, comparables: listing.comparables_read } });

  await sleep(4000);
  const hooks = kit.videos.map((v) => v.hook_text).filter((h): h is string => !!h);
  await logAction(id, "write_hooks", say("write_hooks"), { metrics: { hooks: hooks.length } });
  await setStatus(id, "rendering");
  await sleep(6000);
  const paths = await Promise.all(kit.videos.map((v) => placeVideo(kit, sid, id, v.platform)));
  await db.from("videos").insert(kit.videos.map((v, n) => ({
    launch_id: id, kind: v.kind, platform: v.platform, hook_text: v.hook_text, hook_rationale: v.hook_rationale,
    cut_points: v.cuts, duration_sec: v.duration_sec, aspect: v.kind === "listing" ? "16:9" : "9:16",
    has_captions: !!v.hook_text, storage_path: paths[n], sort_order: n,
  })));
  await logAction(id, "cut_points", say("cut_points"), { metrics: { videos: kit.videos.length, hooks: hooks.length } });

  await sleep(5000);
  await db.from("listing_localizations").insert(kit.localizations.map((l) => ({
    launch_id: id, market: l.market, locale: l.locale, title: l.title, tags: l.tags, description: l.description,
    price_cents: l.price_cents, currency: l.currency, fx_rate: fxRate(kit, l), shipping_cents_included: 1500, enabled: true,
  })));
  await logAction(id, "localize", say("localize"), { metrics: { markets: kit.localizations.length } });

  await sleep(2000);
  const { data: picked } = await db.from("frames").select("id").eq("launch_id", id).eq("selected", true).order("sort_order");
  const ids = (picked ?? []).map((f) => f.id);
  await db.from("social_assets").insert([
    { launch_id: id, kind: "pinterest_pin", title: kit.social.pin_title, caption: kit.social.pin_caption, frame_ids: ids.slice(0, 1), sort_order: 0 },
    { launch_id: id, kind: "instagram_carousel", caption: kit.social.carousel_caption, frame_ids: ids, sort_order: 1 },
  ]);
  const channels = launch.target_channels ?? ["etsy", "shopify", "tiktok"];
  await db.from("publications").upsert(channels.map((channel) => ({ launch_id: id, channel, status: "draft" })), { onConflict: "launch_id,channel" });
  await logAction(id, "format_for_channel", say("format_for_channel"), { metrics: { channels: channels.length } });
}
