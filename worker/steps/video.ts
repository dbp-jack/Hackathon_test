import path from "node:path";
import { access } from "node:fs/promises";
import { db, upload, logAction, setStatus } from "../lib/db";
import { structured, WRITER_MODEL } from "../lib/claude";
import { renderVertical, type Cut } from "../lib/ffmpeg";
import type { LaunchRow, VideoPlatform } from "../../src/lib/types";
import type { Analysis } from "./analyze";
import type { Listing } from "./write";

export type VideoPlan = {
  videos: { kind: "listing" | "short"; platform: VideoPlatform; hook_text: string | null; hook_rationale: string | null; cuts: Cut[] }[];
};

/**
 * Steps 7–8: write_hooks → cut_points → ffmpeg render.
 * Claude decides WHAT to show (hooks, cut list, captions) from the scene timeline; ffmpeg only cuts.
 */
export async function planVideos(launch: LaunchRow, a: Analysis, listing: Listing): Promise<VideoPlan> {
  const t0 = new Date();
  if (!a.videoFile) {
    // photos-only upload: there is nothing to cut, so don't invent hooks for clips that can't exist
    await logAction(launch.id, "write_hooks", "no making-of video uploaded — skipped the 4 clips (add a video next time to get them)", { started_at: t0 });
    return { videos: [] };
  }
  const { data, usage } = await structured<VideoPlan>({
    model: WRITER_MODEL, toolName: "plan_videos", maxTokens: 4000,
    system: `You are a short-form editor for handmade sellers. From a scene timeline you plan four vertical videos:
1) listing (etsy): 12–15 s, 3 cuts, no captions — wheel/glaze/finished rhythm.
2) short (tiktok): 20–30 s. Hook style: time compression ("3 hours at the wheel. 30 seconds.").
3) short (reels): 18–25 s. Hook style: cost/what-goes-in ("What goes into one $42 mug"), captions name materials and hours.
4) short (shorts): 15–20 s. Hook style: no talking / ASMR — one caption max.
Rules: each cut 2–6 s, cuts must lie inside real scenes (use the given seconds), the last cut always shows the finished product, hooks ≤ 50 chars, captions ≤ 40 chars, plain words.`,
    content: `Scenes (seconds): ${JSON.stringify(a.scenes)}
Video duration: ${a.duration.toFixed(0)} s. Product: ${a.attributes.product_title}, price $${(listing.price_cents / 100).toFixed(0)}, production hours ${a.attributes.production_hours ?? "unknown"}, materials ${a.attributes.materials.join(", ")}.
Call plan_videos once with all four videos.`,
    schema: {
      type: "object", required: ["videos"],
      properties: { videos: { type: "array", minItems: 4, maxItems: 4, items: { type: "object", required: ["kind", "platform", "hook_text", "hook_rationale", "cuts"], properties: {
        kind: { type: "string", enum: ["listing", "short"] }, platform: { type: "string", enum: ["etsy", "tiktok", "reels", "shorts"] },
        hook_text: { type: ["string", "null"], maxLength: 50 }, hook_rationale: { type: ["string", "null"] },
        cuts: { type: "array", minItems: 1, maxItems: 10, items: { type: "object", required: ["in", "out", "caption"], properties: { in: { type: "number" }, out: { type: "number" }, caption: { type: ["string", "null"], maxLength: 40 } } } },
      } } } },
    },
  });
  // clamp cuts to the real duration
  for (const v of data.videos) v.cuts = v.cuts.map((c) => ({ ...c, in: Math.max(0, Math.min(c.in, a.duration - 1)), out: Math.max(0.5, Math.min(c.out, a.duration)) })).filter((c) => c.out > c.in);
  await logAction(launch.id, "write_hooks", `wrote 3 hooks: ${data.videos.filter((v) => v.hook_text).map((v) => `“${v.hook_text}”`).join(", ")}`, { ...usage, started_at: t0 });
  return data;
}

export async function renderVideos(launch: LaunchRow, a: Analysis, plan: VideoPlan, workDir: string) {
  const t0 = new Date();
  await setStatus(launch.id, "rendering");
  if (!plan.videos.length) {
    await logAction(launch.id, "cut_points", "no video to cut — 0 clips", { metrics: { videos: 0 }, started_at: t0 });
    return;
  }
  // captions need a real .ttf; if CAPTION_FONT is unset or missing, render without them instead of failing every video
  let font: string | undefined = process.env.CAPTION_FONT || undefined;
  if (font) await access(font).catch(() => { console.warn(`CAPTION_FONT not found at ${font}; rendering without captions`); font = undefined; });
  else console.warn("CAPTION_FONT unset; rendering without captions");
  let order = 0;
  for (const v of plan.videos) {
    const dur = v.cuts.reduce((s, c) => s + (c.out - c.in), 0);
    const { data: row } = await db.from("videos").insert({ launch_id: launch.id, kind: v.kind, platform: v.platform, hook_text: v.hook_text, hook_rationale: v.hook_rationale, cut_points: v.cuts, duration_sec: dur, aspect: "9:16", has_captions: !!font && v.cuts.some((c) => c.caption), sort_order: order++ }).select("id").single();
    if (!a.videoFile || !row) continue;
    try {
      const out = path.join(workDir, `${v.platform}.mp4`);
      const buf = await renderVertical(a.videoFile, v.cuts, out, font);
      const storagePath = await upload(`${launch.seller_id}/${launch.id}/videos/${v.platform}.mp4`, buf, "video/mp4");
      await db.from("videos").update({ storage_path: storagePath }).eq("id", row.id);
    } catch (e) {
      console.error(`render ${v.platform} failed`, e);
    }
  }
  await logAction(launch.id, "cut_points", `cut ${plan.videos.length} videos with ${plan.videos.filter((v) => v.hook_text).length} hooks`, { metrics: { videos: plan.videos.length }, started_at: t0 });
}
