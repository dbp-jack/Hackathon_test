import sharp from "sharp";

/**
 * Pinterest pin (1000×1500) and Instagram carousel (up to 5 × 1080×1080) as flat JPEGs: sharp composites the product photo
 * (rounded corners, soft shadow) over a themed background and an SVG text layer. Fonts resolve through fontconfig, so DejaVu Sans
 * (fonts-dejavu-core in the worker image) is named first with sans-serif fallbacks for local runs.
 */
export type CardOpts = {
  photos: Buffer[];           // hero first; carousel uses up to 5
  title: string;
  priceCents: number;
  currency?: string;
  shopName?: string | null;
  city?: string | null;
  colors?: string[];          // product_attributes.colors — picks the background theme
  captions?: (string | null)[]; // one-liners for carousel slides 2–4 (video captions or listing sentences)
};

type Theme = { bg: string; glow: string; accent: string; ink: string; pill: string };
const INK = "#1A1A1A";
/** Brand-friendly themes keyed on common color words; everything else falls back to a warm cream. */
const THEMES: { re: RegExp; theme: Theme }[] = [
  { re: /\b(blue|navy|indigo|denim|sky|teal|cobalt)\b/i, theme: { bg: "#E6EDF5", glow: "#FFFFFF", accent: "#2F4A6B", ink: INK, pill: "#2F4A6B" } },
  { re: /\b(green|sage|olive|mint|forest|moss|emerald)\b/i, theme: { bg: "#E7EDE4", glow: "#FFFFFF", accent: "#3F5A45", ink: INK, pill: "#3F5A45" } },
  { re: /\b(pink|blush|rose|coral|peach|mauve)\b/i, theme: { bg: "#F7E7E4", glow: "#FFFFFF", accent: "#9A4E57", ink: INK, pill: "#9A4E57" } },
  { re: /\b(terracotta|rust|orange|brown|tan|caramel|walnut|copper|amber)\b/i, theme: { bg: "#F3E6DA", glow: "#FFFFFF", accent: "#8A4B2F", ink: INK, pill: "#8A4B2F" } },
  { re: /\b(yellow|mustard|gold|honey|butter|lemon)\b/i, theme: { bg: "#F8EFD6", glow: "#FFFFFF", accent: "#8A6A1E", ink: INK, pill: "#8A6A1E" } },
  { re: /\b(red|burgundy|wine|berry|maroon|crimson)\b/i, theme: { bg: "#F5E4E1", glow: "#FFFFFF", accent: "#7E2E2E", ink: INK, pill: "#7E2E2E" } },
  { re: /\b(purple|lavender|lilac|plum|violet)\b/i, theme: { bg: "#ECE6F3", glow: "#FFFFFF", accent: "#5C4677", ink: INK, pill: "#5C4677" } },
  { re: /\b(gr[ae]y|black|charcoal|slate|stone|graphite)\b/i, theme: { bg: "#ECEAE6", glow: "#FFFFFF", accent: "#3A3A3A", ink: INK, pill: "#3A3A3A" } },
];
const CREAM: Theme = { bg: "#F6EFE4", glow: "#FFFFFF", accent: "#7A5A3A", ink: INK, pill: "#7A5A3A" };

export function pickTheme(colors: string[] = []): Theme {
  // the first listed color is the dominant one; white/cream/speckle words say nothing about a theme, so skip them
  for (const c of colors) for (const t of THEMES) if (t.re.test(c)) return t.theme;
  return CREAM;
}

const FONT = "'DejaVu Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const esc = (s: string) => s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));

/** Greedy word wrap on an average glyph width (DejaVu Sans Bold ≈ 0.66 em); the last line gets an ellipsis if it overflows. */
export function wrapLines(text: string, maxWidthPx: number, fontPx: number, maxLines: number): string[] {
  const perLine = Math.max(8, Math.floor(maxWidthPx / (fontPx * 0.66)));
  const words = text.trim().split(/\s+/), lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= perLine) { cur = next; continue; }
    if (cur) lines.push(cur);
    cur = w.length > perLine ? w.slice(0, perLine - 1) + "…" : w;
    if (lines.length === maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length > maxLines || (lines.length === maxLines && words.join(" ").length > lines.join(" ").length)) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[\s,.;:!-]*$/, "").slice(0, perLine - 1) + "…";
  }
  return lines;
}

function fmtPrice(cents: number, currency = "USD") {
  const sym = currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
  return `${sym}${cents % 100 === 0 ? (cents / 100).toFixed(0) : (cents / 100).toFixed(2)}`;
}

/** Flat color + soft radial highlight top-left, and a blurred dark rounded rect where the photo will sit (the shadow). */
function background(w: number, h: number, t: Theme, shadow: { x: number; y: number; w: number; h: number; r: number }) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="g" cx="25%" cy="18%" r="70%"><stop offset="0" stop-color="${t.glow}" stop-opacity="0.85"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>
    <filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="22"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="${t.bg}"/><rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect x="${shadow.x}" y="${shadow.y + 18}" width="${shadow.w}" height="${shadow.h}" rx="${shadow.r}" fill="#000" opacity="0.22" filter="url(#b)"/>
</svg>`);
}

/** Cover-fit the photo into w×h and round the corners with an SVG mask. */
async function roundedPhoto(photo: Buffer, w: number, h: number, r: number) {
  const img = await sharp(photo).rotate().resize(w, h, { fit: "cover", position: "attention" }).toBuffer();
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`);
  return sharp(img).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

const pill = (x: number, y: number, text: string, fontPx: number, fill: string, color = "#fff", anchor: "start" | "middle" = "start") => {
  const w = Math.round(text.length * fontPx * 0.66 + fontPx * 1.3), h = Math.round(fontPx * 1.8);
  const px = anchor === "middle" ? x - w / 2 : x;
  return `<rect x="${px}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>
  <text x="${px + w / 2}" y="${y + h * 0.68}" font-family="${FONT}" font-weight="700" font-size="${fontPx}" fill="${color}" text-anchor="middle">${esc(text)}</text>`;
};
const badge = (x: number, y: number, fontPx: number, t: Theme) => `<g>
  <circle cx="${x}" cy="${y}" r="${fontPx * 2.2}" fill="none" stroke="${t.accent}" stroke-width="3" stroke-dasharray="6 5"/>
  <text x="${x}" y="${y - fontPx * 0.15}" font-family="${FONT}" font-weight="700" font-size="${fontPx}" fill="${t.accent}" text-anchor="middle">MADE</text>
  <text x="${x}" y="${y + fontPx * 0.95}" font-family="${FONT}" font-weight="700" font-size="${fontPx}" fill="${t.accent}" text-anchor="middle">BY HAND</text></g>`;
const lines = (x: number, y: number, ls: string[], fontPx: number, color: string, anchor = "start", weight = 700) =>
  ls.map((l, i) => `<text x="${x}" y="${y + i * fontPx * 1.2}" font-family="${FONT}" font-weight="${weight}" font-size="${fontPx}" fill="${color}" text-anchor="${anchor}">${esc(l)}</text>`).join("\n");

const jpeg = (img: sharp.Sharp) => img.flatten().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
const svg = (w: number, h: number, body: string) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);

/** 1000×1500 Pinterest pin: photo on top, title + price + origin below, badge bottom-right. */
export async function renderPin(o: CardOpts): Promise<Buffer> {
  const W = 1000, H = 1500, M = 60, t = pickTheme(o.colors);
  const photo = { x: M, y: M, w: W - 2 * M, h: 960, r: 36 };
  const titleLines = wrapLines(o.title, W - 2 * M - 40, 56, 3);
  const textTop = photo.y + photo.h + 86;
  const priceY = textTop + titleLines.length * 56 * 1.2 + 10;
  const body = `
  ${lines(M, textTop, titleLines, 56, t.ink)}
  ${pill(M, priceY, fmtPrice(o.priceCents, o.currency), 34, t.pill)}
  <text x="${M + 8}" y="${priceY + 115}" font-family="${FONT}" font-weight="700" font-size="28" fill="${t.accent}">${esc(`Handmade in ${o.city?.trim() || "a small studio"}`)}</text>
  ${o.shopName ? `<text x="${M + 8}" y="${priceY + 155}" font-family="${FONT}" font-size="26" fill="${t.ink}" opacity="0.7">${esc(o.shopName)}</text>` : ""}
  ${badge(W - M - 70, H - M - 70, 20, t)}`;
  const img = sharp(background(W, H, t, photo)).composite([
    { input: await roundedPhoto(o.photos[0], photo.w, photo.h, photo.r), left: photo.x, top: photo.y },
    { input: svg(W, H, body), left: 0, top: 0 },
  ]);
  return jpeg(img);
}

/**
 * 1080×1080 carousel: slide 1 hero + title + price; slides 2–4 one frame each with a one-line caption; last slide "Shop the listing".
 * Returns 2–5 slides depending on how many photos were given.
 */
export async function renderCarousel(o: CardOpts): Promise<Buffer[]> {
  const W = 1080, M = 48, t = pickTheme(o.colors);
  const photos = o.photos.slice(0, 5), out: Buffer[] = [];
  const frames = photos.slice(1, 4); // middle slides
  const slideCount = 1 + frames.length + 1;

  // slide 1 — hero
  {
    const ph = { x: M, y: M, w: W - 2 * M, h: 680, r: 32 };
    const tl = wrapLines(o.title, W - 2 * M - 260, 44, 2);
    const ty = ph.y + ph.h + 78;
    const body = `${lines(M, ty, tl, 44, t.ink)}
    ${pill(W - M - 190, ty - 36, fmtPrice(o.priceCents, o.currency), 30, t.pill)}
    <text x="${M + 4}" y="${ty + tl.length * 44 * 1.2 + 26}" font-family="${FONT}" font-weight="700" font-size="24" fill="${t.accent}">${esc(`Handmade in ${o.city?.trim() || "a small studio"}`)}</text>
    ${dots(W, 0, slideCount, t)}`;
    out.push(await jpeg(sharp(background(W, W, t, ph)).composite([
      { input: await roundedPhoto(photos[0], ph.w, ph.h, ph.r), left: ph.x, top: ph.y }, { input: svg(W, W, body), left: 0, top: 0 }])));
  }
  // slides 2–4 — one frame + one caption line
  const fallback = o.captions?.filter((c): c is string => !!c && c.trim().length > 0) ?? [];
  for (const [i, f] of frames.entries()) {
    const ph = { x: M, y: M, w: W - 2 * M, h: 800, r: 32 };
    const cap = (fallback[i] ?? "").trim();
    const capLine = cap ? wrapLines(cap, W - 2 * M - 80, 38, 1)[0] : "";
    const body = `${capLine ? pill(W / 2, ph.y + ph.h + 56, capLine, 38, "#FFFFFF", t.ink, "middle") : ""}${dots(W, i + 1, slideCount, t)}`;
    out.push(await jpeg(sharp(background(W, W, t, ph)).composite([
      { input: await roundedPhoto(f, ph.w, ph.h, ph.r), left: ph.x, top: ph.y }, { input: svg(W, W, body), left: 0, top: 0 }])));
  }
  // last slide — CTA
  {
    const ph = { x: (W - 420) / 2, y: 120, w: 420, h: 420, r: 210 };
    const shop = o.shopName?.trim() || "our shop";
    const body = `
    <text x="${W / 2}" y="${ph.y + ph.h + 120}" font-family="${FONT}" font-weight="700" font-size="60" fill="${t.ink}" text-anchor="middle">Shop the listing</text>
    ${lines(W / 2, ph.y + ph.h + 185, wrapLines(shop, W - 2 * M - 120, 36, 1), 36, t.accent, "middle")}
    ${pill(W / 2, ph.y + ph.h + 240, `${fmtPrice(o.priceCents, o.currency)} · link in bio`, 30, t.pill, "#fff", "middle")}
    ${badge(W - M - 60, W - M - 60, 18, t)}
    ${dots(W, slideCount - 1, slideCount, t)}`;
    out.push(await jpeg(sharp(background(W, W, t, ph)).composite([
      { input: await roundedPhoto(photos[0], ph.w, ph.h, ph.r), left: ph.x, top: ph.y }, { input: svg(W, W, body), left: 0, top: 0 }])));
  }
  return out;
}

/** Slide-position dots along the bottom, so a single slide still reads as part of a set. */
function dots(w: number, active: number, n: number, t: Theme) {
  const gap = 22, x0 = w / 2 - ((n - 1) * gap) / 2;
  return Array.from({ length: n }, (_, i) => `<circle cx="${x0 + i * gap}" cy="${w - 30}" r="5" fill="${t.accent}" opacity="${i === active ? 0.9 : 0.3}"/>`).join("");
}
