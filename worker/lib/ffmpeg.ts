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

/** 1 fps contact frames, downscaled — the only thing Claude ever sees from a 2 GB video. */
export async function extractFrames(file: string, outDir: string, fps = 1): Promise<{ file: string; sec: number }[]> {
  await mkdir(outDir, { recursive: true });
  await exec(FFMPEG, ["-y", "-i", file, "-vf", `fps=${fps},scale=768:-2`, "-q:v", "3", path.join(outDir, "f_%05d.jpg")]);
  const names = (await readdir(outDir)).filter((n) => n.endsWith(".jpg")).sort();
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
const OUT_W = Number(process.env.RENDER_WIDTH ?? 720), OUT_H = Math.round(OUT_W * 16 / 9);

/**
 * Concatenate cuts into a vertical clip with optional burned-in captions.
 * Each cut is extracted with input seeking (-ss before -i), so only the seconds we keep get decoded —
 * the old single filter graph decoded the whole source once per cut, which took 10+ min for a 2-minute 1080p video on Fly.
 */
export async function renderVertical(video: string, cuts: Cut[], out: string, font = process.env.CAPTION_FONT) {
  if (font && !(await hasDrawtext())) font = undefined;
  const dir = path.dirname(out), base = path.basename(out, path.extname(out));
  const segs: string[] = [];
  for (const [i, c] of cuts.entries()) {
    let vf = `scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=increase,crop=${OUT_W}:${OUT_H}`;
    if (c.caption && font) {
      const text = c.caption.replace(/[\\':]/g, (m) => "\\" + m);
      vf += `,drawtext=fontfile='${font}':text='${text}':fontcolor=white:fontsize=${Math.round(OUT_W / 17)}:borderw=3:bordercolor=black@0.6:x=(w-text_w)/2:y=h*0.78`;
    }
    const seg = path.join(dir, `${base}_${i}.mp4`);
    await exec(FFMPEG, ["-y", "-ss", String(c.in), "-t", String(Math.max(0.5, c.out - c.in)), "-i", video, "-vf", vf, "-r", "30",
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "24", "-pix_fmt", "yuv420p", "-an", seg], { maxBuffer: 64 * 1024 * 1024 });
    segs.push(seg);
  }
  const list = path.join(dir, `${base}_concat.txt`);
  await writeFile(list, segs.map((s) => `file '${path.resolve(s).replace(/'/g, "'\\''")}'`).join("\n")); // concat resolves relative paths against the list file, so use absolute
  // identical codec/size/fps → stream copy, no second encode
  await exec(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", out], { maxBuffer: 64 * 1024 * 1024 });
  await Promise.all([...segs, list].map((f) => rm(f, { force: true })));
  return readFile(out);
}
