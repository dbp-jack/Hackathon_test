import { NextRequest } from "next/server";
import JSZip from "jszip";
import { currentSellerId } from "@/lib/supabase/admin";
import { getLaunch, buildKit, etsyCsv } from "@/lib/kit";
import { apiError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };
export const maxDuration = 60;

/** GET /launches/{id}/download — everything as a .zip */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const launch = await getLaunch(id, currentSellerId());
  if (!launch) return apiError(404, "not_found");
  const kit = await buildKit(launch);
  const zip = new JSZip();

  if (kit.listing) {
    const li = kit.listing;
    zip.file("listing.txt", `${li.title}\n\nTAGS\n${li.tags.join(", ")}\n\nPRICE\n$${(li.price.cents / 100).toFixed(2)}\n\n${li.description}\n`);
    zip.file("etsy.csv", etsyCsv(kit));
  }
  for (const l of kit.localizations) zip.file(`localizations/${l.market}-${l.locale}.txt`, `${l.title}\n\n${l.tags.join(", ")}\n\n${l.description}\n`);

  const fetchInto = async (folder: string, name: string, url: string | null) => {
    if (!url) return;
    const res = await fetch(url);
    if (res.ok) zip.file(`${folder}/${name}`, await res.arrayBuffer());
  };
  await Promise.all([
    ...kit.frames.map((f, i) => fetchInto("photos", `${String(i + 1).padStart(2, "0")}-${f.role}.jpg`, f.url_clean ?? f.url_raw)),
    ...kit.videos.map((v) => fetchInto("videos", `${v.platform}-${v.kind}.mp4`, v.url)),
    ...kit.social.flatMap((s) => s.urls.map((u, i) => fetchInto("social", `${s.kind}-${i + 1}.jpg`, u))),
  ]);

  const buf = await zip.generateAsync({ type: "arraybuffer" });
  return new Response(buf, {
    headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="launch-kit-${id.slice(0, 8)}.zip"` },
  });
}
