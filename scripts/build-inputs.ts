#!/usr/bin/env -S npx tsx
/**
 * Build realistic TEST INPUT PACKS for Launch Kit — the files a tester drops into the upload box.
 *
 *   npx tsx scripts/build-inputs.ts                 # all 6 packs: fetch → encode → pick photos → verify → upload
 *   npx tsx scripts/build-inputs.ts --only pottery-mug,handmade-soap
 *   npx tsx scripts/build-inputs.ts --no-upload     # skip Supabase Storage
 *   npx tsx scripts/build-inputs.ts --force         # re-encode video and re-run the photo pick even if outputs exist
 *
 * Output per pack: mock/inputs/<slug>/{input.mp4, photo-1..3.jpg, hints.json, SOURCE.md}
 * Plus mock/inputs/manifest.json (what README.md is written from).
 *
 * Sources (no API key needed):
 *   - Wikimedia Commons API for making-of footage (CC-BY / CC-BY-SA / CC0), re-encoded with ffmpeg to H.264 ≤1080p, 60–180 s, no audio.
 *   - Openverse API for finished-product (and, for slideshow fallbacks, process) photos; ONE Claude vision call per pack picks the best 3.
 *   - Packs with no usable Commons footage get a 60 s "process → finished product" zoompan slideshow (flagged in SOURCE.md).
 * Needs: ffmpeg/ffprobe on PATH (or FFMPEG_PATH), ANTHROPIC_API_KEY, Supabase service role in .env (unless --no-upload).
 * Downloads are cached in mock/inputs/.cache/<slug>/ so re-runs are cheap.
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { structured, imageBlock } from "../worker/lib/claude";

const exec = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_ROOT = path.join(ROOT, "mock", "inputs");
const UA = "launch-kit-hackathon/0.1 (https://launch-kit-test-m.vercel.app; test-input builder)";
const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";
const FFPROBE = FFMPEG.replace(/ffmpeg$/, "ffprobe");
const PICK_MODEL = "claude-sonnet-5-5";
const MIN_SEC = 60, MAX_SEC = 180, MAX_BYTES = 150 * 1024 * 1024;
const BUCKET = process.env.SUPABASE_BUCKET ?? "launches";

// ---------------------------------------------------------------------------------------------
// Pack definitions
// ---------------------------------------------------------------------------------------------
type CommonsPart = { title: string; start?: number; duration?: number };
type VideoSpec =
  | { kind: "commons"; parts: CommonsPart[]; retime?: boolean; note?: string }
  | { kind: "slideshow"; processQueries: string[]; note: string };
type PhotoSpec =
  | { kind: "openverse"; queries: string[] }
  | { kind: "example"; dir: string; files: string[]; note: string };
type Pack = {
  slug: string;
  product: string;            // what Claude should look for in photos
  hints: { product_name: string; materials: string; price_usd: number; ships_from: string };
  video: VideoSpec;
  photos: PhotoSpec;
  extraFiles?: { from: string; to: string; note: string }[];
};

const PACKS: Pack[] = [
  {
    slug: "pottery-mug",
    product: "a wheel-thrown handmade ceramic / stoneware mug (finished, glazed)",
    hints: { product_name: "Speckled stoneware mug", materials: "Stoneware clay, food-safe glaze", price_usd: 42, ships_from: "Portland, OR" },
    video: { kind: "commons", parts: [{ title: "File:Pottery on porters wheel.webm" }], note: "Full clip (potter centering and pulling a form on the wheel). Portrait phone footage, kept as shot." },
    photos: { kind: "openverse", queries: ["handmade mug", "stoneware mug", "pottery mug"] },
  },
  {
    slug: "knit-scarf",
    product: "a hand-knitted scarf (finished knitwear, cables or ribbing)",
    hints: { product_name: "Chunky hand-knit cable scarf", materials: "100% merino wool", price_usd: 68, ships_from: "Burlington, VT" },
    video: { kind: "commons", parts: [{ title: "File:Knitting (close-up).webm" }], note: "Full clip (close-up of hands knitting). The repo's bundled 10 s example clip is too short for the 60–180 s input rule, so it is packaged alongside as input-short.mp4." },
    photos: { kind: "example", dir: "public/example/knit", files: ["photo-hero.jpg", "photo-closeup.jpg", "photo-cables.jpg"], note: "Reused from the repo's bundled example assets (public/example/knit); produced by the Launch Kit team for the demo." },
    extraFiles: [{ from: "public/example/knit/input.mp4", to: "input-short.mp4", note: "The original 10 s example making-of clip from public/example/knit (team asset)." }],
  },
  {
    slug: "hand-poured-candle",
    product: "handmade candles (hand-dipped or hand-poured, beeswax or soy; finished product)",
    hints: { product_name: "Hand-dipped beeswax taper candles (pair)", materials: "Pure beeswax, cotton wick", price_usd: 28, ships_from: "Asheville, NC" },
    video: {
      kind: "commons",
      parts: [{ title: "File:Ljusstöpning-dopp.ogv" }, { title: "File:Ljusstöpning-dopp och vändning.ogv" }, { title: "File:Ljusstöpning-droppklipp.ogv" }],
      note: "Three short clips by the same author concatenated (dipping tapers → turning the racks → trimming the drips). Source is 640×480, so the pack is 480p; no Commons footage of hand-poured container candles ≥60 s exists, hence dipped tapers.",
    },
    photos: { kind: "openverse", queries: ["beeswax candles", "taper candles", "handmade candles"] },
  },
  {
    slug: "woven-wall-hanging",
    product: "a handwoven textile wall hanging / tapestry on a dowel (finished fiber art)",
    hints: { product_name: "Handwoven wall hanging", materials: "Cotton warp, wool and linen weft, driftwood dowel", price_usd: 145, ships_from: "Santa Fe, NM" },
    video: { kind: "commons", parts: [{ title: "File:Weaving demonstrated on a historic loom in Leiden.webm" }], retime: true, note: "Full clip (weaver throwing the shuttle and beating the weft on a floor loom). The upload has a broken timestamp track, so frames are re-timed to 30 fps (~76 s)." },
    photos: { kind: "openverse", queries: ["woven wall hanging", "weaving wall hanging", "handwoven tapestry"] },
  },
  {
    slug: "leather-wallet",
    product: "a handmade leather bifold / card wallet (finished product)",
    hints: { product_name: "Minimalist full-grain leather bifold wallet", materials: "Full-grain vegetable-tanned leather, waxed linen thread", price_usd: 85, ships_from: "Austin, TX" },
    video: { kind: "slideshow", processQueries: ["leather stitching", "leathercraft", "leather tools"], note: "No Commons video of wallet making was usable (\"Tangraig Evans the Saddler\" is a talking-head interview; the only leather-making clip is 16 s). Built a 60 s process → finished-product slideshow from Openverse photos instead." },
    photos: { kind: "openverse", queries: ["leather wallet", "handmade wallet", "bifold wallet"] },
  },
  {
    slug: "handmade-soap",
    product: "handmade cold-process soap bars (finished product)",
    hints: { product_name: "Cold process oatmeal honey soap bar", materials: "Olive oil, coconut oil, shea butter, oatmeal, honey", price_usd: 9, ships_from: "Madison, WI" },
    video: { kind: "slideshow", processQueries: ["soap making", "making soap", "soap cutting"], note: "The only Commons soap-making video (\"Nigeria Liquid Soap Making\") is mostly an interview with a burned-in name caption and shows liquid soap, so it was rejected. Built a 60 s process → finished-product slideshow from Openverse photos instead." },
    photos: { kind: "openverse", queries: ["handmade soap", "soap bars", "artisan soap"] },
  },
];

// ---------------------------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------------------------
const log = (slug: string, msg: string) => console.log(`[${slug}] ${msg}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function fetchWithRetry(url: string, init: RequestInit = {}, tries = 3, timeoutMs = 90_000): Promise<Response> {
  let lastWait = 5000;
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(timeoutMs) });
      if (res.status === 429 || res.status >= 500) {
        // Wikimedia/Openverse rate limits: honour Retry-After (capped), otherwise back off
        const ra = Number(res.headers.get("retry-after") ?? 0);
        lastWait = Math.min(120_000, ra > 0 ? ra * 1000 : 5000 * 2 ** i);
        throw new Error(`HTTP ${res.status}`);
      }
      return res;
    } catch (e) {
      if (i >= tries - 1) throw e;
      console.warn(`  retry ${i + 1}/${tries - 1} for ${url.slice(0, 80)} (${e instanceof Error ? e.message : e}) in ${lastWait / 1000}s`);
      await sleep(lastWait);
      lastWait = Math.min(120_000, lastWait * 2);
    }
  }
}

async function downloadTo(url: string, file: string, big = false): Promise<boolean> {
  if (existsSync(file) && (await stat(file)).size > 0) return true;
  try {
    const res = await fetchWithRetry(url, {}, big ? 4 : 2, big ? 600_000 : 60_000);
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return false;
    await writeFile(file, buf);
    return true;
  } catch {
    return false;
  }
}

async function probe(file: string) {
  const { stdout } = await exec(FFPROBE, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,pix_fmt,width,height,r_frame_rate:format=duration,size", "-of", "json", file]);
  const j = JSON.parse(stdout);
  const s = j.streams?.[0] ?? {};
  return { duration: Number(j.format?.duration ?? 0), size: Number(j.format?.size ?? 0), codec: String(s.codec_name), pix_fmt: String(s.pix_fmt), width: Number(s.width), height: Number(s.height) };
}

/** Clips with broken containers report absurd durations; count frames instead. */
async function realDuration(file: string): Promise<number> {
  const p = await probe(file);
  if (p.duration > 0 && p.duration < 36_000) return p.duration;
  const { stdout } = await exec(FFPROBE, ["-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets,r_frame_rate", "-of", "json", file]);
  const s = JSON.parse(stdout).streams[0];
  const [n, d] = String(s.r_frame_rate).split("/").map(Number);
  return Number(s.nb_read_packets) / (n / (d || 1));
}

// ---- Wikimedia Commons ------------------------------------------------------------------------
type CommonsInfo = { title: string; url: string; pageUrl: string; license: string; licenseUrl: string; author: string; width: number; height: number; bytes: number };

async function commonsInfo(titles: string[]): Promise<Map<string, CommonsInfo>> {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  u.searchParams.set("action", "query"); u.searchParams.set("prop", "imageinfo"); u.searchParams.set("format", "json");
  u.searchParams.set("iiprop", "url|size|extmetadata|mime"); u.searchParams.set("titles", titles.join("|"));
  const j = await (await fetchWithRetry(u.toString())).json();
  const out = new Map<string, CommonsInfo>();
  for (const p of Object.values(j.query.pages) as Array<{ title: string; imageinfo?: Array<Record<string, unknown>> }>) {
    const ii = p.imageinfo?.[0];
    if (!ii) continue;
    const em = (ii.extmetadata ?? {}) as Record<string, { value: string }>;
    out.set(p.title, {
      title: p.title,
      url: String(ii.url).split("?")[0],
      pageUrl: String(ii.descriptionurl),
      license: em.LicenseShortName?.value ?? "unknown",
      licenseUrl: em.LicenseUrl?.value ?? "",
      author: stripHtml(em.Artist?.value ?? em.Credit?.value ?? "unknown"),
      width: Number(ii.width), height: Number(ii.height), bytes: Number(ii.size),
    });
  }
  // Commons normalises titles (e.g. "_" vs " "); map requested titles back by case-insensitive match.
  for (const t of titles) if (!out.has(t)) {
    const hit = [...out.values()].find((v) => v.title.toLowerCase() === t.toLowerCase());
    if (hit) out.set(t, hit); else throw new Error(`Commons: ${t} not found`);
  }
  return out;
}

// ---- Openverse --------------------------------------------------------------------------------
type OvImage = { id: string; title: string; url: string; creator: string; license: string; license_version: string; license_url: string; foreign_landing_url: string; width: number; height: number; query: string };

async function openverse(query: string, pageSize = 20): Promise<OvImage[]> {
  const u = new URL("https://api.openverse.org/v1/images/");
  u.searchParams.set("q", query); u.searchParams.set("license_type", "commercial"); u.searchParams.set("size", "medium,large"); u.searchParams.set("page_size", String(pageSize));
  const res = await fetchWithRetry(u.toString());
  if (!res.ok) { console.warn(`openverse "${query}": HTTP ${res.status}`); return []; }
  const j = await res.json() as { results?: Array<Record<string, unknown>> };
  return (j.results ?? [])
    .filter((r) => !/nd/.test(String(r.license)))          // no-derivatives would forbid our resize/slideshow
    .map((r) => ({
      id: String(r.id), title: String(r.title ?? "untitled"), url: String(r.url), creator: String(r.creator ?? "unknown"),
      license: String(r.license), license_version: String(r.license_version ?? ""), license_url: String(r.license_url ?? ""),
      foreign_landing_url: String(r.foreign_landing_url ?? ""), width: Number(r.width ?? 0), height: Number(r.height ?? 0), query,
    }));
}

type Candidate = { file: string; small: Buffer; meta: OvImage };

/** Download up to `cap` images for a set of queries, resize to 1600 max side (JPEG q85), and make 512 px copies for the vision call. */
async function gatherCandidates(slug: string, group: string, queries: string[], cap: number, cacheDir: string): Promise<Candidate[]> {
  const dir = path.join(cacheDir, group); await mkdir(dir, { recursive: true });
  const metaFile = path.join(dir, "candidates.json");
  let metas: OvImage[] = [];
  if (existsSync(metaFile)) metas = JSON.parse(await readFile(metaFile, "utf8"));
  else {
    const seen = new Set<string>();
    for (const q of queries) {
      const list = await openverse(q);
      log(slug, `openverse "${q}" → ${list.length} usable results`);
      for (const r of list) if (!seen.has(r.id)) { seen.add(r.id); metas.push(r); }
    }
    await writeFile(metaFile, JSON.stringify(metas, null, 2));
  }
  const out: Candidate[] = [];
  const perQuery = Math.ceil(cap / Math.max(1, queries.length));
  const taken: Record<string, number> = {};
  for (const m of metas) {
    if (out.length >= cap) break;
    if ((taken[m.query] ?? 0) >= perQuery) continue;
    const raw = path.join(dir, `${m.id}.raw`);
    const jpg = path.join(dir, `${m.id}.jpg`);
    if (!existsSync(jpg)) {
      if (!(await downloadTo(m.url, raw))) continue;
      try {
        await sharp(raw).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(jpg);
      } catch { continue; }
    }
    const small = await sharp(jpg).resize({ width: 512, height: 512, fit: "inside" }).jpeg({ quality: 80 }).toBuffer();
    out.push({ file: jpg, small, meta: m });
    taken[m.query] = (taken[m.query] ?? 0) + 1;
  }
  log(slug, `${group}: ${out.length} candidates ready`);
  return out;
}

type Pick = { index: number; reason: string };
type PickResult = { finished: Pick[]; process: Pick[] };

/** ONE Claude vision call per pack: choose 3 finished-product photos (and, for slideshows, up to 7 process photos). */
async function pickPhotos(pack: Pack, finished: Candidate[], process: Candidate[]): Promise<PickResult> {
  const all = [...finished, ...process].slice(0, 30);
  const content: Parameters<typeof structured>[0]["content"] = [
    { type: "text", text: `Product: ${pack.product}.\nSeller's own description: "${pack.hints.product_name}" made of ${pack.hints.materials}.\nBelow are ${all.length} candidate photos numbered 1..${all.length}. Photos 1..${finished.length} came from "finished product" searches${process.length ? `; photos ${finished.length + 1}..${all.length} came from "making process" searches` : ""}.` },
  ];
  all.forEach((c, i) => { content.push({ type: "text", text: `#${i + 1}` }); content.push(imageBlock(c.small)); });
  content.push({ type: "text", text: `Pick EXACTLY 3 photos that best show the finished product as an Etsy listing photo (product clearly visible, in focus, no identifiable faces, no text overlays or watermarks, no visible brand tags / labels / packaging text / documents with legible text, no collages, not a drawing/graphic, not a different kind of object, not a mass-produced/branded product). Prefer variety (hero shot, detail, in-context).${process.length ? " ALSO pick up to 7 photos that show the MAKING process of this kind of product (hands, tools, materials, work in progress) under the same quality rules; order them roughly raw-materials → work → finishing." : " Leave process empty."} Give a short reason per pick. If fewer than 3 acceptable finished photos exist, still return the 3 least-bad ones and say so in the reason.` });
  const { data, usage } = await structured<PickResult>({
    model: PICK_MODEL, toolName: "pick_photos", maxTokens: 2000,
    system: "You are a photo editor for a handmade-goods marketplace. You judge product photos strictly and answer only by calling the tool.",
    content,
    schema: {
      type: "object", required: ["finished", "process"],
      properties: {
        finished: { type: "array", minItems: 3, maxItems: 3, items: { type: "object", required: ["index", "reason"], properties: { index: { type: "integer", minimum: 1, maximum: all.length }, reason: { type: "string" } } } },
        process: { type: "array", maxItems: 7, items: { type: "object", required: ["index", "reason"], properties: { index: { type: "integer", minimum: 1, maximum: all.length }, reason: { type: "string" } } } },
      },
    },
  });
  log(pack.slug, `claude pick: ${usage.model} in=${usage.input_tokens} out=${usage.output_tokens} (~${usage.cost_cents.toFixed(1)}¢)`);
  const uniq = (ps: Pick[]) => ps.filter((p, i, a) => p.index >= 1 && p.index <= all.length && a.findIndex((q) => q.index === p.index) === i);
  const fin = uniq(data.finished).slice(0, 3);
  const finSet = new Set(fin.map((p) => p.index));
  const proc = uniq(data.process).filter((p) => !finSet.has(p.index)).slice(0, 7);
  if (fin.length < 3) throw new Error(`Claude picked only ${fin.length} finished photos`);
  return { finished: fin, process: proc };
}

// ---- ffmpeg -----------------------------------------------------------------------------------
const X264 = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart"];
const SCALE = "scale='trunc(min(1920,iw)/2)*2':-2";

async function encodeSegment(src: string, out: string, o: { start?: number; duration?: number; retime?: boolean }) {
  const args = ["-y", "-hide_banner", "-loglevel", "error"];
  if (o.retime) args.push("-fflags", "+genpts");
  if (o.start && !o.retime) args.push("-ss", String(o.start));
  args.push("-i", src);
  if (o.duration) args.push("-t", String(o.duration));
  args.push("-vf", `${o.retime ? "setpts=N/(30*TB)," : ""}${SCALE}`);
  if (o.retime) args.push("-r", "30");
  args.push(...X264, out);
  await exec(FFMPEG, args, { maxBuffer: 1 << 24 });
}

async function concatParts(parts: string[], out: string) {
  const list = path.join(path.dirname(parts[0]), "concat.txt");   // keep the list in the cache dir, not next to input.mp4
  await writeFile(list, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
  await exec(FFMPEG, ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-vf", SCALE, ...X264, out], { maxBuffer: 1 << 24 });
}

/** 1080p landscape zoompan slideshow: each image fills the frame (cover crop), slow Ken-Burns zoom, ≥60 s total. */
async function slideshow(images: string[], out: string, cacheDir: string) {
  const n = images.length;
  const per = Math.max(6, Math.ceil(62 / n));           // seconds per image → total ≥ 62 s (JPEG sources are full-range; force tv range so the output is plain yuv420p)
  const fps = 25, frames = per * fps;
  const frameDir = path.join(cacheDir, "slides"); await mkdir(frameDir, { recursive: true });
  const inputs: string[] = [];
  const filters: string[] = [];
  for (let i = 0; i < n; i++) {
    const f = path.join(frameDir, `s${i}.jpg`);
    // 2× oversampled cover crop so zoompan has pixels to work with
    await sharp(images[i]).rotate().resize({ width: 3840, height: 2160, fit: "cover", position: "attention" }).jpeg({ quality: 90 }).toFile(f);
    inputs.push("-loop", "1", "-framerate", String(fps), "-t", String(per), "-i", f);
    const zoomIn = i % 2 === 0;
    const z = zoomIn ? `'min(1+0.0012*on,1.18)'` : `'max(1.18-0.0012*on,1)'`;
    filters.push(`[${i}:v]zoompan=z=${z}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=${fps},trim=end_frame=${frames},setpts=PTS-STARTPTS,scale=out_range=tv,format=yuv420p[v${i}]`);
  }
  const concat = `${filters.map((_, i) => `[v${i}]`).join("")}concat=n=${n}:v=1:a=0[out]`;
  await exec(FFMPEG, ["-y", "-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", `${filters.join(";")};${concat}`, "-map", "[out]", "-r", String(fps), ...X264, "-color_range", "tv", out], { maxBuffer: 1 << 24 });
}

async function verifyVideo(file: string) {
  const p = await probe(file);
  const problems: string[] = [];
  if (!(p.duration >= MIN_SEC && p.duration <= MAX_SEC)) problems.push(`duration ${p.duration.toFixed(1)} s not in ${MIN_SEC}–${MAX_SEC}`);
  if (p.codec !== "h264") problems.push(`codec ${p.codec}`);
  if (p.pix_fmt !== "yuv420p") problems.push(`pix_fmt ${p.pix_fmt}`);
  if (p.size > MAX_BYTES) problems.push(`size ${(p.size / 1e6).toFixed(0)} MB > 150 MB`);
  if (Math.max(p.width, p.height) > 1920) problems.push(`${p.width}x${p.height} exceeds 1080p`);
  if (problems.length) throw new Error(`${file}: ${problems.join("; ")}`);
  return p;
}

// ---------------------------------------------------------------------------------------------
// per-pack build
// ---------------------------------------------------------------------------------------------
type Manifest = {
  slug: string; product_name: string; hints: Pack["hints"];
  video: { file: string; duration_s: number; width: number; height: number; bytes: number; kind: string; sources: { title: string; pageUrl: string; author: string; license: string; segment: string }[]; note?: string };
  photos: { file: string; title: string; pageUrl: string; creator: string; license: string; reason: string }[];
  public_urls: Record<string, string>;
};

async function buildPack(pack: Pack, opts: { force: boolean; upload: boolean }): Promise<Manifest> {
  const { slug } = pack;
  const out = path.join(OUT_ROOT, slug);
  const cache = path.join(OUT_ROOT, ".cache", slug);
  await mkdir(out, { recursive: true }); await mkdir(cache, { recursive: true });
  const videoOut = path.join(out, "input.mp4");
  const src: string[] = [];           // SOURCE.md lines
  const manifest: Manifest = { slug, product_name: pack.hints.product_name, hints: pack.hints, video: { file: "input.mp4", duration_s: 0, width: 0, height: 0, bytes: 0, kind: pack.video.kind, sources: [] }, photos: [], public_urls: {} };

  // ---- 1. photos -------------------------------------------------------------------------------
  src.push(`# ${slug} — sources`, "", `Built by \`scripts/build-inputs.ts\` on ${new Date().toISOString().slice(0, 10)}. Every file below is redistributable under the license listed; keep this file next to the media.`, "");
  let processFiles: string[] = [];
  const picksFile = path.join(cache, "picks.json");
  const photosExist = [1, 2, 3].every((i) => existsSync(path.join(out, `photo-${i}.jpg`)));

  if (pack.photos.kind === "example") {
    for (let i = 0; i < 3; i++) {
      const from = path.join(ROOT, pack.photos.dir, pack.photos.files[i]);
      await sharp(from).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(path.join(out, `photo-${i + 1}.jpg`));
      manifest.photos.push({ file: `photo-${i + 1}.jpg`, title: pack.photos.files[i], pageUrl: `${pack.photos.dir}/${pack.photos.files[i]}`, creator: "Launch Kit team", license: "project asset", reason: pack.photos.note });
    }
  } else {
    type SavedPicks = { picks: PickResult; finished: OvImage[]; process: OvImage[]; files: { finished: string[]; process: string[] } };
    let saved: SavedPicks | null = null;
    if (!opts.force && photosExist && existsSync(picksFile)) saved = JSON.parse(await readFile(picksFile, "utf8"));
    if (!saved) {
      const needProcess = pack.video.kind === "slideshow";
      const finished = await gatherCandidates(slug, "finished", pack.photos.queries, needProcess ? 15 : 30, cache);
      const process = needProcess ? await gatherCandidates(slug, "process", (pack.video as { processQueries: string[] }).processQueries, 15, cache) : [];
      if (finished.length < 3) throw new Error(`${slug}: only ${finished.length} finished-photo candidates downloaded`);
      const all = [...finished, ...process];
      const picks = await pickPhotos(pack, finished, process);
      saved = {
        picks,
        finished: picks.finished.map((p) => all[p.index - 1].meta),
        process: picks.process.map((p) => all[p.index - 1].meta),
        files: { finished: picks.finished.map((p) => all[p.index - 1].file), process: picks.process.map((p) => all[p.index - 1].file) },
      };
      await writeFile(picksFile, JSON.stringify(saved, null, 2));
      for (let i = 0; i < 3; i++) await copyFile(saved.files.finished[i], path.join(out, `photo-${i + 1}.jpg`));
    }
    saved.finished.forEach((m, i) => manifest.photos.push({ file: `photo-${i + 1}.jpg`, title: m.title, pageUrl: m.foreign_landing_url, creator: m.creator, license: `${m.license.toUpperCase()} ${m.license_version}`.trim(), reason: saved!.picks.finished[i].reason }));
    processFiles = saved.files.process;
    if (pack.video.kind === "slideshow") {
      src.push("## Slideshow process photos (Openverse)", "");
      saved.process.forEach((m, i) => src.push(`- slide ${i + 1}: "${m.title}" by ${m.creator} — ${m.license.toUpperCase()} ${m.license_version} — ${m.foreign_landing_url} (via Openverse query "${m.query}") — ${saved!.picks.process[i].reason}`));
      src.push("");
    }
  }

  // ---- 2. video --------------------------------------------------------------------------------
  const needVideo = opts.force || !existsSync(videoOut);
  if (pack.video.kind === "commons") {
    const infos = await commonsInfo(pack.video.parts.map((p) => p.title));
    const partFiles: string[] = [];
    for (const [i, part] of pack.video.parts.entries()) {
      const info = infos.get(part.title)!;
      const raw = path.join(cache, `src-${i}${path.extname(new URL(info.url).pathname)}`);
      // The raw source stays in the cache, so the segment description can always be recomputed; only the encode is skipped.
      if (needVideo || !existsSync(raw)) {
        log(slug, `download ${info.title} (${(info.bytes / 1e6).toFixed(1)} MB)`);
        if (!(await downloadTo(info.url, raw, true))) throw new Error(`download failed: ${info.url}`);
      }
      const total = await realDuration(raw);
      const start = part.start ?? 0;
      const duration = part.duration ?? Math.min(MAX_SEC, total - start);
      if (needVideo) {
        const seg = pack.video.parts.length === 1 ? videoOut : path.join(cache, `part-${i}.mp4`);
        log(slug, `encode ${path.basename(raw)} [${start}s +${duration.toFixed(1)}s of ${total.toFixed(1)}s]${pack.video.retime ? " (retimed)" : ""}`);
        await encodeSegment(raw, seg, { start, duration, retime: pack.video.retime });
        partFiles.push(seg);
      }
      manifest.video.sources.push({ title: info.title, pageUrl: info.pageUrl, author: info.author, license: info.license, segment: `${start}s → ${(start + duration).toFixed(0)}s of ${total.toFixed(0)}s (${info.width}×${info.height})` });
    }
    if (needVideo && pack.video.parts.length > 1) await concatParts(partFiles, videoOut);
    src.push("## input.mp4 (Wikimedia Commons)", "");
    for (const s of manifest.video.sources) src.push(`- ${s.title} — ${s.pageUrl}`, `  author: ${s.author} · license: ${s.license} · used: ${s.segment}`);
    src.push(`- re-encoded with ffmpeg: H.264 (libx264 veryfast crf 23), yuv420p, ≤1920 px wide, audio removed, +faststart.`);
    if (pack.video.note) src.push(`- note: ${pack.video.note}`);
  } else {
    if (needVideo) {
      const slides = [...processFiles, ...[1, 2, 3].map((i) => path.join(out, `photo-${i}.jpg`))];
      log(slug, `slideshow from ${processFiles.length} process + 3 finished photos`);
      await slideshow(slides, videoOut, cache);
    }
    src.push("## input.mp4 (FALLBACK: Openverse photo slideshow, not real footage)", "", `- ${pack.video.note}`, "- Slides: the process photos listed above, then photo-1..3. Rendered 1920×1080 H.264 with a slow zoompan (ffmpeg).", "");
  }
  let p: Awaited<ReturnType<typeof verifyVideo>>;
  try { p = await verifyVideo(videoOut); }
  catch (e) { await rm(videoOut, { force: true }); throw e; }   // drop the bad file so the next run re-encodes instead of re-verifying it
  manifest.video.duration_s = Math.round(p.duration * 10) / 10; manifest.video.width = p.width; manifest.video.height = p.height; manifest.video.bytes = p.size;
  log(slug, `input.mp4 OK: ${p.duration.toFixed(1)} s ${p.width}x${p.height} ${p.codec}/${p.pix_fmt} ${(p.size / 1e6).toFixed(1)} MB`);

  // ---- 3. extras, hints, SOURCE.md ------------------------------------------------------------
  for (const x of pack.extraFiles ?? []) {
    await copyFile(path.join(ROOT, x.from), path.join(out, x.to));
    src.push("", `## ${x.to}`, "", `- ${x.note} (${x.from})`);
  }
  src.push("", "## photo-1..3.jpg", "");
  for (const ph of manifest.photos) src.push(`- ${ph.file}: "${ph.title}" by ${ph.creator} — ${ph.license} — ${ph.pageUrl}`, `  why: ${ph.reason}`);
  src.push("", "## hints.json", "", "- Invented, realistic US solo-seller values for testing; not tied to any real shop.", "");
  await writeFile(path.join(out, "hints.json"), JSON.stringify(pack.hints, null, 2) + "\n");
  await writeFile(path.join(out, "SOURCE.md"), src.join("\n") + "\n");

  // ---- 4. upload -------------------------------------------------------------------------------
  const files = ["input.mp4", "photo-1.jpg", "photo-2.jpg", "photo-3.jpg", "hints.json", "SOURCE.md", ...(pack.extraFiles ?? []).map((x) => x.to)];
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/mock/inputs/${slug}`;
  for (const f of files) manifest.public_urls[f] = `${base}/${f}`;
  if (opts.upload) {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    for (const f of files) {
      const body = await readFile(path.join(out, f));
      const contentType = f.endsWith(".mp4") ? "video/mp4" : f.endsWith(".jpg") ? "image/jpeg" : f.endsWith(".json") ? "application/json" : "text/markdown";
      const { error } = await sb.storage.from(BUCKET).upload(`mock/inputs/${slug}/${f}`, body, { contentType, upsert: true });
      if (error) throw new Error(`upload ${slug}/${f}: ${error.message}`);
    }
    log(slug, `uploaded ${files.length} files → ${base}/`);
  }
  return manifest;
}

// ---------------------------------------------------------------------------------------------
async function main() {
  const argv = process.argv.slice(2);
  const onlyIdx = argv.indexOf("--only");
  const only = onlyIdx >= 0 ? new Set((argv[onlyIdx + 1] ?? "").split(",").filter(Boolean)) : null;
  const force = argv.includes("--force");
  const upload = !argv.includes("--no-upload");
  if (only) for (const s of only) if (!PACKS.some((p) => p.slug === s)) { console.error(`unknown slug ${s}; known: ${PACKS.map((p) => p.slug).join(", ")}`); process.exit(2); }
  if (!process.env.ANTHROPIC_API_KEY) console.warn("warn: ANTHROPIC_API_KEY not set — photo picking will fail unless cached");
  if (upload && !process.env.SUPABASE_SERVICE_ROLE_KEY) { console.error("SUPABASE_SERVICE_ROLE_KEY missing (use --no-upload to skip Storage)"); process.exit(2); }

  const manifestFile = path.join(OUT_ROOT, "manifest.json");
  const manifests: Record<string, Manifest> = existsSync(manifestFile) ? JSON.parse(await readFile(manifestFile, "utf8")) : {};
  const failures: string[] = [];
  for (const pack of PACKS) {
    if (only && !only.has(pack.slug)) continue;
    const t0 = Date.now();
    try {
      manifests[pack.slug] = await buildPack(pack, { force, upload });
      log(pack.slug, `done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    } catch (e) {
      failures.push(pack.slug);
      console.error(`[${pack.slug}] FAILED: ${e instanceof Error ? e.message : e}`);
    }
    await writeFile(manifestFile, JSON.stringify(manifests, null, 2) + "\n");
  }
  console.log("\nslug                 dur(s)  size(MB)  res        kind       photos");
  for (const m of Object.values(manifests)) console.log(`${m.slug.padEnd(20)} ${String(m.video.duration_s).padStart(6)}  ${(m.video.bytes / 1e6).toFixed(1).padStart(8)}  ${`${m.video.width}x${m.video.height}`.padEnd(10)} ${m.video.kind.padEnd(10)} ${m.photos.length}`);
  if (failures.length) { console.error(`\nfailed: ${failures.join(", ")}`); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
