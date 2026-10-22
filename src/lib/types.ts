// Shared types — mirror supabase/migrations/0001_init.sql and launch-kit-api.md

export type LaunchStatus =
  | "uploaded" | "analyzing" | "writing" | "rendering" | "ready" | "published" | "failed";
export type Channel = "etsy" | "shopify" | "tiktok" | "pinterest" | "instagram" | "youtube";
export type FrameRole = "hero" | "in_hand" | "detail" | "process" | "scale" | "alt";
export type VideoKind = "listing" | "short";
export type VideoPlatform = "etsy" | "tiktok" | "reels" | "shorts";
export type SocialKind = "pinterest_pin" | "instagram_carousel";
export type PublishStatus = "draft" | "queued" | "published" | "exported_csv" | "failed";
export type ClaudeStep =
  | "watch_footage" | "score_frames" | "extract_attributes" | "research_comparables"
  | "write_listing" | "price" | "write_hooks" | "cut_points" | "localize" | "format_for_channel";

export const PIPELINE_STEPS: { step: ClaudeStep; pct: number }[] = [
  { step: "watch_footage", pct: 10 },
  { step: "score_frames", pct: 30 },
  { step: "extract_attributes", pct: 35 },
  { step: "research_comparables", pct: 45 },
  { step: "write_listing", pct: 55 },
  { step: "price", pct: 60 },
  { step: "write_hooks", pct: 70 },
  { step: "cut_points", pct: 85 },
  { step: "localize", pct: 95 },
  { step: "format_for_channel", pct: 100 },
];

export interface Money { cents: number; currency: string }

export interface SourceMediaRow {
  id: string; launch_id: string; kind: "video" | "photo"; storage_path: string;
  original_name: string | null; duration_sec: number | null; fps: number | null;
  frame_count: number | null; width_px: number | null; height_px: number | null;
}

export interface FrameRow {
  id: string; launch_id: string; source_id: string | null; role: FrameRole;
  timecode_sec: number | null; score: number | null; score_reason: string | null;
  storage_path_raw: string; storage_path_clean: string | null; sort_order: number; selected: boolean;
}

export interface ListingRow {
  launch_id: string; title: string; tags: string[]; description: string; description_words: number;
  price_cents: number; currency: string; price_low_cents: number | null; price_high_cents: number | null;
  cost_basis_cents: number | null; comparables_read: number | null; price_reasoning: string | null;
}

export interface LocalizationRow {
  id: string; launch_id: string; market: string; locale: string; title: string; tags: string[];
  description: string; price_cents: number; currency: string; fx_rate: number | null;
  shipping_cents_included: number | null; enabled: boolean;
}

export interface CutPoint { in: number; out: number; caption: string | null }

export interface VideoRow {
  id: string; launch_id: string; kind: VideoKind; platform: VideoPlatform; hook_text: string | null;
  hook_rationale: string | null; cut_points: CutPoint[]; duration_sec: number | null; aspect: string;
  has_captions: boolean; storage_path: string | null; sort_order: number;
}

export interface SocialAssetRow {
  id: string; launch_id: string; kind: SocialKind; title: string | null; caption: string | null;
  frame_ids: string[]; storage_paths: string[] | null; sort_order: number;
}

export interface PublicationRow {
  id: string; launch_id: string; channel: Channel; status: PublishStatus; external_id: string | null;
  external_url: string | null; csv_storage_path: string | null; error_message: string | null; published_at: string | null;
}

export interface ClaudeActionRow {
  id: number; launch_id: string; step: ClaudeStep; summary: string; metrics: Record<string, unknown> | null;
  model: string | null; input_tokens: number | null; output_tokens: number | null; cost_cents: number | null;
  started_at: string; finished_at: string | null;
}

export interface LaunchRow {
  id: string; seller_id: string; status: LaunchStatus; product_name_hint: string | null;
  materials_hint: string | null; price_hint_cents: number | null; target_channels: Channel[];
  product_title: string | null; started_at: string | null; finished_at: string | null;
  build_seconds: number | null; minutes_saved_est: number | null; credits_used: number;
  error_message: string | null; created_at: string;
}

/** GET /launches/{id}/kit — the whole result screen in one object */
export interface Kit {
  id: string;
  status: LaunchStatus;
  product_title: string | null;
  build_seconds: number | null;
  minutes_saved_est: number | null;
  progress: { step: ClaudeStep | null; pct: number };
  sources: { name: string | null; kind: "video" | "photo"; duration_sec: number | null; frame_count: number | null }[];
  listing: (Omit<ListingRow, "price_cents" | "currency" | "price_low_cents" | "price_high_cents"> & {
    title_chars: number;
    price: Money & { comparables: { low_cents: number | null; high_cents: number | null; count: number | null }; cost_basis_cents: number | null; reasoning: string | null };
  }) | null;
  frames: (FrameRow & { label: string; url_raw: string; url_clean: string | null })[];
  videos: (VideoRow & { url: string | null })[];
  social: (SocialAssetRow & { urls: string[] })[];
  localizations: (LocalizationRow & { price: Money })[];
  publications: PublicationRow[];
  what_claude_did: { step: ClaudeStep; summary: string }[];
}

export const PLANS = [
  { tier: "free", name: "Free", price_cents: 0, launches_per_month: 2, features: ["watermark"] },
  { tier: "maker", name: "Maker", price_cents: 1900, launches_per_month: 15, features: [] },
  { tier: "studio", name: "Studio", price_cents: 4900, launches_per_month: null, features: ["auto_publish", "localization", "analytics"] },
] as const;

export const OUTPUTS = [
  { key: "listing", name: "Etsy listing", detail: "Title, 13 tags, description, price", minutes: 45, color: "butter" },
  { key: "photos", name: "5 photos", detail: "Picked from your footage", minutes: 30, color: "blue" },
  { key: "shorts", name: "3 shorts", detail: "TikTok, Reels, Shorts — three different hooks", minutes: 60, color: "ink" },
  { key: "markets", name: "4 markets", detail: "UK, DE, AU, CA — translated and priced", minutes: 20, color: "mint" },
  { key: "publish", name: "Published", detail: "Shopify, TikTok, Pinterest", minutes: 10, color: "blush" },
] as const;

export function fmtMoney(m: Money): string {
  const symbols: Record<string, string> = { USD: "$", GBP: "£", EUR: "€", AUD: "A$", CAD: "C$" };
  const s = symbols[m.currency] ?? m.currency + " ";
  return `${s}${(m.cents / 100).toFixed(2)}`;
}

export function fmtTimecode(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function fmtDuration(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return m ? `${m} min ${s} s` : `${s} s`;
}
