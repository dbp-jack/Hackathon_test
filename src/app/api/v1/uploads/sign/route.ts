import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin, BUCKET, currentSellerId } from "@/lib/supabase/admin";
import { apiError, LIMITS } from "@/lib/api";

const Body = z.object({
  files: z.array(z.object({ name: z.string().min(1), mime: z.string(), bytes: z.number().int().positive() })).min(1).max(21),
});

/** POST /uploads/sign — signed URLs so the browser uploads straight to Storage. */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return apiError(400, "invalid_body", parsed.error.message);

  const videos = parsed.data.files.filter((f) => f.mime.startsWith("video/"));
  const photos = parsed.data.files.filter((f) => f.mime.startsWith("image/"));
  if (videos.length > 1) return apiError(400, "too_many_videos", "One video per launch");
  if (photos.length > LIMITS.photoMax) return apiError(400, "too_many_photos", `Up to ${LIMITS.photoMax} photos`);
  if (videos.some((v) => v.bytes > LIMITS.videoMaxBytes)) return apiError(413, "media_too_large", undefined, "10 min / 2 GB");

  const db = supabaseAdmin();
  const sellerId = currentSellerId();
  const uploads = [];
  for (const f of parsed.data.files) {
    const mediaId = crypto.randomUUID();
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${sellerId}/uploads/${mediaId}.${ext}`;
    const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return apiError(500, "sign_failed", error?.message);
    // staged media rows live without a launch until POST /launches adopts them
    await db.from("staged_media").insert({ id: mediaId, seller_id: sellerId, kind: f.mime.startsWith("video/") ? "video" : "photo", storage_path: path, original_name: f.name, bytes: f.bytes });
    uploads.push({ media_id: mediaId, put_url: data.signedUrl, token: data.token, path, expires_in: 900 });
  }
  return NextResponse.json({ uploads });
}
