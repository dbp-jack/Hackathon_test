import { db, logAction, upload, download } from "../lib/db";
import { renderPin, renderCarousel } from "../lib/cards";
import { structured, WRITER_MODEL } from "../lib/claude";
import type { LaunchRow } from "../../src/lib/types";
import type { Listing } from "./write";
import type { Analysis } from "./analyze";

const MARKETS: Record<string, { locale: string; currency: string; language: string; shipping_cents: number }> = {
  GB: { locale: "en-GB", currency: "GBP", language: "British English", shipping_cents: 1800 },
  DE: { locale: "de-DE", currency: "EUR", language: "German", shipping_cents: 2200 },
  AU: { locale: "en-AU", currency: "AUD", language: "Australian English", shipping_cents: 2600 },
  CA: { locale: "fr-CA", currency: "CAD", language: "Canadian French", shipping_cents: 1500 },
};

async function fxRates(): Promise<Record<string, number>> {
  try {
    const r = await fetch("https://api.frankfurter.app/latest?from=USD&to=GBP,EUR,AUD,CAD");
    return (await r.json()).rates;
  } catch { return { GBP: 0.79, EUR: 0.92, AUD: 1.52, CAD: 1.36 }; }
}

/** Step 9: localize — one Claude call translates and adapts tone for every requested market; frankfurter supplies FX. */
export async function localize(launch: LaunchRow, listing: Listing, a: Analysis) {
  const t0 = new Date();
  try {
    await localizeLive(launch, listing, a, t0);
  } catch (e) {
    // optional output — never fail the launch over it
    console.error("localize failed, skipping:", e instanceof Error ? e.message : e);
    await logAction(launch.id, "localize", "skipped localization (translation unavailable)", { metrics: { skipped: true }, started_at: t0 }).catch(() => undefined);
  }
}

async function localizeLive(launch: LaunchRow, listing: Listing, a: Analysis, t0: Date) {
  const { data: req } = await db.from("launch_markets").select("market").eq("launch_id", launch.id);
  const markets = (req ?? []).map((m) => m.market).filter((m) => MARKETS[m]);
  if (!markets.length) return;
  const rates = await fxRates();

  const { data, usage } = await structured<{ versions: { market: string; title: string; tags: string[]; description: string }[] }>({
    model: WRITER_MODEL, toolName: "localize_listing", maxTokens: 6000,
    system: "You localize Etsy listings for handmade sellers. Translate meaning, not words: adapt units (cm/ml where the market uses them), spelling, idiom, and gift occasions. Keep the title ≤140 chars and exactly 13 lowercase tags in the target language. Keep paragraph structure.",
    content: `Original listing (US): ${JSON.stringify({ title: listing.title, tags: listing.tags, description: listing.description })}
Dimensions (inches/oz): ${JSON.stringify(a.attributes.dimensions)}
Markets: ${markets.map((m) => `${m} → ${MARKETS[m].language} (${MARKETS[m].locale})`).join("; ")}
Call localize_listing once with one version per market.`,
    schema: {
      type: "object", required: ["versions"],
      properties: { versions: { type: "array", items: { type: "object", required: ["market", "title", "tags", "description"], properties: { market: { type: "string" }, title: { type: "string", maxLength: 140 }, tags: { type: "array", items: { type: "string" }, minItems: 13, maxItems: 13 }, description: { type: "string" } } } } },
    },
  });

  for (const v of data.versions) {
    const m = MARKETS[v.market]; if (!m) continue;
    const rate = rates[m.currency] ?? 1;
    const base = Math.round((listing.price_cents + m.shipping_cents) * rate);
    const price = Math.round(base / 50) * 50; // round to the nearest 50 cents
    await db.from("listing_localizations").upsert({
      launch_id: launch.id, market: v.market, locale: m.locale, title: v.title.slice(0, 140), tags: v.tags.slice(0, 13), description: v.description,
      price_cents: price, currency: m.currency, fx_rate: rate, shipping_cents_included: m.shipping_cents, enabled: true,
    }, { onConflict: "launch_id,market,locale" });
  }
  const words = listing.description.split(/\s+/).length * (data.versions.length + 1);
  await logAction(launch.id, "localize", `wrote about ${words.toLocaleString()} words in ${data.versions.length + 1} languages`, { metrics: { markets: data.versions.map((v) => v.market) }, ...usage, started_at: t0 });
}

/** Step 10: format_for_channel — pin title, carousel order, draft publication rows. */
export async function formatForChannels(launch: LaunchRow, listing: Listing) {
  const t0 = new Date();
  try {
    await formatLive(launch, listing, t0);
  } catch (e) {
    console.error("format_for_channel failed, skipping:", e instanceof Error ? e.message : e);
    await logAction(launch.id, "format_for_channel", "skipped social copy (unavailable)", { metrics: { skipped: true }, started_at: t0 }).catch(() => undefined);
  }
}

async function formatLive(launch: LaunchRow, listing: Listing, t0: Date) {
  const { data: frames } = await db.from("frames").select("id, role, storage_path_raw").eq("launch_id", launch.id).eq("selected", true).order("sort_order");
  const ids = (frames ?? []).map((f) => f.id);
  const hero = (frames ?? []).find((f) => f.role === "hero") ?? (frames ?? [])[0];

  const { data, usage } = await structured<{ pin_title: string; pin_caption: string; carousel_caption: string }>({
    model: WRITER_MODEL, toolName: "social_copy", maxTokens: 800,
    system: "You write Pinterest and Instagram copy for handmade sellers. Pinterest title ≤60 chars, evocative but concrete, no hashtags. Instagram caption ≤150 chars + 5 hashtags.",
    content: `Listing title: ${listing.title}\nFirst paragraph: ${listing.description.split(/\n\s*\n/)[0]}\nCall social_copy once.`,
    schema: { type: "object", required: ["pin_title", "pin_caption", "carousel_caption"], properties: { pin_title: { type: "string", maxLength: 60 }, pin_caption: { type: "string" }, carousel_caption: { type: "string" } } },
  });

  const { data: rows } = await db.from("social_assets").insert([
    { launch_id: launch.id, kind: "pinterest_pin", title: data.pin_title, caption: data.pin_caption, frame_ids: hero ? [hero.id] : [], sort_order: 0 },
    { launch_id: launch.id, kind: "instagram_carousel", title: null, caption: data.carousel_caption, frame_ids: ids.slice(0, 5), sort_order: 1 },
  ]).select("id, kind");
  await db.from("publications").upsert(
    (launch.target_channels ?? []).map((channel) => ({ launch_id: launch.id, channel, status: "draft" as const })),
    { onConflict: "launch_id,channel" },
  );

  // design the actual images — optional, so a sharp/storage hiccup never fails the launch
  let designed = "";
  try {
    const n = await renderSocialImages(launch, listing, data.pin_title, hero ? [hero, ...(frames ?? []).filter((f) => f.id !== hero.id)] : [], rows ?? []);
    if (n) designed = `, designed the pin and a ${n}-slide carousel`;
  } catch (e) {
    console.error("social images failed, leaving the copy only:", e instanceof Error ? e.message : e);
  }
  await logAction(launch.id, "format_for_channel", `formatted for ${(launch.target_channels ?? []).length} channels, wrote the pin${designed}`, { ...usage, started_at: t0 });
}

/**
 * Pin (1000×1500) + carousel (≤5 × 1080×1080) from the selected frames, uploaded under `${seller}/${launch}/social/`
 * and linked from the social_assets rows. Returns the number of carousel slides, or 0 when there was nothing to draw.
 */
async function renderSocialImages(launch: LaunchRow, listing: Listing, pinTitle: string, frames: { id: string; storage_path_raw: string }[], rows: { id: string; kind: string }[]) {
  const ordered = frames.filter((f) => f.storage_path_raw).slice(0, 5);
  if (!ordered.length) return 0;
  const [{ data: seller }, { data: attrs }, { data: videos }] = await Promise.all([
    db.from("sellers").select("shop_name, ships_from_city").eq("id", launch.seller_id).maybeSingle(),
    db.from("product_attributes").select("colors").eq("launch_id", launch.id).maybeSingle(),
    db.from("videos").select("cut_points").eq("launch_id", launch.id).order("sort_order"),
  ]);
  const photos = await Promise.all(ordered.map((f) => download(f.storage_path_raw)));
  // one-liners for the middle slides: the shorts' captions first, then listing sentences
  const fromVideos = (videos ?? []).flatMap((v) => ((v.cut_points ?? []) as { caption: string | null }[]).map((c) => c.caption)).filter((c): c is string => !!c);
  const fromListing = listing.description.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 12 && s.length <= 60);
  const captions = [...new Set([...fromVideos, ...fromListing])];
  const opts = {
    photos, title: listing.title, priceCents: listing.price_cents, currency: "USD", shopName: seller?.shop_name ?? null, city: seller?.ships_from_city ?? null,
    colors: (attrs?.colors as string[] | null) ?? [], captions,
  };
  const base = `${launch.seller_id}/${launch.id}/social`;
  const [pin, slides] = await Promise.all([renderPin({ ...opts, title: pinTitle || listing.title }), renderCarousel(opts)]);
  const pinPath = await upload(`${base}/pin.jpg`, pin, "image/jpeg");
  const slidePaths = await Promise.all(slides.map((s, i) => upload(`${base}/carousel-${i + 1}.jpg`, s, "image/jpeg")));
  const pinRow = rows.find((r) => r.kind === "pinterest_pin"), carRow = rows.find((r) => r.kind === "instagram_carousel");
  if (pinRow) await db.from("social_assets").update({ storage_paths: [pinPath] }).eq("id", pinRow.id);
  if (carRow) await db.from("social_assets").update({ storage_paths: slidePaths }).eq("id", carRow.id);
  return slides.length;
}
