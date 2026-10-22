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

async function run(launch: LaunchRow) {
  const started = Date.now();
  const workDir = path.join(WORK_DIR, launch.id);
  console.log(`▶ launch ${launch.id} ${MOCK ? "(mock)" : ""}`);
  try {
    if (MOCK) {
      await runMock(launch);
    } else {
      const analysis = await analyze(launch, workDir);
      const comps = await researchComparables(launch, analysis);
      const listing = await writeListing(launch, analysis, comps);
      // videos and localization don't depend on each other — run together to hit the 5-minute demo window
      const plan = await planVideos(launch, analysis, listing);
      await Promise.all([renderVideos(launch, analysis, plan, workDir), localize(launch, listing, analysis)]);
      await formatForChannels(launch, listing);
    }
    await setStatus(launch.id, "ready", { finished_at: new Date().toISOString(), minutes_saved_est: MINUTES_SAVED });
    console.log(`✓ ready in ${Math.round((Date.now() - started) / 1000)} s`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`✗ launch ${launch.id} failed:`, message);
    await setStatus(launch.id, "failed", { error_message: message, finished_at: new Date().toISOString() });
    // refund the credit
    await db.from("credit_ledger").insert({ seller_id: launch.seller_id, launch_id: launch.id, delta: 1, reason: "refund:failed" });
    await db.rpc("refund_credit", { p_seller: launch.seller_id }).then(() => undefined, () => undefined);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function main() {
  console.log(`Launch Kit worker — ${MOCK ? "MOCK_MODE" : "live"} · polling every 3 s`);
  for (;;) {
    const launch = await claim();
    if (launch) await run(launch);
    else await new Promise((r) => setTimeout(r, 3000));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
