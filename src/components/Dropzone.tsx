"use client";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { fmt, type Messages } from "@/lib/i18n";

type Stage = "idle" | "signing" | "uploading" | "starting" | "error";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? "launches";

export function Dropzone({ t }: { t: Messages["drop"] }) {
  const photoCount = (n: number) => (n === 1 ? t.photoOne : fmt(t.photoMany, { n }));
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [hints, setHints] = useState({ product_name: "", materials: "", price: "", ships_from: "" });

  const accept = useCallback((list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => f.type.startsWith("video/") || f.type.startsWith("image/"));
    const videos = arr.filter((f) => f.type.startsWith("video/"));
    if (videos.length > 1) { setError(t.oneVideo); return; }
    setError(null);
    setFiles(arr.slice(0, 21));
  }, [t.oneVideo]);

  async function start() {
    if (!files.length) { inputRef.current?.click(); return; }
    try {
      setStage("signing");
      const signRes = await fetch("/api/v1/uploads/sign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: files.map((f) => ({ name: f.name, mime: f.type, bytes: f.size })) }),
      });
      if (!signRes.ok) throw new Error((await signRes.json()).error);
      const { uploads } = await signRes.json() as { uploads: { media_id: string; path: string; token: string }[] };

      setStage("uploading");
      let done = 0;
      await Promise.all(uploads.map(async (u, i) => {
        const { error } = await supabaseBrowser().storage.from(BUCKET).uploadToSignedUrl(u.path, u.token, files[i], { contentType: files[i].type });
        if (error) throw error;
        done += 1; setPct(Math.round((done / uploads.length) * 100));
      }));

      setStage("starting");
      const priceCents = hints.price ? Math.round(parseFloat(hints.price.replace(/[^0-9.]/g, "")) * 100) : undefined;
      const res = await fetch("/api/v1/launches", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_ids: uploads.map((u) => u.media_id),
          hints: {
            product_name: hints.product_name || undefined,
            materials: hints.materials || undefined,
            price_cents: priceCents && priceCents > 0 ? priceCents : undefined,
            ships_from: hints.ships_from ? { city: hints.ships_from, country: "US" } : undefined,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error === "insufficient_credits" ? t.outOfLaunches : body.message ?? body.error);
      }
      const { launch_id } = await res.json();
      router.push(`/launches/${launch_id}`);
    } catch (e) {
      setStage("error");
      setError(e instanceof Error && e.message ? e.message : t.generic);
    }
  }

  const busy = stage === "signing" || stage === "uploading" || stage === "starting";
  const video = files.find((f) => f.type.startsWith("video/"));
  const photos = files.filter((f) => f.type.startsWith("image/"));

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files); }}
        className={`tile flex flex-wrap items-center justify-center gap-x-6 gap-y-4 border-[3px] border-dashed bg-white px-6 py-8 text-start transition-colors sm:px-8 ${over ? "border-blue" : "border-ink"}`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {files.length === 0 ? (
            <>
              <div className="text-[22px] font-bold tracking-tight">{t.title}</div>
              <div className="text-sm text-ink-mute">{t.sub}</div>
            </>
          ) : (
            <>
              <div className="text-[20px] font-bold tracking-tight">
                {video ? video.name : photoCount(photos.length)}
              </div>
              <div className="text-sm text-ink-mute">
                {video && `${(video.size / 1024 ** 2).toFixed(0)} MB`}{video && photos.length ? " · " : ""}{photos.length ? photoCount(photos.length) : ""}
                {" · "}<button type="button" onClick={() => inputRef.current?.click()} className="underline">{t.change}</button>
              </div>
            </>
          )}
        </div>
        <button type="button" className="btn btn-primary text-base" onClick={start} disabled={busy}>
          {stage === "idle" || stage === "error" ? (files.length ? t.build : t.choose)
            : stage === "uploading" ? fmt(t.uploading, { pct }) : stage === "starting" ? t.starting : t.preparing}
        </button>
        <input ref={inputRef} type="file" accept="video/*,image/*" multiple hidden onChange={(e) => e.target.files && accept(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div className="card grid grid-cols-1 gap-3 border border-line p-4 sm:grid-cols-2">
          <Field id="product-name" label={t.productName} value={hints.product_name} onChange={(v) => setHints({ ...hints, product_name: v })} placeholder={t.productNamePh} />
          <Field id="materials" label={t.materials} value={hints.materials} onChange={(v) => setHints({ ...hints, materials: v })} placeholder={t.materialsPh} />
          <Field id="price" label={t.price} value={hints.price} onChange={(v) => setHints({ ...hints, price: v })} placeholder={t.pricePh} />
          <Field id="ships-from" label={t.shipsFrom} value={hints.ships_from} onChange={(v) => setHints({ ...hints, ships_from: v })} placeholder={t.shipsFromPh} />
          <div className="text-xs text-ink-mute sm:col-span-2">{t.optional}</div>
        </div>
      )}

      {error && <div role="alert" className="rounded-xl bg-blush px-4 py-3 text-sm font-medium text-blush-ink">{error}</div>}
    </div>
  );
}

function Field({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-ink-soft">{label}</span>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="rounded-lg border border-line bg-chalk px-3 py-2.5 text-sm placeholder:text-ink-mute/70" />
    </label>
  );
}
