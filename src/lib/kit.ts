import { supabaseAdmin, publicUrl } from "@/lib/supabase/admin";
import {
  type Kit, type LaunchRow, type SourceMediaRow, type ListingRow, type FrameRow, type VideoRow,
  type SocialAssetRow, type LocalizationRow, type PublicationRow, type ClaudeActionRow,
  PIPELINE_STEPS, fmtTimecode,
} from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  hero: "Hero", in_hand: "In hand", detail: "Detail", process: "On the wheel", scale: "Scale", alt: "Alt",
};

export async function getLaunch(id: string, sellerId: string): Promise<LaunchRow | null> {
  const { data } = await supabaseAdmin().from("launches").select("*").eq("id", id).eq("seller_id", sellerId).maybeSingle();
  return (data as LaunchRow | null) ?? null;
}

/** Everything the result screen needs, in one object (mirrors launch_kit_view). */
export async function buildKit(launch: LaunchRow): Promise<Kit> {
  const db = supabaseAdmin();
  const id = launch.id;
  const [sources, listing, frames, videos, social, locs, pubs, actions] = await Promise.all([
    db.from("source_media").select("*").eq("launch_id", id),
    db.from("listings").select("*").eq("launch_id", id).maybeSingle(),
    db.from("frames").select("*").eq("launch_id", id).eq("selected", true).order("sort_order"),
    db.from("videos").select("*").eq("launch_id", id).order("sort_order"),
    db.from("social_assets").select("*").eq("launch_id", id).order("sort_order"),
    db.from("listing_localizations").select("*").eq("launch_id", id).eq("enabled", true).order("market"),
    db.from("publications").select("*").eq("launch_id", id).order("channel"),
    db.from("claude_actions").select("*").eq("launch_id", id).order("started_at"),
  ]);

  const acts = (actions.data ?? []) as ClaudeActionRow[];
  const last = acts.at(-1);
  const pct = launch.status === "ready" || launch.status === "published" ? 100
    : last ? (PIPELINE_STEPS.find((s) => s.step === last.step)?.pct ?? 0) : 0;

  const li = listing.data as ListingRow | null;

  return {
    id,
    status: launch.status,
    product_title: launch.product_title,
    build_seconds: launch.build_seconds,
    minutes_saved_est: launch.minutes_saved_est,
    progress: { step: last?.step ?? null, pct },
    sources: ((sources.data ?? []) as SourceMediaRow[]).map((s) => ({
      name: s.original_name, kind: s.kind, duration_sec: s.duration_sec, frame_count: s.frame_count,
    })),
    listing: li ? {
      launch_id: li.launch_id, title: li.title, tags: li.tags, description: li.description,
      description_words: li.description_words, cost_basis_cents: li.cost_basis_cents,
      comparables_read: li.comparables_read, price_reasoning: li.price_reasoning,
      title_chars: li.title.length,
      price: {
        cents: li.price_cents, currency: li.currency,
        comparables: { low_cents: li.price_low_cents, high_cents: li.price_high_cents, count: li.comparables_read },
        cost_basis_cents: li.cost_basis_cents, reasoning: li.price_reasoning,
      },
    } : null,
    frames: ((frames.data ?? []) as FrameRow[]).map((f) => ({
      ...f,
      label: `${ROLE_LABEL[f.role] ?? f.role}${f.timecode_sec != null ? ` · ${fmtTimecode(f.timecode_sec)}` : ""}`,
      url_raw: publicUrl(f.storage_path_raw)!,
      url_clean: publicUrl(f.storage_path_clean),
    })),
    videos: ((videos.data ?? []) as VideoRow[]).map((v) => ({ ...v, url: publicUrl(v.storage_path) })),
    social: ((social.data ?? []) as SocialAssetRow[]).map((s) => ({
      ...s, urls: (s.storage_paths ?? []).map((p) => publicUrl(p)!),
    })),
    localizations: ((locs.data ?? []) as LocalizationRow[]).map((l) => ({
      ...l, price: { cents: l.price_cents, currency: l.currency },
    })),
    publications: (pubs.data ?? []) as PublicationRow[],
    what_claude_did: acts.map((a) => ({ step: a.step, summary: a.summary })),
  };
}

/** Etsy bulk-upload CSV. Columns follow Etsy's listing import template. */
export function etsyCsv(kit: Kit): string {
  const li = kit.listing;
  if (!li) return "";
  const q = (s: string | null | undefined) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const imgs = kit.frames.slice(0, 10).map((f) => f.url_clean ?? f.url_raw);
  const header = ["TITLE", "DESCRIPTION", "PRICE", "CURRENCY_CODE", "QUANTITY", "TAGS", "MATERIALS",
    ...Array.from({ length: 10 }, (_, i) => `IMAGE${i + 1}`)];
  const row = [
    q(li.title), q(li.description), (li.price.cents / 100).toFixed(2), li.price.currency, "1",
    q(li.tags.join(",")), q(""), ...Array.from({ length: 10 }, (_, i) => q(imgs[i] ?? "")),
  ];
  return header.join(",") + "\n" + row.join(",") + "\n";
}
