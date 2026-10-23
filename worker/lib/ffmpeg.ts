import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const exec = promisify(execFile);
const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";
const FFPROBE = FFMPEG.replace(/ffmpeg$/, "ffprobe");

export async function probe(file: string): Promise<{ duration: number; fps: number; width: number; height: number }> {
  const { stdout } = await exec(FFPROBE, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate,width,height:format=duration", "-of", "json", file]);
  const j = JSON.parse(stdout);
  const [n, d] = String(j.streams[0].r_frame_rate).split("/").map(Number);
  return { duration: Number(j.format.duration), fps: n / (d || 1), width: j.streams[0].width, height: j.streams[0].height };
}

const MIN_KEYFRAMES = Number(process.env.MIN_KEYFRAMES ?? 24);

/**
 * Contact frames, downscaled — the only thing Claude ever sees from a 2 GB video.
 * Fast path: decode keyframes only (phone footage usually has one per second), ~50× cheaper than a full decode —
 * on Fly's shared vCPU a full 1 fps pass over a 2-minute 1080p clip took 5 minutes. Falls back to 1 fps when a clip
 * has long GOPs and yields too few keyframes to pick 5 roles from.
 */
export async function extractFrames(file: string, outDir: string, fps = 1): Promise<{ file: string; sec: number }[]> {
  await mkdir(outDir, { recursive: true });
  const { stdout } = await exec(FFPROBE, ["-v", "error", "-skip_frame", "nokey", "-select_streams", "v:0", "-show_entries", "frame=pts_time", "-of", "csv=p=0", file], { maxBuffer: 16 * 1024 * 1024 });
  const keyTimes = stdout.split("\n").map((s) => Number(s.trim().replace(/,$/, ""))).filter((n) => Number.isFinite(n));
  if (keyTimes.length >= MIN_KEYFRAMES) {
    await exec(FFMPEG, ["-y", "-skip_frame", "nokey", "-i", file, "-fps_mode", "vfr", "-vf", "scale=768:-2", "-q:v", "3", path.join(outDir, "k_%05d.jpg")]);
    const names = (await readdir(outDir)).filter((n) => n.startsWith("k_")).sort();
    console.log(`frames: ${names.length} keyframes (fast path)`);
    return names.map((n, i) => ({ file: path.join(outDir, n), sec: keyTimes[i] ?? i }));
  }
  console.log(`frames: only ${keyTimes.length} keyframes — full ${fps} fps decode`);
  await exec(FFMPEG, ["-y", "-i", file, "-vf", `fps=${fps},scale=768:-2`, "-q:v", "3", path.join(outDir, "f_%05d.jpg")]);
  const names = (await readdir(outDir)).filter((n) => n.startsWith("f_")).sort();
  return names.map((n, i) => ({ file: path.join(outDir, n), sec: i / fps }));
}

/** Variance of Laplacian on a small grayscale copy: blurry frames score low. Cheap pre-filter before Claude. */
export async function sharpness(file: string): Promise<number> {
  const { data, info } = await sharp(file).resize(256).grayscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  let sum = 0, sq = 0, n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const lap = 4 * data[i] - data[i - 1] - data[i + 1] - data[i - w] - data[i + w];
    sum += lap; sq += lap * lap; n++;
  }
  const mean = sum / n;
  return sq / n - mean * mean;
}

export async function fullResFrame(video: string, sec: number, out: string) {
  await exec(FFMPEG, ["-y", "-ss", String(sec), "-i", video, "-frames:v", "1", "-q:v", "2", out]);
  return readFile(out);
}

export type Cut = { in: number; out: number; caption: string | null };

let drawtextOk: boolean | null = null;
/** Some ffmpeg builds (e.g. Homebrew's default) ship without the drawtext filter; check once. */
export async function hasDrawtext(): Promise<boolean> {
  if (drawtextOk == null) {
    try { const { stdout } = await exec(FFMPEG, ["-hide_banner", "-filters"]); drawtextOk = /\bdrawtext\b/.test(stdout); }
    catch { drawtextOk = false; }
    if (!drawtextOk) console.warn("ffmpeg: no drawtext filter in this build — rendering videos without captions");
  }
  return drawtextOk;
}

// Output size for shorts. 720×1280 is plenty for TikTok/Reels previews and renders ~3× faster than 1080p on a shared vCPU.
export const OUT_W = Number(process.env.RENDER_WIDTH ?? 720), OUT_H = Math.round(OUT_W * 16 / 9);
const XFADE_SEC = 0.35; // cross-fade between cuts; the clip gets 0.35 s shorter per transition
const HOOK_SEC = 3; // the hook card stays up for the first 3 s
const GRADE = "eq=contrast=1.06:saturation=1.12,vignette=PI/5"; // cheap warm-up for phone footage

/**
 * Cut the source into a vertical clip: one pre-rendered segment per cut (input seeking, so only the seconds we keep get decoded —
 * a single filter graph decoded the whole source once per cut, 10+ min for a 2-minute 1080p video on Fly), then an xfade chain joins them.
 * Captions and the hook are burned in as white cards (see captionFilter); `hook` shows for the first 3 s.
 */
export async function renderVertical(video: string, cuts: Cut[], out: string, font = process.env.CAPTION_FONT, hook?: string | null) {
  if (font && !(await hasDrawtext())) font = undefined;
  const dir = path.dirname(out), base = path.basename(out, path.extname(out));
  const fps = 30, segs: { file: string; frames: number }[] = [];
  const hookVf = hook && font ? captionFilter(hook, font, { y: "h*0.14", enable: `lt(t,${HOOK_SEC})` }) : "";
  for (const [i, c] of cuts.entries()) {
    const sec = Math.max(0.5, c.out - c.in), frames = Math.round(sec * fps);
    // fps + tpad(clone) + trim pin every segment to exactly `frames` frames, so the xfade offsets below line up even when the source ends early
    let vf = `fps=${fps},scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=increase,crop=${OUT_W}:${OUT_H},${GRADE},tpad=stop_mode=clone:stop_duration=${sec},trim=end_frame=${frames},setpts=PTS-STARTPTS,setsar=1`;
    if (c.caption && font) vf += captionFilter(c.caption, font, { y: "h*0.74" });
    if (cuts.length === 1) vf += hookVf; // no join pass, so the hook goes on the only segment
    const seg = path.join(dir, `${base}_${i}.mp4`);
    await exec(FFMPEG, ["-y", "-ss", String(c.in), "-t", String(sec + 0.5), "-i", video, "-vf", vf, "-r", String(fps),
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "22", "-pix_fmt", "yuv420p", "-an", seg], { maxBuffer: 64 * 1024 * 1024 });
    segs.push({ file: seg, frames });
  }
  return joinSegments(segs, fps, out, hookVf);
}

/** Splits a caption longer than ~24 chars onto two balanced lines (at the space nearest the middle), so cards never run off a 720-wide frame. */
export function wrapCaption(text: string, max = 24): string[] {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max || !t.includes(" ")) return [t];
  const mid = t.length / 2;
  let best = -1;
  for (let i = t.indexOf(" "); i >= 0; i = t.indexOf(" ", i + 1)) if (best < 0 || Math.abs(i - mid) < Math.abs(best - mid)) best = i;
  return [t.slice(0, best), t.slice(best + 1)];
}

/**
 * Burned-in caption as white cards with bold dark text (like the example shorts): drawtext box + boxborderw, one card per line
 * stacked and centered — Debian's ffmpeg 5.1 has no text_align, so a single multi-line drawtext would be left-aligned inside its box.
 * Text goes through two parsers (filtergraph → drawtext options), so we quote the value and escape the option-level specials.
 * Returns a filter string prefixed with "," so callers can append it to a chain.
 */
export function captionFilter(caption: string, font: string, opts: { y: string; enable?: string }) {
  const size = Math.round(OUT_W / 16), pitch = Math.round(size * 1.2) + 36; // line height + the 18 px box border top and bottom
  const enable = opts.enable ? `:enable='${opts.enable}'` : "";
  return wrapCaption(caption).map((line, i) => {
    const text = line
      .replace(/\\/g, "") // backslashes would start escapes at both levels
      .replace(/'/g, "\u2019") // a quote can't live inside the quoted value; the typographic one renders the same
      .replace(/[:%]/g, (m) => "\\" + m);
    return `,drawtext=fontfile='${font}':text='${text}':fontcolor=0x1A1A1A:fontsize=${size}` +
      `:box=1:boxcolor=white@0.92:boxborderw=18:x=(w-text_w)/2:y=${opts.y}${i ? `+${i * pitch}` : ""}${enable}`;
  }).join("");
}

/**
 * Join pre-rendered segments. Two or more: an xfade chain (fade, 0.35 s) with one re-encode; `finalVf` (the hook card) is applied here
 * so it can span the first cuts. One segment: concat demuxer with stream copy (the segment already has everything burned in).
 * Removes the segments afterwards.
 */
async function joinSegments(segs: { file: string; frames: number }[], fps: number, out: string, finalVf = "") {
  if (segs.length === 1) return concatSegments(segs.map((s) => s.file), out);
  const inputs = segs.flatMap((s) => ["-i", s.file]);
  const parts: string[] = [];
  let prev = "[0:v]", elapsed = segs[0].frames / fps;
  for (let i = 1; i < segs.length; i++) {
    const label = i === segs.length - 1 ? "[xf]" : `[x${i}]`;
    parts.push(`${prev}[${i}:v]xfade=transition=fade:duration=${XFADE_SEC}:offset=${(elapsed - XFADE_SEC).toFixed(3)}${label}`);
    elapsed += segs[i].frames / fps - XFADE_SEC;
    prev = label;
  }
  parts.push(`[xf]format=yuv420p${finalVf}[v]`);
  await exec(FFMPEG, ["-y", ...inputs, "-filter_complex", parts.join(";"), "-map", "[v]", "-r", String(fps),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out], { maxBuffer: 64 * 1024 * 1024 });
  await Promise.all(segs.map((s) => rm(s.file, { force: true })));
  return readFile(out);
}

/** concat demuxer with stream copy — segments share codec/size/fps, so no second encode. Removes the segments afterwards. */
async function concatSegments(segs: string[], out: string) {
  const dir = path.dirname(out), base = path.basename(out, path.extname(out));
  const list = path.join(dir, `${base}_concat.txt`);
  await writeFile(list, segs.map((s) => `file '${path.resolve(s).replace(/'/g, "'\\''")}'`).join("\n")); // concat resolves relative paths against the list file, so use absolute
  await exec(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", out], { maxBuffer: 64 * 1024 * 1024 });
  await Promise.all([...segs, list].map((f) => rm(f, { force: true })));
  return readFile(out);
}

const SLIDE_SEC = 3; // virtual timeline for photos-only plans: photo i spans [i*3, i*3+3)

/**
 * Photos-only fallback for renderVertical: a Ken-Burns slideshow at the same size/fps/codec, joined with the same xfades.
 * Each cut picks the photo at floor(in/3) (cycling when fewer than 5 were selected) and holds it 2–6 s with a zoom of 1.0↔1.15
 * over the segment's real length plus a slow horizontal drift that alternates direction — enough motion that no frame reads as frozen.
 */
export async function renderSlideshow(photos: string[], cuts: Cut[], out: string, font = process.env.CAPTION_FONT, hook?: string | null) {
  if (!photos.length) throw new Error("no photos for slideshow");
  if (font && !(await hasDrawtext())) font = undefined;
  const dir = path.dirname(out), base = path.basename(out, path.extname(out));
  // 24 fps and a 1.5× oversample: a 3× oversample at 30 fps took ~3 min per clip on Fly's shared vCPU (9× the pixels)
  const fps = 24, OS = 1.5, segs: { file: string; frames: number }[] = [];
  const osW = Math.round(OUT_W * OS / 2) * 2, osH = Math.round(OUT_H * OS / 2) * 2;
  const hookVf = hook && font ? captionFilter(hook, font, { y: "h*0.14", enable: `lt(t,${HOOK_SEC})` }) : "";
  for (const [i, c] of cuts.entries()) {
    const photo = photos[Math.max(0, Math.floor(c.in / SLIDE_SEC)) % photos.length];
    const sec = Math.max(2, Math.min(6, c.out - c.in)), frames = Math.round(sec * fps);
    // zoompan runs once per looped input frame (d=1), so `in` is the segment's frame index: zoom and pan are linear in it
    const p = `(in/${frames})`;
    const zoom = i % 2 === 0 ? `1+0.15*${p}` : `1.15-0.15*${p}`;
    const drift = (i % 4 < 2 ? 1 : -1) * 0.5; // use half the room the zoom frees up, alternating left/right — ≈ ±4% of the width
    const x = i % 2 === 0 ? `(iw-iw/zoom)/2*(1+${drift}*${p})` : `(iw-iw/zoom)/2*(1+${drift}*(1-${p}))`;
    let vf = `scale=${osW}:${osH}:force_original_aspect_ratio=increase,crop=${osW}:${osH},zoompan=z='${zoom}':d=1:x='${x}':y='(ih-ih/zoom)/2':s=${OUT_W}x${OUT_H}:fps=${fps},trim=end_frame=${frames},setpts=PTS-STARTPTS,setsar=1`;
    if (c.caption && font) vf += captionFilter(c.caption, font, { y: "h*0.74" });
    if (cuts.length === 1) vf += hookVf;
    const seg = path.join(dir, `${base}_${i}.mp4`);
    await exec(FFMPEG, ["-y", "-loop", "1", "-framerate", String(fps), "-t", String(sec), "-i", photo, "-vf", vf, "-r", String(fps),
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "22", "-pix_fmt", "yuv420p", "-an", seg], { maxBuffer: 64 * 1024 * 1024 });
    segs.push({ file: seg, frames });
  }
  return joinSegments(segs, fps, out, hookVf);
}
