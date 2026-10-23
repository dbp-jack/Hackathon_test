import { db, logAction } from "../lib/db";
import { structured, WRITER_MODEL, VISION_MODEL } from "../lib/claude";
import type { LaunchRow } from "../../src/lib/types";
import type { Analysis } from "./analyze";

export type Comparables = { count: number; low_cents: number; high_cents: number; median_cents: number; common_tags: string[]; notes: string };
export type Listing = { title: string; tags: string[]; description: string; price_cents: number; price_reasoning: string; cost_basis_cents: number };

/** Step 4: research_comparables — Claude with web search reads the market before writing. */
export async function researchComparables(launch: LaunchRow, a: Analysis): Promise<Comparables> {
  const t0 = new Date();
  try {
    return await researchLive(launch, a, t0);
  } catch (e) {
    // never fail the launch over market research — fall back to a conservative estimate around the seller's price idea
    console.error("research_comparables failed, using estimate:", e instanceof Error ? e.message : e);
    const mid = launch.price_hint_cents ?? 4500;
    const est: Comparables = {
      count: 0, low_cents: Math.max(500, Math.round(mid * 0.7)), high_cents: Math.round(mid * 1.4), median_cents: mid,
      common_tags: [a.attributes.category, ...a.attributes.materials, "handmade", "gift for her", "housewarming gift"].filter(Boolean).map((t) => t.toLowerCase()).slice(0, 15),
      notes: "estimated, search unavailable",
    };
    await logAction(launch.id, "research_comparables", `estimated the price range (search unavailable)`, { metrics: { low_cents: est.low_cents, high_cents: est.high_cents, median_cents: est.median_cents, estimated: true }, started_at: t0 });
    return est;
  }
}

async function researchLive(launch: LaunchRow, a: Analysis, t0: Date): Promise<Comparables> {
  const { data, usage } = await structured<Comparables>({
    model: VISION_MODEL, toolName: "report_comparables", webSearch: true, maxTokens: 3000, // Sonnet: research is retrieval-heavy, not prose-heavy; ~2× faster and 1/2 the cost of Opus here
    system: "You research Etsy pricing for a handmade seller. Search Etsy and similar marketplaces for comparable handmade listings, then report what you found. Prices in US cents. If search fails, estimate from your knowledge and say so in notes.",
    content: `Product: ${a.attributes.product_title} (${a.attributes.category}). Materials: ${a.attributes.materials.join(", ")}. Dimensions: ${JSON.stringify(a.attributes.dimensions)}.
Seller's price idea: ${launch.price_hint_cents ? `$${(launch.price_hint_cents / 100).toFixed(2)}` : "none"}.
Find ~40 comparable handmade listings on Etsy (US sellers). Report the price range (low/high/median in cents), how many you looked at, and the 15 most common tags/keywords they use. Then call report_comparables.`,
    schema: {
      type: "object", required: ["count", "low_cents", "high_cents", "median_cents", "common_tags", "notes"],
      properties: { count: { type: "integer" }, low_cents: { type: "integer" }, high_cents: { type: "integer" }, median_cents: { type: "integer" }, common_tags: { type: "array", items: { type: "string" } }, notes: { type: "string" } },
    },
  });
  await logAction(launch.id, "research_comparables", `read ${data.count} comparable listings for price and tags`, { metrics: { low_cents: data.low_cents, high_cents: data.high_cents, median_cents: data.median_cents }, ...usage, started_at: t0 });
  return data;
}

/** Steps 5–6: write_listing + price — the words that actually sell the thing. */
export async function writeListing(launch: LaunchRow, a: Analysis, comps: Comparables): Promise<Listing> {
  const t0 = new Date();
  const { data: seller } = await db.from("sellers").select("ships_from_city, ships_from_country").eq("id", launch.seller_id).single();
  const { data, usage } = await structured<Listing>({
    model: WRITER_MODEL, toolName: "write_listing", maxTokens: 4000,
    system: `You write Etsy listings for solo handmade sellers. Rules that Etsy search rewards:
- Title ≤140 chars, front-load the exact product noun, separate 3–5 phrases with " | ", include one gift angle and one feature (e.g. Microwave Safe). No ALL CAPS, no emoji.
- Exactly 13 tags, each ≤20 chars, multi-word long-tail phrases, no repeats of the same word more than 3 times across tags, all lowercase.
- Description 180–260 words, first person, plain sentences. Paragraph 1: what it is and how it feels to use. Paragraph 2: materials, exact dimensions, care. Paragraph 3: made-to-order / lead time / ships from. Paragraph 4: a one-line note that each piece varies. No hype words (stunning, amazing, perfect).
- Price: pick a point inside the comparable range that reflects the production hours; explain in two sentences. Cost basis = materials estimate + production_hours × $12/h.`,
    content: `Product: ${JSON.stringify(a.attributes)}
Scenes seen in the maker's video: ${a.scenes.map((s) => `${s.label} (${s.what_happens})`).join("; ")}
Seller hints: product="${launch.product_name_hint ?? ""}", materials="${launch.materials_hint ?? ""}", price idea=${launch.price_hint_cents ?? "none"} cents.
Ships from: ${seller?.ships_from_city ?? "the United States"}.
Comparables: ${JSON.stringify(comps)}
Call write_listing once.`,
    schema: {
      type: "object", required: ["title", "tags", "description", "price_cents", "price_reasoning", "cost_basis_cents"],
      properties: { title: { type: "string", maxLength: 140 }, tags: { type: "array", items: { type: "string", maxLength: 20 }, minItems: 13, maxItems: 13 }, description: { type: "string" }, price_cents: { type: "integer" }, price_reasoning: { type: "string" }, cost_basis_cents: { type: "integer" } },
    },
  });
  const listing = { ...data, title: data.title.slice(0, 140), tags: data.tags.slice(0, 13).map((t) => t.toLowerCase().slice(0, 20)) };
  await db.from("listings").upsert({
    launch_id: launch.id, title: listing.title, tags: listing.tags, description: listing.description,
    price_cents: listing.price_cents, currency: "USD", price_low_cents: comps.low_cents, price_high_cents: comps.high_cents,
    cost_basis_cents: listing.cost_basis_cents, comparables_read: comps.count, price_reasoning: listing.price_reasoning,
  });
  const words = listing.description.split(/\s+/).length;
  await logAction(launch.id, "write_listing", `wrote the title, 13 tags and a ${words}-word description`, { metrics: { words, title_chars: listing.title.length }, ...usage, started_at: t0 });
  await logAction(launch.id, "price", `priced it at $${(listing.price_cents / 100).toFixed(2)} against ${comps.count} comparables`, { metrics: { price_cents: listing.price_cents } });
  return listing;
}
