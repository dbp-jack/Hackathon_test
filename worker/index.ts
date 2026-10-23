/**
 * Launch Kit pipeline worker.
 *   pnpm worker          — real pipeline (Claude + ffmpeg)
 *   MOCK_MODE=true pnpm worker — demo data, no keys needed
 *
 * Loop: claim one `uploaded` launch (SQL function, SKIP LOCKED) → run steps → mark ready.
 * Each step writes a claude_actions row, which the result screen streams over SSE.
 */
import "dotenv/config";
import path from "node:path";
import { rm } from "node:fs/promises";
import { db, setStatus } from "./lib/db";
import { analyze } from "./steps/analyze";
import { researchComparables, writeListing } from "./steps/write";
import { planVideos, renderVideos } from "./steps/video";
import { localize, formatForChannels } from "./steps/localize";
import { runMock } from "./steps/mock";
import { processPublications } from "./steps/publish";
import type { LaunchRow } from "../src/lib/types";

const MOCK = process.env.MOCK_MODE === "true";
const WORK_DIR = process.env.WORK_DIR ?? ".work";
const MINUTES_SAVED = 45 + 30 + 20 + 60 + 15 + 20 + 10; // matches OUTPUTS in src/lib/types.ts

async function claim(): Promise<LaunchRow | null> {
  const { data, error } = await db.rpc("claim_next_launch");
  if (error) { console.error("claim failed", error.message); return null; }
  const row = Array.isArray(data) ? data[0] : data;
  return row?.id ? (row as LaunchRow) : null;
}

/** Runs one phase and tags any error with the step name, so the failure log says *where* it died. */
async function phase<T>(step: string, fn: () => Promise<T>): Promise<T> {
  try { return await fn(); }
  catch (e) { const err = e instanceof Error ? e : new Error(String(e)); (err as Error & { step?: string }).step ??= step; throw err; }
}

async function run(launch: LaunchRow) {
  const started = Date.now();
  const workDir = path.join(WORK_DIR, launch.id);
  console.log(`▶ launch ${launch.id} ${MOCK ? "(mock)" : ""}`);
  try {
    if (MOCK) {
      await phase("mock", () => runMock(launch));
    } else {
      const analysis = await phase("analyze", () => analyze(launch, workDir));
      const comps = await phase("research_comparables", () => researchComparables(launch, analysis));
      const listing = await phase("write_listing", () => writeListing(launch, analysis, comps));
      // videos and localization don't depend on each other — run together to hit the 5-minute demo window
      const plan = await phase("plan_videos", () => planVideos(launch, analysis, listing));
      await Promise.all([phase("render_videos", () => renderVideos(launch, analysis, plan, workDir)), phase("localize", () => localize(launch, listing, analysis))]);
      await phase("format_for_channel", () => formatForChannels(launch, listing));
    }
    await setStatus(launch.id, "ready", { finished_at: new Date().toISOString(), minutes_saved_est: MINUTES_SAVED });
    console.log(`✓ ready in ${Math.round((Date.now() - started) / 1000)} s`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const step = (e as { step?: string } | null)?.step ?? "unknown";
    console.error(`✗ launch ${launch.id} failed at step "${step}" after ${Math.round((Date.now() - started) / 1000)} s:`, message);
    await setStatus(launch.id, "failed", { error_message: `${step}: ${message}`, finished_at: new Date().toISOString() }).catch((err) => console.error("could not mark failed", err));
    // refund the credit
    await db.from("credit_ledger").insert({ seller_id: launch.seller_id, launch_id: launch.id, delta: 1, reason: "refund:failed" });
    await db.rpc("refund_credit", { p_seller: launch.seller_id }).then(() => undefined, () => undefined);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

// graceful shutdown: finish the launch in flight, then exit at the top of the loop
let stopping = false;
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    if (stopping) { console.log("forcing exit"); process.exit(130); }
    stopping = true;
    console.log(`${sig} received — finishing current launch, then exiting (press again to force)`);
  });
}

async function main() {
  console.log(`Launch Kit worker — ${MOCK ? "MOCK_MODE" : "live"} · polling every 3 s`);
  while (!stopping) {
    const launch = await claim();
    if (launch) { await run(launch); continue; }
    await processPublications(); // idle: drain queued Shopify/TikTok publications
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.log("worker stopped");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
