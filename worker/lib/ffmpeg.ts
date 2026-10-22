import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readdir, readFile } from "node:fs/promises";
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

/** Concatenate cuts into a 1080×1920 vertical clip with optional burned-in captions. */
export async function renderVertical(video: string, cuts: Cut[], out: string, font = process.env.CAPTION_FONT) {
  const parts: string[] = [];
  const concat: string[] = [];
  cuts.forEach((c, i) => {
    let chain = `[0:v]trim=start=${c.in}:end=${c.out},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`;
    if (c.caption && font) {
      const text = c.caption.replace(/[\\':]/g, (m) => "\\" + m);
      chain += `,drawtext=fontfile='${font}':text='${text}':fontcolor=white:fontsize=64:borderw=4:bordercolor=black@0.6:x=(w-text_w)/2:y=h*0.78`;
    }
    parts.push(`${chain}[v${i}]`);
    concat.push(`[v${i}]`);
  });
  const filter = `${parts.join(";")};${concat.join("")}concat=n=${cuts.length}:v=1:a=0[out]`;
  await exec(FFMPEG, ["-y", "-i", video, "-filter_complex", filter, "-map", "[out]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out], { maxBuffer: 64 * 1024 * 1024 });
  return readFile(out);
}
