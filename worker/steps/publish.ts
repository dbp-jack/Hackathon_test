import { randomBytes } from "node:crypto";
import { db, BUCKET } from "../lib/db";
import type { Channel, FrameRow, ListingRow, PublicationRow, SocialAssetRow, VideoRow } from "../../src/lib/types";

/** Channel-formatted body stored in publications.payload — backs the "format_for_channel" claim. */
type ChannelPayload = {
  title: string; description: string; price: string; currency: string; tags: string[];
  image_urls: string[]; video_url: string | null; video_ids: string[]; vendor: string | null; product_type: string | null; mock?: boolean;
};
type Result = { external_id: string; external_url: string; mock: boolean };

const API_VERSION = "2025-07";
const BATCH = 5;
const MOCK_DELAY_MS = 1500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const shortId = () => randomBytes(4).toString("hex");
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "listing";
const publicUrl = (path: string) => db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Build the channel payload from listing + selected frames + chosen video (first requested id, else first rendered). */
async function buildPayload(pub: PublicationRow & { payload: { video_ids?: string[] } | null }): Promise<ChannelPayload> {
  const [{ data: listing }, { data: frames }, { data: videos }, { data: social }, { data: attrs }, { data: launch }] = await Promise.all([
    db.from("listings").select("*").eq("launch_id", pub.launch_id).maybeSingle(),
    db.from("frames").select("*").eq("launch_id", pub.launch_id).eq("selected", true).order("sort_order"),
    db.from("videos").select("*").eq("launch_id", pub.launch_id).order("sort_order"),
    db.from("social_assets").select("*").eq("launch_id", pub.launch_id).order("sort_order"),
    db.from("product_attributes").select("category").eq("launch_id", pub.launch_id).maybeSingle(),
    db.from("launches").select("seller_id").eq("id", pub.launch_id).maybeSingle(),
  ]);
  if (!listing) throw new Error("listing missing — kit not ready");
  const l = listing as ListingRow;
  const { data: seller } = launch ? await db.from("sellers").select("shop_name").eq("id", launch.seller_id).maybeSingle() : { data: null };

  const wanted = pub.payload?.video_ids ?? [];
  const vids = (videos ?? []) as VideoRow[];
  const video = vids.find((v) => wanted.includes(v.id) && v.storage_path) ?? vids.find((v) => v.storage_path) ?? null;
  const frameRows = (frames ?? []) as FrameRow[];
  const images = frameRows.map((f) => publicUrl(f.storage_path_clean ?? f.storage_path_raw));

  // Social channels prefer the pin / carousel copy written in format_for_channel.
  const socials = (social ?? []) as SocialAssetRow[];
  const pin = socials.find((s) => s.kind === "pinterest_pin");
  const carousel = socials.find((s) => s.kind === "instagram_carousel");
  const base: ChannelPayload = {
    title: l.title, description: l.description, price: (l.price_cents / 100).toFixed(2), currency: l.currency, tags: l.tags,
    image_urls: images, video_url: video?.storage_path ? publicUrl(video.storage_path) : null, video_ids: video ? [video.id] : [],
    vendor: seller?.shop_name ?? null, product_type: attrs?.category ?? null,
  };
  switch (pub.channel) {
    case "pinterest": return { ...base, title: pin?.title ?? l.title, description: pin?.caption ?? l.description.split(/\n\s*\n/)[0], image_urls: images.slice(0, 1) };
    case "instagram": return { ...base, description: carousel?.caption ?? l.description.split(/\n\s*\n/)[0], image_urls: images.slice(0, 5) };
    case "tiktok": case "youtube": return { ...base, description: video?.hook_text ?? l.description.split(/\n\s*\n/)[0], image_urls: images.slice(0, 1) };
    default: return base;
  }
}

/** Live Shopify connector — Admin REST, one product with all selected frames as images. */
async function publishShopify(p: ChannelPayload, domain: string, token: string): Promise<Result> {
  const body_html = p.description.split(/\n\s*\n/).map((para) => `<p>${escapeHtml(para.trim())}</p>`).join("\n");
  const res = await fetch(`https://${domain}/admin/api/${API_VERSION}/products.json`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ product: {
      title: p.title, body_html, vendor: p.vendor ?? undefined, product_type: p.product_type ?? undefined, tags: p.tags.join(", "),
      status: "active", variants: [{ price: p.price, inventory_management: null }], images: p.image_urls.map((src) => ({ src })),
    } }),
  });
  if (!res.ok) throw new Error(`shopify ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const { product } = (await res.json()) as { product: { id: number; handle: string } };
  return { external_id: String(product.id), external_url: `https://${domain}/products/${product.handle}`, mock: false };
}

/** Mock connectors — realistic URLs after a short delay, so the demo shows the "published" transition. */
async function publishMock(channel: Channel, p: ChannelPayload): Promise<Result> {
  await sleep(MOCK_DELAY_MS);
  const id = shortId(), numeric = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const url: Record<Exclude<Channel, "etsy">, string> = {
    shopify: `https://demo-store.myshopify.com/products/${slug(p.title)}`,
    tiktok: `https://www.tiktok.com/@launchkit/video/${numeric}`,
    pinterest: `https://www.pinterest.com/pin/${numeric}/`,
    instagram: `https://www.instagram.com/p/${id}${shortId().slice(0, 3)}/`,
    youtube: `https://www.youtube.com/shorts/${id}${shortId().slice(0, 3)}`,
  };
  if (channel === "etsy") throw new Error("Use /export/etsy.csv");
  return { external_id: `mock-${id}`, external_url: url[channel], mock: true };
}

async function publishOne(pub: PublicationRow & { payload: { video_ids?: string[] } | null }) {
  const t0 = Date.now();
  try {
    if (pub.channel === "etsy") throw new Error("Use /export/etsy.csv");
    const payload = await buildPayload(pub);
    await db.from("publications").update({ payload: { ...pub.payload, ...payload } }).eq("id", pub.id);

    const domain = process.env.SHOPIFY_STORE_DOMAIN, token = process.env.SHOPIFY_ADMIN_TOKEN;
    const r = pub.channel === "shopify" && domain && token ? await publishShopify(payload, domain, token) : await publishMock(pub.channel, payload);
    await db.from("publications").update({
      status: "published", external_id: r.external_id, external_url: r.external_url, error_message: null,
      published_at: new Date().toISOString(), payload: { ...pub.payload, ...payload, mock: r.mock },
    }).eq("id", pub.id);
    await db.from("launches").update({ status: "published" }).eq("id", pub.launch_id);
    console.log(`↗ published ${pub.channel}${r.mock ? " (mock)" : ""} for launch ${pub.launch_id} → ${r.external_url} in ${Math.round((Date.now() - t0) / 1000)} s`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.from("publications").update({ status: "failed", error_message: message }).eq("id", pub.id);
    console.error(`✗ publish ${pub.channel} for launch ${pub.launch_id} failed: ${message}`);
  }
}

/** Drain queued publications (called by the worker loop when no launch is claimed). Never throws. */
export async function processPublications(): Promise<void> {
  try {
    const { data, error } = await db.from("publications").select("*").eq("status", "queued").limit(BATCH);
    if (error) { console.error("publications poll failed", error.message); return; }
    for (const pub of (data ?? []) as (PublicationRow & { payload: { video_ids?: string[] } | null })[]) await publishOne(pub);
  } catch (e) {
    console.error("processPublications:", e instanceof Error ? e.message : String(e));
  }
}
