// Helpers shared by worker/steps/mock.ts (runtime, reads MOCK_KITS) and src/lib/demoKit.ts (build-time JSON import)
// for the hackathon mock dataset described in mock/types.ts. Pure functions only — no fs, no Supabase.
import type { MockKit } from "../../mock/types";
import type { ClaudeStep } from "@/lib/types";

export const DEFAULT_KITS_PATH = "mock/kits.json";
export const SAMPLE_KITS_PATH = "mock/kits.sample.json";

/** Storage prefix of the seeded per-product assets (scripts/seed-mock.ts). */
export const mockPrefix = (slug: string) => `mock/${slug}`;

/** Roles in the order the result screen shows them; one pick each plus two runners-up. */
export const FRAME_ROLES = ["hero", "in_hand", "detail", "process", "scale"] as const;
export const ALT_SUFFIXES = ["_alt1", "_alt2"] as const;

/** The knit kit also exists as real files under public/example/knit — used as the no-Storage fallback. */
export const KNIT_SLUG = "knit-cable-scarf";
export const KNIT_PUBLIC_FILES: Record<(typeof FRAME_ROLES)[number], string> = {
  hero: "photo-hero.jpg", detail: "photo-cables.jpg", in_hand: "photo-closeup.jpg", process: "photo-progress.jpg", scale: "photo-yarn.jpg",
};
export const KNIT_PUBLIC_VIDEOS: Record<MockKit["videos"][number]["platform"], string> = {
  etsy: "input.mp4", tiktok: "short-tiktok.mp4", reels: "short-reels.mp4", shorts: "short-shorts.mp4",
};

/** Case-insensitive match of a seller hint against slug words, product_title and category. */
export function matchKit(kits: MockKit[], hint: string | null | undefined): MockKit | undefined {
  const h = (hint ?? "").trim().toLowerCase();
  if (!h) return undefined;
  const words = h.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  return kits.find((k) => {
    const hay = [k.slug.replace(/-/g, " "), k.product_title, k.category].join(" | ").toLowerCase();
    if (hay.includes(h)) return true;
    const slugWords = k.slug.split("-");
    return words.some((w) => slugWords.includes(w) || hay.split(/[^a-z0-9]+/).includes(w));
  });
}

/** Hint match first; otherwise rotate by the seller's launch count so consecutive demo runs differ. */
export function pickKit(kits: MockKit[], hint: string | null | undefined, rotation: number): MockKit {
  if (!kits.length) throw new Error("mock kits file is empty");
  return matchKit(kits, hint) ?? kits[((rotation % kits.length) + kits.length) % kits.length];
}

export const findKit = (kits: MockKit[], slug: string) => kits.find((k) => k.slug === slug);

/** The 10 claude_actions in pipeline order, taken from kit.what_claude_did (unknown step names dropped). */
export function kitActions(kit: MockKit): { step: ClaudeStep; summary: string }[] {
  const order: ClaudeStep[] = ["watch_footage", "score_frames", "extract_attributes", "research_comparables", "write_listing", "price", "write_hooks", "cut_points", "localize", "format_for_channel"];
  const byStep = new Map(kit.what_claude_did.map((a) => [a.step, a.summary]));
  return order.map((step) => ({ step, summary: byStep.get(step) ?? step.replace(/_/g, " ") }));
}

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
export const frameCount = (kit: MockKit) => Math.round(kit.source.duration_sec * kit.source.fps);
/** Implied FX rate for a localization (local price / USD price), rounded to 4 dp. */
export const fxRate = (kit: MockKit, loc: MockKit["localizations"][number]) =>
  Math.round((loc.price_cents / kit.listing.price_cents) * 10000) / 10000;
