import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { db, BUCKET, download, upload, logAction, setStatus } from "../lib/db";
import { structured, imageBlock, VISION_MODEL } from "../lib/claude";
import { probe, extractFrames, sharpness, fullResFrame } from "../lib/ffmpeg";
import type { LaunchRow, SourceMediaRow, FrameRole } from "../../src/lib/types";

export type Scene = { label: string; start_sec: number; end_sec: number; what_happens: string };
export type Attributes = {
  product_title: string; category: string; materials: string[]; colors: string[];
  dimensions: Record<string, number | string>; care: string[]; production_hours: number | null;
  made_to_order: boolean; lead_time_days_min: number | null; lead_time_days_max: number | null;
};
export type Analysis = { scenes: Scene[]; attributes: Attributes; videoFile: string | null; duration: number };

const ROLES: FrameRole[] = ["hero", "in_hand", "detail", "process", "scale"];

/**
 * Step 1–3: watch_footage → score_frames → extract_attributes.
 * ffmpeg samples 1 fps, a Laplacian pre-filter drops blurry frames, and Claude sees ~60 frames max.
 */
export async function analyze(launch: LaunchRow, workDir: string): Promise<Analysis> {
  const { data: media } = await db.from("source_media").select("*").eq("launch_id", launch.id);
  const sources = (media ?? []) as SourceMediaRow[];
  const video = sources.find((s) => s.kind === "video");
  const photos = sources.filter((s) => s.kind === "photo");
  await mkdir(workDir, { recursive: true });

  // ── watch_footage
  let t0 = new Date();
  let videoFile: string | null = null;
  let candidates: { file: string; sec: number | null; source_id: string; sharp: number }[] = [];
  let duration = 0;

  if (video) {
    videoFile = path.join(workDir, "source" + path.extname(video.storage_path));
    await writeFile(videoFile, await download(video.storage_path));
    const info = await probe(videoFile);
    duration = info.duration;
    await db.from("source_media").update({ duration_sec: info.duration, fps: info.fps, frame_count: Math.round(info.duration * info.fps), width_px: info.width, height_px: info.height }).eq("id", video.id);

    const frames = await extractFrames(videoFile, path.join(workDir, "frames"), 1);
    const scored = await Promise.all(frames.map(async (f) => ({ ...f, sharp: await sharpness(f.file), source_id: video.id })));
    const threshold = percentile(scored.map((s) => s.sharp), 0.4);
    const sharpEnough = scored.filter((s) => s.sharp >= threshold);
    // spread ~60 picks evenly across the timeline so every scene is represented
    const stride = Math.max(1, Math.floor(sharpEnough.length / 60));
    candidates = sharpEnough.filter((_, i) => i % stride === 0).slice(0, 60);

    await logAction(launch.id, "watch_footage", `watched ${fmtDur(info.duration)} of footage`, {
      metrics: { duration_sec: info.duration, frames_sampled: frames.length, frames_after_blur_filter: sharpEnough.length, frames_sent_to_claude: candidates.length }, started_at: t0,
    });
  }
  for (const p of photos) {
    const file = path.join(workDir, `photo_${p.id}.jpg`);
    await writeFile(file, await download(p.storage_path));
    candidates.push({ file, sec: null, source_id: p.id, sharp: Number.MAX_SAFE_INTEGER });
  }
  if (!candidates.length) throw new Error("No usable frames or photos");

  // ── score_frames + extract_attributes (one vision call does both)
  t0 = new Date();
  const content = [
    { type: "text" as const, text: buildPrompt(launch, candidates.map((c, i) => `#${i}${c.sec != null ? ` @${c.sec.toFixed(0)}s` : " (uploaded photo)"}`)) },
    ...(await Promise.all(candidates.map(async (c) => imageBlock(await (await import("sharp")).default(c.file).resize(512).jpeg({ quality: 70 }).toBuffer())))),
  ];
  const { data, usage } = await structured<{
    scenes: Scene[]; attributes: Attributes;
    picks: { role: FrameRole; frame_index: number; score: number; reason: string; runners_up: number[] }[];
  }>({
    model: VISION_MODEL, toolName: "report_analysis", maxTokens: 6000,
    system: "You are the eye of a product launch tool for handmade sellers. You watch a maker's phone footage and decide which frames will sell the product, and what the product actually is. Be concrete and conservative: only state attributes you can see or that the seller told you.",
    content,
    schema: {
      type: "object", required: ["scenes", "attributes", "picks"],
      properties: {
        scenes: { type: "array", items: { type: "object", required: ["label", "start_sec", "end_sec", "what_happens"], properties: { label: { type: "string" }, start_sec: { type: "number" }, end_sec: { type: "number" }, what_happens: { type: "string" } } } },
        attributes: { type: "object", required: ["product_title", "category", "materials", "colors", "dimensions", "care", "production_hours", "made_to_order", "lead_time_days_min", "lead_time_days_max"],
          properties: { product_title: { type: "string", description: "Plain product name, e.g. 'Hand-thrown Speckled Stoneware Mug'" }, category: { type: "string" }, materials: { type: "array", items: { type: "string" } }, colors: { type: "array", items: { type: "string" } }, dimensions: { type: "object", additionalProperties: true }, care: { type: "array", items: { type: "string" } }, production_hours: { type: ["number", "null"] }, made_to_order: { type: "boolean" }, lead_time_days_min: { type: ["integer", "null"] }, lead_time_days_max: { type: ["integer", "null"] } } },
        picks: { type: "array", description: "Exactly one pick per role in: hero, in_hand, detail, process, scale. Use uploaded photos for 'scale' when present.", items: { type: "object", required: ["role", "frame_index", "score", "reason", "runners_up"], properties: { role: { type: "string", enum: ROLES }, frame_index: { type: "integer" }, score: { type: "number", minimum: 0, maximum: 1 }, reason: { type: "string" }, runners_up: { type: "array", items: { type: "integer" }, maxItems: 3 } } } },
      },
    },
  });

  // Persist frames: selected picks at full resolution, runners-up at contact size (for Swap)
  const framesDir = path.join(workDir, "picked");
  await mkdir(framesDir, { recursive: true });
  let order = 0;
  for (const pick of data.picks) {
    const c = candidates[pick.frame_index];
    if (!c) continue;
    const buf = c.sec != null && videoFile ? await fullResFrame(videoFile, c.sec, path.join(framesDir, `${pick.role}.jpg`)) : await (await import("node:fs/promises")).readFile(c.file);
    const storagePath = await upload(`${launch.seller_id}/${launch.id}/frames/${pick.role}.jpg`, buf, "image/jpeg");
    await db.from("frames").insert({ launch_id: launch.id, source_id: c.source_id, role: pick.role, timecode_sec: c.sec, score: pick.score, score_reason: pick.reason, storage_path_raw: storagePath, sort_order: order++, selected: true });
    for (const ri of pick.runners_up ?? []) {
      const r = candidates[ri]; if (!r) continue;
      const rbuf = await (await import("node:fs/promises")).readFile(r.file);
      const rpath = await upload(`${launch.seller_id}/${launch.id}/frames/${pick.role}_alt_${ri}.jpg`, rbuf, "image/jpeg");
      await db.from("frames").insert({ launch_id: launch.id, source_id: r.source_id, role: pick.role, timecode_sec: r.sec, score: Math.max(0, pick.score - 0.08), score_reason: "runner-up", storage_path_raw: rpath, sort_order: 99, selected: false });
    }
  }
  const totalFrames = video ? Math.round(duration * ((await probe(videoFile!)).fps)) : candidates.length;
  await logAction(launch.id, "score_frames", `scored ${totalFrames.toLocaleString()} frames, kept ${data.picks.length}`, { metrics: { frames_scored: totalFrames, frames_kept: data.picks.length }, ...usage, started_at: t0 });

  await db.from("product_attributes").upsert({ launch_id: launch.id, category: data.attributes.category, materials: data.attributes.materials, colors: data.attributes.colors, dimensions: data.attributes.dimensions, care: data.attributes.care, production_hours: data.attributes.production_hours, made_to_order: data.attributes.made_to_order, lead_time_days_min: data.attributes.lead_time_days_min, lead_time_days_max: data.attributes.lead_time_days_max, raw: data });
  await db.from("launches").update({ product_title: data.attributes.product_title }).eq("id", launch.id);
  await logAction(launch.id, "extract_attributes", `identified a ${data.attributes.category.toLowerCase()} — ${data.attributes.materials.slice(0, 2).join(", ")}`, { metrics: { scenes: data.scenes.length } });
  await setStatus(launch.id, "writing");

  return { scenes: data.scenes, attributes: data.attributes, videoFile, duration };
}

function buildPrompt(launch: LaunchRow, labels: string[]) {
  return `Below are ${labels.length} frames sampled from a maker's video (and any uploaded photos), in timeline order: ${labels.join(", ")}.
Seller hints (may be empty): product="${launch.product_name_hint ?? ""}", materials="${launch.materials_hint ?? ""}".

1) Describe the scenes of the making process with start/end seconds.
2) Extract the product attributes you can actually see.
3) Pick ONE frame per role — hero (finished product, clean, sellable), in_hand (held, shows scale and use), detail (texture/glaze/stitching close-up), process (the hands making it — proof it is handmade), scale (next to something familiar; prefer uploaded photos). Score 0–1 for how well it would sell on Etsy, and give up to 3 runner-up frame indexes per role.
Call report_analysis once with everything.`;
}

function percentile(xs: number[], p: number) { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length * p)] ?? 0; }
export function fmtDur(sec: number) { const m = Math.floor(sec / 60), s = Math.round(sec % 60); return m ? `${m} min ${s} s` : `${s} s`; }
export { BUCKET };
