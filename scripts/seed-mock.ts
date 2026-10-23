/**
 * seed-mock.ts — turn mock/kits.json into a believable "My launches" history for the demo seller,
 * with real photos (Openverse CC-licensed, picked by Claude vision) and real MP4s (ffmpeg slideshows).
 *
 *   npx tsx scripts/seed-mock.ts [--kits mock/kits.json] [--clean] [--only slug,slug] [--env .env] [--keep-photos]
 *
 *   --env          dotenv file (default .env). Vars missing from it are back-filled from .env (never overridden),
 *                  so `--env .env.supabase-local.local` still gets ANTHROPIC_API_KEY from .env.
 *   --clean        delete every launch of DEMO_SELLER_ID, every Storage object under `${sellerId}/` and `mock/`,
 *                  reset sellers.credits_remaining to 12 and clear that seller's credit_ledger.
 *   --only         reseed just these slugs (the previous launch with the same product_title is deleted first).
 *   --keep-photos  reuse `mock/<slug>/frames/*` already in Storage instead of re-querying Openverse + Claude.
 *
 * Per kit: photos → mock/<slug>/frames/*, videos → mock/<slug>/videos/*, then copied into ${sellerId}/${launchId}/…
 * and one 'ready' launch with every child row the result screen reads (see src/lib/kit.ts).
 * Attribution for every Openverse photo used lands in mock/attribution.json.
 */
import { config as loadEnv } from "dotenv";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type Anthropic from "@anthropic-ai/sdk";
import type { MockKit } from "../mock/types";
import type { ClaudeStep } from "../src/lib/types";
import { PIPELINE_STEPS } from "../src/lib/types";

// ───────────────────────── CLI
type Args = { kits: string; clean: boolean; only: string[] | null; env: string; keepPhotos: boolean };
function parseArgs(argv: string[]): Args {
  const a: Args = { kits: "mock/kits.json", clean: false, only: null, env: ".env", keepPhotos: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === "--kits") { a.kits = v; i++; }
    else if (k === "--env") { a.env = v; i++; }
    else if (k === "--only") { a.only = v.split(",").map((s) => s.trim()).filter(Boolean); i++; }
    else if (k === "--clean") a.clean = true;
    else if (k === "--keep-photos") a.keepPhotos = true;
    else if (k === "--help" || k === "-h") { console.log("usage: npx tsx scripts/seed-mock.ts [--kits mock/kits.json] [--clean] [--only slug,slug] [--env .env] [--keep-photos]"); process.exit(0); }
    else throw new Error(`unknown arg ${k}`);
  }
  return a;
}
const ARGS = parseArgs(process.argv.slice(2));
loadEnv({ path: ARGS.env });
for (const k of Object.keys(process.env)) if (process.env[k] === "") delete process.env[k]; // `KEY=` placeholders count as unset
if (ARGS.env !== ".env" && existsSync(".env")) loadEnv({ path: ".env" }); // back-fill only; dotenv never overrides

const ROOT = process.cwd();
const KNIT_SLUG = "knit-cable-scarf";
const KNIT_DIR = path.join(ROOT, "public/example/knit");
const WORK = path.join(ROOT, process.env.WORK_DIR ?? ".work", "seed-mock");
const ATTRIBUTION_FILE = path.join(ROOT, "mock/attribution.json");
const ROLES = ["hero", "in_hand", "detail", "process", "scale"] as const;
type Role = (typeof ROLES)[number];
const SHIPPING_CENTS: Record<string, number> = { GB: 1800, DE: 2200, AU: 2600, CA: 1500 };
const exec = promisify(execFile);
const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";
const UA = "launch-kit-hackathon/0.1";

// ───────────────────────── tiny deterministic PRNG (so reruns produce the same timestamps/tokens)
function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rand(seed: string, lo: number, hi: number): number { return lo + (hash32(seed) % 10_000) / 10_000 * (hi - lo); }

// ───────────────────────── Openverse
type OvImage = { id: string; title: string | null; url: string; creator: string | null; license: string; license_version: string | null; foreign_landing_url: string; width: number | null; height: number | null; provider: string | null };
type Candidate = { ov: OvImage; file: string; width: number; height: number };

/** Openverse search. Responses are cached under .work so a rerun does not pay the (often 20–40 s) API latency again. */
async function openverse(query: string, sizeFilter = true): Promise<OvImage[]> {
  const u = new URL("https://api.openverse.org/v1/images/");
  u.searchParams.set("q", query); u.searchParams.set("license_type", "commercial");
  if (sizeFilter) u.searchParams.set("size", "medium,large");
  u.searchParams.set("page_size", "20");
  const cacheDir = path.join(WORK, "openverse-cache"), cacheFile = path.join(cacheDir, `${hash32(u.toString()).toString(16)}.json`);
  try { return JSON.parse(await readFile(cacheFile, "utf8")) as OvImage[]; } catch { /* miss */ }
  for (let attempt = 0; attempt < 3; attempt++) { // the API is frequently slow — generous timeout, two retries
    try {
      const res = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(60_000) });
      if (res.status === 429) { console.warn(`  openverse 429 for "${query}" — backing off 20 s`); await new Promise((r) => setTimeout(r, 20_000)); continue; }
      if (!res.ok) { console.warn(`  openverse ${res.status} for "${query}"`); return []; }
      const j = (await res.json()) as { results?: OvImage[] };
      const results = j.results ?? [];
      await mkdir(cacheDir, { recursive: true }); await writeFile(cacheFile, JSON.stringify(results));
      return results;
    } catch (e) { console.warn(`  openverse ${attempt < 2 ? "retrying" : "gave up on"} "${query}": ${(e as Error).message}`); }
  }
  return [];
}

async function downloadCandidate(ov: OvImage, out: string): Promise<Candidate | null> {
  try {
    const res = await fetch(ov.url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15_000), redirect: "follow" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf).metadata();
    if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < 500) return null;
    const info = await sharp(buf).rotate().resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(out);
    return { ov, file: out, width: info.width, height: info.height };
  } catch { return null; }
}

async function pLimit<T, R>(items: T[], n: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

async function gatherCandidates(kit: MockKit, dir: string): Promise<Candidate[]> {
  const seen = new Map<string, OvImage>();
  const merge = (pages: OvImage[][]) => { // round-robin across queries so the 40-cap keeps variety (hero-ish, in-hand, process …)
    for (let i = 0; seen.size < 40 && pages.some((p) => i < p.length); i++)
      for (const p of pages) { const img = p[i]; if (img?.id && img.url && !seen.has(img.id) && seen.size < 40) seen.set(img.id, img); }
  };
  const queries = kit.image_queries.slice(0, 5);
  merge(await pLimit(queries, 3, (q) => openverse(q)));
  let note = "";
  if (seen.size < 15) { // the size filter and very specific phrases can starve a kit — widen before giving up
    const extra = [...queries, kit.category, kit.product_title.replace(/[|,].*$/, "")].filter((q, i, a) => a.indexOf(q) === i);
    merge(await pLimit(extra, 3, (q) => openverse(q, false)));
    note = " (widened: no size filter + category/title)";
  }
  const list = [...seen.values()];
  console.log(`  openverse: ${list.length} candidates from ${queries.length} queries${note}`);
  const got = await pLimit(list, 6, (ov, i) => downloadCandidate(ov, path.join(dir, `cand_${String(i).padStart(2, "0")}.jpg`)));
  const ok = got.filter((c): c is Candidate => !!c);
  console.log(`  downloaded ${ok.length}/${list.length} (≥500 px, resized to 1024)`);
  return ok;
}

// ───────────────────────── Claude vision pick
type PickResult = { picks: { role: Role; index: number; score: number; reason: string }[]; runners_up: { role: Role; index: number }[] };
type Picked = { role: Role; cand: Candidate; score: number; reason: string; alts: Candidate[] };

async function pickWithClaude(kit: MockKit, cands: Candidate[]): Promise<{ picked: Picked[]; usage: { input_tokens: number; output_tokens: number } }> {
  const { structured, imageBlock } = await import("../worker/lib/claude");
  const subset = cands.slice(0, 40);
  const content: Anthropic.Messages.ContentBlockParam[] = [];
  content.push({ type: "text", text: `Product: ${kit.product_title}\nCategory: ${kit.category}\nMaterials: ${kit.attributes.materials.join(", ")}\nColors: ${kit.attributes.colors.join(", ")}\n\nBelow are ${subset.length} candidate stock photos, numbered 0..${subset.length - 1}. Pick exactly one photo per role for THIS product's Etsy listing.` });
  for (let i = 0; i < subset.length; i++) {
    const small = await sharp(subset[i].file).resize(512, 512, { fit: "inside" }).jpeg({ quality: 70 }).toBuffer();
    content.push({ type: "text", text: `Image ${i}` }, imageBlock(small));
  }
  content.push({ type: "text", text: "Roles: hero (clean front view of the finished product), in_hand (someone holding/using it, no face), detail (close-up of material/texture), process (it being made — tools, hands at work, workshop), scale (next to something that shows its size). Then list up to 2 runners-up per role (different indices from the picks)." });
  const system = `You are the photo editor for a handmade-goods marketplace. You are choosing listing photos for one specific product.
Reject any image that is not the right kind of object (e.g. a different product or category), shows a visible brand or logo, shows a person's face, has text overlays or watermarks, or looks like a stock collage / composite / illustration. Prefer sharp, well-lit photos with a simple background whose object plausibly IS this product (same category, similar material and colour).
If no acceptable photo exists for a role, omit that role from picks rather than forcing a bad one. Scores are 0–1 confidence that the photo works for that role. Reasons are one short sentence.`;
  const schema = {
    type: "object", additionalProperties: false, required: ["picks", "runners_up"],
    properties: {
      picks: { type: "array", items: { type: "object", additionalProperties: false, required: ["role", "index", "score", "reason"], properties: { role: { type: "string", enum: [...ROLES] }, index: { type: "integer" }, score: { type: "number" }, reason: { type: "string" } } } },
      runners_up: { type: "array", items: { type: "object", additionalProperties: false, required: ["role", "index"], properties: { role: { type: "string", enum: [...ROLES] }, index: { type: "integer" } } } },
    },
  };
  const { data, usage } = await structured<PickResult>({ model: "claude-sonnet-5-5", system, content, schema, toolName: "pick_photos", maxTokens: 3000 });

  const valid = (i: unknown): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < subset.length;
  const byRole = new Map<Role, { index: number; score: number; reason: string }>();
  for (const p of data.picks ?? []) if (ROLES.includes(p.role) && valid(p.index) && !byRole.has(p.role)) byRole.set(p.role, p);
  if (byRole.size === 0) throw new Error("Claude accepted none of the candidates");
  const bestRole = [...byRole.entries()].sort((a, b) => b[1].score - a[1].score)[0][0];
  const hero = byRole.get("hero") ?? byRole.get(bestRole)!;
  const fallbackLabel = byRole.has("hero") ? "reusing hero" : `reusing best available (${bestRole})`;
  if (byRole.size < 3) console.warn(`  only ${byRole.size}/5 roles had an acceptable photo — the rest reuse it`);
  const used = new Set([...byRole.values()].map((p) => p.index));
  const picked: Picked[] = ROLES.map((role) => {
    const p = byRole.get(role);
    const base = p ?? hero;
    const alts = (data.runners_up ?? []).filter((r) => r.role === role && valid(r.index) && !used.has(r.index)).slice(0, 2).map((r) => subset[r.index]);
    return { role, cand: subset[base.index], score: p ? Math.max(0, Math.min(1, base.score)) : Math.max(0, base.score - 0.15), reason: p ? base.reason : `no acceptable ${role} photo — ${fallbackLabel}`, alts };
  });
  return { picked, usage };
}

// ───────────────────────── attribution file
type Attribution = Record<string, { role: string; storage_path: string; title: string | null; creator: string | null; license: string; foreign_landing_url: string; openverse_id?: string }[]>;
async function writeAttribution(slug: string, rows: Attribution[string]) {
  let all: Attribution = {};
  try { all = JSON.parse(await readFile(ATTRIBUTION_FILE, "utf8")); } catch { /* first run */ }
  all[slug] = rows;
  await writeFile(ATTRIBUTION_FILE, JSON.stringify(all, null, 2) + "\n");
}

// ───────────────────────── ffmpeg slideshow
let drawtextOk: boolean | null = null;
async function hasDrawtext(): Promise<boolean> {
  if (drawtextOk == null) {
    try { const { stdout } = await exec(FFMPEG, ["-hide_banner", "-filters"]); drawtextOk = /\bdrawtext\b/.test(stdout); } catch { drawtextOk = false; }
    if (!drawtextOk) console.warn("  ffmpeg: no drawtext filter — videos rendered without captions");
  }
  return drawtextOk;
}

/** Slow Ken-Burns slideshow, 1080×1920 @30fps, silent. Each photo gets ~2.5 s; the list is cycled if the clip is longer. */
async function slideshow(photos: string[], totalSec: number, out: string, caption: string | null): Promise<number> {
  const total = Math.max(5, Math.min(30, totalSec));
  const count = Math.max(1, Math.round(total / 2.5));
  const seq = Array.from({ length: count }, (_, i) => photos[i % photos.length]);
  const seg = total / count, fps = 30, frames = Math.round(seg * fps);
  const font = process.env.CAPTION_FONT;
  const captions = caption && font && (await hasDrawtext());
  const inputs = seq.flatMap((f) => ["-loop", "1", "-framerate", String(fps), "-t", seg.toFixed(3), "-i", f]);
  const chains = seq.map((_, i) => {
    const zoom = i % 2 === 0 ? `min(zoom+0.0010,1.22)` : `if(lte(on,1),1.22,max(zoom-0.0010,1.0))`;
    let c = `[${i}:v]scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,zoompan=z='${zoom}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps},trim=end_frame=${frames},setpts=PTS-STARTPTS,setsar=1`;
    if (i === 0 && captions) {
      const text = caption!.replace(/[\\':%]/g, (m) => "\\" + m);
      c += `,drawtext=fontfile='${font}':text='${text}':fontcolor=white:fontsize=64:borderw=4:bordercolor=black@0.6:x=(w-text_w)/2:y=h*0.78`;
    }
    return `${c}[v${i}]`;
  });
  const filter = `${chains.join(";")};${seq.map((_, i) => `[v${i}]`).join("")}concat=n=${seq.length}:v=1:a=0,format=yuv420p[out]`;
  await exec(FFMPEG, ["-y", "-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", filter, "-map", "[out]", "-r", String(fps), "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-movflags", "+faststart", "-an", out], { maxBuffer: 64 * 1024 * 1024 });
  return total;
}

// ───────────────────────── Storage helpers (service role)
type Db = Awaited<ReturnType<typeof dbMod>>["db"];
const dbMod = () => import("../worker/lib/db");

async function listAll(db: Db, bucket: string, prefix: string): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`list ${prefix}: ${error.message}`);
    for (const e of data ?? []) {
      const p = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id == null) out.push(...(await listAll(db, bucket, p))); // folder
      else out.push(p);
    }
    if (!data || data.length < 1000) break;
  }
  return out;
}
async function removePrefix(db: Db, bucket: string, prefix: string): Promise<number> {
  const paths = await listAll(db, bucket, prefix);
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await db.storage.from(bucket).remove(paths.slice(i, i + 100));
    if (error) throw new Error(`remove under ${prefix}: ${error.message}`);
  }
  return paths.length;
}
async function copyObj(db: Db, bucket: string, from: string, to: string): Promise<string> {
  const { error } = await db.storage.from(bucket).copy(from, to);
  if (error) throw new Error(`copy ${from} → ${to}: ${error.message}`);
  return to;
}

// ───────────────────────── claude_actions synthesis
function actionsFor(kit: MockKit, startedAt: Date, finishedAt: Date) {
  const span = finishedAt.getTime() - startedAt.getTime();
  const summaries = new Map(kit.what_claude_did.map((w) => [w.step, w.summary]));
  let prevPct = 0;
  return PIPELINE_STEPS.map(({ step, pct }) => {
    const t0 = new Date(startedAt.getTime() + span * (prevPct / 100));
    const t1 = new Date(startedAt.getTime() + span * (pct / 100) - 300);
    prevPct = pct;
    const seed = `${kit.slug}:${step}`;
    let model: string | null = null, input: number | null = null, output: number | null = null, cost: number | null = null;
    if (step === "score_frames" || step === "extract_attributes") {
      model = "claude-sonnet-5-5";
      input = step === "score_frames" ? Math.round(rand(seed + "i", 2500, 2900)) : Math.round(rand(seed + "i", 1600, 2200));
      output = step === "score_frames" ? Math.round(rand(seed + "o", 800, 1000)) : Math.round(rand(seed + "o", 350, 600));
      cost = (input * 2 + output * 10) / 1_000_000 * 100;
    } else if (step !== "watch_footage" && step !== "cut_points") {
      model = "claude-opus-5-5";
      input = Math.round(rand(seed + "i", 1000, 5000));
      output = Math.round(rand(seed + "o", 300, 1800));
      cost = (input * 4 + output * 20) / 1_000_000 * 100;
    }
    return {
      step: step as ClaudeStep, summary: summaries.get(step) ?? `${step.replace(/_/g, " ")} done`, metrics: null,
      model, input_tokens: input, output_tokens: output, cost_cents: cost == null ? null : Math.round(cost * 1000) / 1000,
      started_at: t0.toISOString(), finished_at: t1.toISOString(),
    };
  });
}

// ───────────────────────── one kit
type Ctx = { db: Db; bucket: string; upload: (p: string, b: Buffer, ct: string) => Promise<string>; sellerId: string; index: number; total: number; keepPhotos: boolean };
type KitResult = { slug: string; launchId: string; photos: number; videos: number; ms: number; reasons: string[] };

async function seedKit(kit: MockKit, ctx: Ctx): Promise<KitResult> {
  const { db, bucket, upload, sellerId } = ctx;
  const t = Date.now();
  const dir = path.join(WORK, kit.slug);
  await rm(dir, { recursive: true, force: true }); await mkdir(dir, { recursive: true });
  const isKnit = kit.slug === KNIT_SLUG;
  const mockFrames = `mock/${kit.slug}/frames`, mockVideos = `mock/${kit.slug}/videos`;
  const reasons: string[] = [];

  // ── 1. idempotency: drop the previous launch with the same title (and its Storage objects)
  const { data: prev } = await db.from("launches").select("id").eq("seller_id", sellerId).eq("product_title", kit.product_title);
  for (const p of prev ?? []) {
    await removePrefix(db, bucket, `${sellerId}/${p.id}`);
    await db.from("credit_ledger").delete().eq("launch_id", p.id); // the credit comes back below so a reseed is credit-neutral
    await db.rpc("refund_credit", { p_seller: sellerId });
    await db.from("launches").delete().eq("id", p.id);
  }

  // ── 2. photos → mock/<slug>/frames/<role>.jpg (+ _alt1/_alt2), local copies kept for the slideshow
  type FrameSrc = { role: Role; path: string; local: string; score: number; reason: string; alts: string[] };
  const frameSrcs: FrameSrc[] = [];
  const kitFrame = (role: Role) => kit.frames.find((f) => f.role === role);
  const norm = (score: number | undefined) => score == null ? 0.85 : Math.round(Math.max(0, Math.min(1, score > 1 ? score / 100 : score)) * 1000) / 1000; // gen-mock writes 0–100
  const existing = ctx.keepPhotos ? new Set(await listAll(db, bucket, mockFrames)) : new Set<string>();

  if (isKnit) {
    const map: Record<Role, string> = { hero: "photo-hero.jpg", detail: "photo-cables.jpg", in_hand: "photo-closeup.jpg", process: "photo-progress.jpg", scale: "photo-yarn.jpg" };
    const bufs = Object.fromEntries(await Promise.all(ROLES.map(async (r) => [r, await readFile(path.join(KNIT_DIR, map[r]))] as const))) as Record<Role, Buffer>;
    for (const [n, role] of ROLES.entries()) {
      const local = path.join(dir, `${role}.jpg`); await writeFile(local, bufs[role]);
      const p = await upload(`${mockFrames}/${role}.jpg`, bufs[role], "image/jpeg");
      const alts: string[] = [];
      for (let k = 1; k <= 2; k++) alts.push(await upload(`${mockFrames}/${role}_alt${k}.jpg`, bufs[ROLES[(n + k) % ROLES.length]], "image/jpeg"));
      const kf = kitFrame(role);
      frameSrcs.push({ role, path: p, local, score: norm(kf?.score), reason: kf?.reason ?? "", alts });
    }
    await writeAttribution(kit.slug, ROLES.map((r) => ({ role: r, storage_path: `${mockFrames}/${r}.jpg`, title: `Launch Kit sample — ${map[r]}`, creator: "Launch Kit team", license: "own work", foreign_landing_url: "/example" })));
  } else if (existing.has(`${mockFrames}/hero.jpg`)) {
    console.log(`  reusing photos already in ${mockFrames}`);
    const { download } = await dbMod();
    for (const role of ROLES) {
      const p = `${mockFrames}/${role}.jpg`, local = path.join(dir, `${role}.jpg`);
      await writeFile(local, await download(p));
      const kf = kitFrame(role);
      frameSrcs.push({ role, path: p, local, score: norm(kf?.score), reason: kf?.reason ?? "", alts: [1, 2].map((k) => `${mockFrames}/${role}_alt${k}.jpg`).filter((a) => existing.has(a)) });
    }
  } else {
    await mkdir(path.join(dir, "cand"), { recursive: true });
    const cands = await gatherCandidates(kit, path.join(dir, "cand"));
    if (cands.length === 0) throw new Error("no usable Openverse candidates");
    const t1 = Date.now();
    const { picked, usage } = await pickWithClaude(kit, cands);
    console.log(`  claude-sonnet-5-5 picked ${picked.length} roles in ${((Date.now() - t1) / 1000).toFixed(1)} s (${usage.input_tokens} in / ${usage.output_tokens} out)`);
    const attr: Attribution[string] = [];
    for (const pk of picked) {
      const local = path.join(dir, `${pk.role}.jpg`); await writeFile(local, await readFile(pk.cand.file));
      const p = await upload(`${mockFrames}/${pk.role}.jpg`, await readFile(pk.cand.file), "image/jpeg");
      attr.push({ role: pk.role, storage_path: p, title: pk.cand.ov.title, creator: pk.cand.ov.creator, license: `CC ${pk.cand.ov.license.toUpperCase()} ${pk.cand.ov.license_version ?? ""}`.trim(), foreign_landing_url: pk.cand.ov.foreign_landing_url, openverse_id: pk.cand.ov.id });
      const alts: string[] = [];
      for (const [k, a] of pk.alts.entries()) {
        const ap = await upload(`${mockFrames}/${pk.role}_alt${k + 1}.jpg`, await readFile(a.file), "image/jpeg");
        alts.push(ap);
        attr.push({ role: `${pk.role}_alt${k + 1}`, storage_path: ap, title: a.ov.title, creator: a.ov.creator, license: `CC ${a.ov.license.toUpperCase()} ${a.ov.license_version ?? ""}`.trim(), foreign_landing_url: a.ov.foreign_landing_url, openverse_id: a.ov.id });
      }
      // Claude's reason is what the result screen shows; fall back to the kit's text when a role was back-filled from the hero.
      const kf = kitFrame(pk.role);
      frameSrcs.push({ role: pk.role, path: p, local, score: Math.round(pk.score * 1000) / 1000, reason: pk.reason, alts });
      reasons.push(`${pk.role} (#${cands.indexOf(pk.cand)} ${pk.score.toFixed(2)}): ${pk.reason}${kf ? "" : " [no kit frame]"}`);
    }
    await writeAttribution(kit.slug, attr);
  }
  const localOf = (r: Role) => frameSrcs.find((f) => f.role === r)!.local;

  // ── 3. videos → mock/<slug>/videos/<platform>.mp4
  const videoPaths = new Map<string, { path: string; duration: number; aspect: string; captions: boolean }>();
  if (isKnit) {
    const files: Record<string, { file: string; aspect: string }> = { etsy: { file: "input.mp4", aspect: "16:9" }, tiktok: { file: "short-tiktok.mp4", aspect: "9:16" }, reels: { file: "short-reels.mp4", aspect: "9:16" }, shorts: { file: "short-shorts.mp4", aspect: "9:16" } };
    for (const v of kit.videos) {
      const f = files[v.platform]; if (!f) continue;
      const p = await upload(`${mockVideos}/${v.platform}.mp4`, await readFile(path.join(KNIT_DIR, f.file)), "video/mp4");
      videoPaths.set(v.platform, { path: p, duration: v.duration_sec, aspect: f.aspect, captions: !!v.hook_text });
    }
  } else {
    const captions = !!process.env.CAPTION_FONT && (await hasDrawtext());
    for (const v of kit.videos) {
      const order: Role[] = v.kind === "listing" ? ["hero", "detail", "in_hand", "process", "scale"] : ["process", "detail", "in_hand", "hero"];
      const out = path.join(dir, `${v.platform}.mp4`);
      const dur = await slideshow(order.map(localOf), v.duration_sec, out, v.hook_text);
      const p = await upload(`${mockVideos}/${v.platform}.mp4`, await readFile(out), "video/mp4");
      videoPaths.set(v.platform, { path: p, duration: dur, aspect: "9:16", captions: captions && v.cuts.some((c) => !!c.caption) });
    }
  }

  // ── 4. DB rows
  const now = Date.now();
  const spreadDays = ctx.total > 1 ? (2 + (ctx.index * 19) / (ctx.total - 1)) : 2; // kit 0 = 2 days ago … last ≈ 3 weeks ago
  const createdAt = new Date(now - spreadDays * 86_400_000);
  createdAt.setHours(9 + (hash32(kit.slug) % 9), hash32(kit.slug + "m") % 60, hash32(kit.slug + "s") % 60, 0);
  const startedAt = new Date(createdAt.getTime() + 18_000);
  const finishedAt = new Date(startedAt.getTime() + kit.build_seconds * 1000);

  const { data: launch, error: lErr } = await db.from("launches").insert({
    seller_id: sellerId, status: "ready", product_title: kit.product_title, product_name_hint: null,
    target_channels: ["etsy", "shopify", "tiktok"], started_at: startedAt.toISOString(), finished_at: finishedAt.toISOString(),
    minutes_saved_est: kit.minutes_saved_est, credits_used: 1, created_at: createdAt.toISOString(),
  }).select("id").single();
  if (lErr || !launch) throw new Error(`insert launch: ${lErr?.message}`);
  const id = launch.id as string;
  const base = `${sellerId}/${id}`;

  await db.from("credit_ledger").insert({ seller_id: sellerId, launch_id: id, delta: -1, reason: "launch", created_at: createdAt.toISOString() });
  const { data: seller } = await db.from("sellers").select("credits_remaining").eq("id", sellerId).single();
  await db.from("sellers").update({ credits_remaining: Math.max(0, ((seller?.credits_remaining ?? 1) as number) - 1) }).eq("id", sellerId);

  // source media: the etsy listing video doubles as the "uploaded" source, plus N photos
  const etsy = videoPaths.get("etsy");
  const srcVideoPath = etsy ? await copyObj(db, bucket, etsy.path, `${base}/source/${kit.source.video_name.replace(/\.[^.]+$/, "")}.mp4`) : `${base}/source/${kit.source.video_name}`;
  const { data: srcVideo } = await db.from("source_media").insert({
    launch_id: id, kind: "video", storage_path: srcVideoPath, original_name: kit.source.video_name,
    duration_sec: kit.source.duration_sec, fps: kit.source.fps, frame_count: Math.round(kit.source.duration_sec * kit.source.fps),
    width_px: 1920, height_px: 1080,
  }).select("id").single();
  const srcId = srcVideo?.id ?? null;
  if (kit.source.photos > 0) {
    await db.from("source_media").insert(Array.from({ length: kit.source.photos }, (_, i) => ({
      launch_id: id, kind: "photo", storage_path: `${base}/source/photo-${i + 1}.jpg`, original_name: `IMG_${4210 + i}.jpg`, width_px: 3024, height_px: 4032,
    })));
  }

  await db.from("product_attributes").insert({
    launch_id: id, category: kit.category, materials: kit.attributes.materials, colors: kit.attributes.colors, dimensions: kit.attributes.dimensions,
    care: kit.attributes.care, production_hours: kit.attributes.production_hours, made_to_order: kit.attributes.made_to_order,
    lead_time_days_min: kit.attributes.lead_time_days[0], lead_time_days_max: kit.attributes.lead_time_days[1], raw: { scenes: kit.scenes, seller: kit.seller },
  });

  // frames: copy mock/<slug>/frames/* → ${sellerId}/${launchId}/frames/*
  const frameIds: Record<Role, string> = {} as Record<Role, string>;
  for (const [i, f] of frameSrcs.entries()) {
    const kf = kitFrame(f.role);
    const p = await copyObj(db, bucket, f.path, `${base}/frames/${f.role}.jpg`);
    const { data: row, error } = await db.from("frames").insert({ launch_id: id, source_id: srcId, role: f.role, timecode_sec: kf?.timecode_sec ?? null, score: f.score, score_reason: f.reason, storage_path_raw: p, sort_order: i, selected: true }).select("id").single();
    if (error || !row) throw new Error(`insert frame: ${error?.message}`);
    frameIds[f.role] = row.id as string;
    for (const [k, alt] of f.alts.entries()) {
      const ap = await copyObj(db, bucket, alt, `${base}/frames/${f.role}_alt${k + 1}.jpg`);
      await db.from("frames").insert({ launch_id: id, source_id: srcId, role: f.role, timecode_sec: kf?.timecode_sec != null ? Math.round((kf.timecode_sec + (k + 1) * 1.3) * 10) / 10 : null, score: Math.max(0, Math.round((f.score - 0.08 * (k + 1)) * 1000) / 1000), score_reason: "runner-up for this role", storage_path_raw: ap, sort_order: 99, selected: false });
    }
  }

  const li = kit.listing;
  const { error: liErr } = await db.from("listings").upsert({
    launch_id: id, title: li.title.slice(0, 140), tags: li.tags.slice(0, 13), description: li.description, price_cents: li.price_cents, currency: "USD",
    price_low_cents: li.price_low_cents, price_high_cents: li.price_high_cents, cost_basis_cents: li.cost_basis_cents, comparables_read: li.comparables_read,
    price_reasoning: li.price_reasoning, updated_at: finishedAt.toISOString(),
  });
  if (liErr) throw new Error(`listing: ${liErr.message}`);

  await db.from("listing_localizations").insert(kit.localizations.map((l) => ({
    launch_id: id, market: l.market, locale: l.locale, title: l.title.slice(0, 140), tags: l.tags.slice(0, 13), description: l.description,
    price_cents: l.price_cents, currency: l.currency, fx_rate: Math.round((l.price_cents / li.price_cents) * 1e6) / 1e6,
    shipping_cents_included: SHIPPING_CENTS[l.market] ?? 2000, enabled: true,
  })));

  const videoRows = [];
  for (const [n, v] of kit.videos.entries()) {
    const vp = videoPaths.get(v.platform);
    const copied = vp ? await copyObj(db, bucket, vp.path, `${base}/videos/${v.platform}.mp4`) : null;
    videoRows.push({
      launch_id: id, kind: v.kind, platform: v.platform, hook_text: v.hook_text, hook_rationale: v.hook_rationale, cut_points: v.cuts,
      duration_sec: vp?.duration ?? v.duration_sec, aspect: vp?.aspect ?? "9:16", has_captions: vp?.captions ?? false, storage_path: copied, sort_order: n,
    });
  }
  await db.from("videos").insert(videoRows);

  await db.from("social_assets").insert([
    { launch_id: id, kind: "pinterest_pin", title: kit.social.pin_title, caption: kit.social.pin_caption, frame_ids: [frameIds.hero], sort_order: 0 },
    { launch_id: id, kind: "instagram_carousel", title: null, caption: kit.social.carousel_caption, frame_ids: ROLES.map((r) => frameIds[r]), sort_order: 1 },
  ]);
  await db.from("publications").insert(["etsy", "shopify", "tiktok"].map((channel) => ({ launch_id: id, channel, status: "draft" })));
  await db.from("claude_actions").insert(actionsFor(kit, startedAt, finishedAt).map((a) => ({ ...a, launch_id: id })));

  return { slug: kit.slug, launchId: id, photos: frameSrcs.length, videos: videoRows.filter((v) => v.storage_path).length, ms: Date.now() - t, reasons };
}

// ───────────────────────── main
async function main() {
  const sellerId = process.env.DEMO_SELLER_ID;
  if (!sellerId) throw new Error("DEMO_SELLER_ID missing from env");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase env missing");
  const { db, BUCKET, upload } = await dbMod();

  const all = JSON.parse(await readFile(path.resolve(ROOT, ARGS.kits), "utf8")) as MockKit[];
  if (!Array.isArray(all) || all.length === 0) throw new Error(`${ARGS.kits}: expected a non-empty array of kits`);
  const kits = ARGS.only ? all.filter((k) => ARGS.only!.includes(k.slug)) : all;
  if (ARGS.only) for (const s of ARGS.only) if (!all.some((k) => k.slug === s)) console.warn(`--only: slug "${s}" not in ${ARGS.kits}`);
  console.log(`seed-mock: ${kits.length}/${all.length} kits from ${ARGS.kits} → ${process.env.NEXT_PUBLIC_SUPABASE_URL} (bucket ${BUCKET}, seller ${sellerId})`);

  if (ARGS.clean) {
    const t = Date.now();
    const { data: ls } = await db.from("launches").select("id").eq("seller_id", sellerId);
    const { error } = await db.from("launches").delete().eq("seller_id", sellerId);
    if (error) throw new Error(`clean launches: ${error.message}`);
    const n1 = await removePrefix(db, BUCKET, sellerId);
    const n2 = await removePrefix(db, BUCKET, "mock");
    await db.from("credit_ledger").delete().eq("seller_id", sellerId);
    await db.from("sellers").update({ credits_remaining: 12 }).eq("id", sellerId);
    console.log(`clean: deleted ${ls?.length ?? 0} launches, ${n1 + n2} storage objects; credits reset to 12 (${((Date.now() - t) / 1000).toFixed(1)} s)`);
  }

  await mkdir(WORK, { recursive: true });
  const results: KitResult[] = [];
  const failures: { slug: string; error: string }[] = [];
  for (const [i, kit] of kits.entries()) {
    const index = all.indexOf(kit); // position in the full file keeps created_at stable across --only runs
    console.log(`\n[${i + 1}/${kits.length}] ${kit.slug} — ${kit.product_title}`);
    try {
      const r = await seedKit(kit, { db, bucket: BUCKET, upload, sellerId, index, total: all.length, keepPhotos: ARGS.keepPhotos });
      results.push(r);
      console.log(`  ✓ ${r.slug}  launch ${r.launchId}  photos ${r.photos}  videos ${r.videos}  (${(r.ms / 1000).toFixed(1)} s)`);
      for (const line of r.reasons) console.log(`    · ${line}`);
    } catch (e) {
      failures.push({ slug: kit.slug, error: (e as Error).message });
      console.error(`  ✗ ${kit.slug}: ${(e as Error).message}`);
    }
  }
  console.log(`\nseeded ${results.length} launches${failures.length ? `, ${failures.length} failed (${failures.map((f) => f.slug).join(", ")})` : ""}`);
  if (failures.length) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
