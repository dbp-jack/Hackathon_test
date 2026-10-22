// Small example of each output on the home page, drawn from the sample mug in demoKit.ts.
// Decorative: the tile's own name and detail carry the meaning, so it is hidden from screen readers.

type SceneKind = "hero" | "top" | "detail" | "wheel" | "scale";

const GLAZE = "#F3EEE4";
const GLAZE_SHADE = "#E2DACB";
const CLAY = "#B98E6A";
const SPECK = "#5E4D3F";

const SPECKS: [number, number][] = [[33, 40], [41, 36], [52, 44], [60, 38], [37, 52], [47, 57], [56, 55], [62, 63], [31, 64], [44, 46], [50, 65], [58, 49], [39, 61], [62, 46]];

// Fixed pseudo-random dots so the close-up looks the same on every render
const DETAIL_SPECKS = Array.from({ length: 34 }, (_, i) => {
  const x = (i * 37 + 11) % 100, y = 26 + ((i * 53 + 7) % 74), r = 0.9 + ((i * 29) % 7) * 0.28;
  return [x, y, r] as const;
});

function Mug() {
  return (
    <>
      <ellipse cx="47" cy="83" rx="25" ry="3.5" fill="#000" opacity=".12" />
      <path d="M65 42c11 0 12 20 0 22" fill="none" stroke={GLAZE_SHADE} strokeWidth="6" strokeLinecap="round" />
      <path d="M27 30h40v42a9 9 0 0 1-9 9H36a9 9 0 0 1-9-9z" fill={GLAZE} />
      <path d="M27 69h40v3a9 9 0 0 1-9 9H36a9 9 0 0 1-9-9z" fill={CLAY} />
      <rect x="31" y="35" width="3" height="28" rx="1.5" fill="#fff" opacity=".7" />
      {SPECKS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".85" fill={SPECK} />)}
      <ellipse cx="47" cy="30" rx="20" ry="4" fill={GLAZE_SHADE} />
      <ellipse cx="47" cy="30.6" rx="17" ry="2.7" fill="#CFC3B1" />
    </>
  );
}

function Scene({ kind, bg, className = "" }: { kind: SceneKind; bg: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio={kind === "detail" ? "xMidYMid slice" : "xMidYMid meet"} className={className} style={{ background: bg }}>
      {kind === "hero" && <Mug />}
      {kind === "top" && (
        <>
          <circle cx="49" cy="54" r="29" fill="#000" opacity=".1" />
          <rect x="68" y="45" width="20" height="10" rx="5" fill={GLAZE_SHADE} />
          <circle cx="46" cy="50" r="28" fill={GLAZE} />
          <circle cx="46" cy="50" r="22.5" fill="#6E4B33" />
          <circle cx="46" cy="50" r="20" fill="none" stroke="#9A6E4E" strokeWidth="2.5" opacity=".7" />
          {[[26, 36], [62, 31], [68, 62], [30, 70], [47, 76], [21, 52]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".9" fill={SPECK} />)}
        </>
      )}
      {kind === "detail" && (
        <>
          <rect width="100" height="100" fill={GLAZE} />
          <path d="M0 0h100v16Q50 30 0 16z" fill={CLAY} />
          <path d="M0 16Q50 30 100 16" fill="none" stroke={GLAZE_SHADE} strokeWidth="3" />
          {DETAIL_SPECKS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={SPECK} opacity=".85" />)}
        </>
      )}
      {kind === "wheel" && (
        <>
          <ellipse cx="50" cy="78" rx="40" ry="10" fill="#6F6A63" />
          <ellipse cx="50" cy="74" rx="40" ry="10" fill="#8C877F" />
          <path d="M34 72V44a16 4 0 0 1 32 0v28a16 4 0 0 1-32 0z" fill={CLAY} />
          <path d="M35 53h30M35 62h30" stroke="#9E7556" strokeWidth="1" opacity=".8" />
          <ellipse cx="50" cy="44" rx="16" ry="4" fill="#C9A07D" />
          <ellipse cx="50" cy="44" rx="11" ry="2.6" fill="#9E7556" />
        </>
      )}
      {kind === "scale" && (
        <>
          <g transform="rotate(-8 32 55)">
            <rect x="10" y="22" width="40" height="58" rx="3" fill="#FBFAF6" />
            <path d="M17 34h26M17 42h26M17 50h26M17 58h18" stroke="#D9D4CA" strokeWidth="1.5" />
          </g>
          <g transform="translate(46 26) scale(.62)"><Mug /></g>
        </>
      )}
    </svg>
  );
}

function Check() {
  return <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>;
}

const THUMBS: [SceneKind, string][] = [["top", "#C9B8A3"], ["detail", "#E3D8C8"], ["wheel", "#A89C8C"], ["scale", "#CFC4B4"]];

const SHORTS: { scene: SceneKind; bg: string; hook: string; platform: string; badge: string }[] = [
  { scene: "wheel", bg: "#A89C8C", hook: "3 hours at the wheel. 30 seconds.", platform: "TikTok", badge: "bg-mint" },
  { scene: "hero", bg: "#D9CBB8", hook: "What goes into one $42 mug", platform: "Reels", badge: "bg-blush" },
  { scene: "top", bg: "#C9B8A3", hook: "No talking. Just clay.", platform: "Shorts", badge: "bg-lilac" },
];

// Same prices as the sample kit's localizations
const MARKETS: [string, string, string][] = [
  ["UK", "Speckled mug", "£33.50"],
  ["DE", "Steinzeugbecher", "€39.00"],
  ["AU", "Speckled mug", "A$64.00"],
  ["CA", "Tasse en grès", "C$57.00"],
];

export function OutputExample({ kind }: { kind: string }) {
  switch (kind) {
    case "listing":
      return (
        <div dir="ltr" className="flex h-full flex-col justify-between rounded-[14px] bg-white p-2.5 text-ink">
          <div className="flex gap-2.5">
            <Scene kind="hero" bg="#E9E2D6" className="h-11 w-11 flex-none rounded-lg" />
            <div className="line-clamp-2 text-[12px] font-semibold leading-snug">Handmade Speckled Stoneware Mug 12 oz | Wheel-Thrown Ceramic Coffee Cup</div>
          </div>
          <div className="flex gap-1 text-[10.5px] font-medium">
            {["speckled mug", "stoneware", "+11"].map((t) => <span key={t} className="whitespace-nowrap rounded-full bg-butter/55 px-2 py-0.5">{t}</span>)}
          </div>
          <div className="text-lg font-extrabold leading-none tracking-tight">$42.00</div>
        </div>
      );
    case "photos":
      return (
        <div className="flex h-full flex-col gap-1.5">
          <Scene kind="hero" bg="#E9E2D6" className="min-h-0 w-full flex-1 rounded-[10px]" />
          <div className="grid h-10 flex-none grid-cols-4 gap-1.5">
            {THUMBS.map(([k, bg]) => <Scene key={k} kind={k} bg={bg} className="h-full w-full rounded-lg" />)}
          </div>
        </div>
      );
    case "shorts":
      return (
        <div dir="ltr" className="flex h-full gap-2">
          {SHORTS.map((s) => (
            <div key={s.platform} className="relative aspect-[9/16] h-full flex-none overflow-hidden rounded-[10px]" style={{ background: s.bg }}>
              <Scene kind={s.scene} bg={s.bg} className="absolute inset-0 h-full w-full" />
              <div className="absolute inset-x-1.5 top-2.5 rounded-[5px] bg-white px-1 py-0.5 text-center text-[8.5px] font-bold leading-tight text-ink">{s.hook}</div>
              <span className={`absolute bottom-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[8.5px] font-semibold text-ink ${s.badge}`}>{s.platform}</span>
            </div>
          ))}
        </div>
      );
    case "markets":
      return (
        <div dir="ltr" className="flex h-full flex-col justify-between rounded-[14px] bg-white/75 px-2.5 py-2.5 text-ink">
          {MARKETS.map(([code, name, price]) => (
            <div key={code} className="flex items-center gap-2 text-[11.5px]">
              <span className="w-7 flex-none rounded-md bg-mint py-0.5 text-center text-[10px] font-bold">{code}</span>
              <span className="min-w-0 flex-1 truncate text-ink-soft">{name}</span>
              <span className="flex-none font-bold tabular-nums">{price}</span>
            </div>
          ))}
        </div>
      );
    case "publish":
      return (
        <div dir="ltr" className="flex h-full flex-col justify-center gap-1.5 rounded-[14px] bg-white/60 p-2">
          {["Shopify", "TikTok", "Pinterest"].map((c) => (
            <div key={c} className="flex items-center justify-between rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-ink">
              <span>{c}</span>
              <span className="grid h-4.5 w-4.5 place-items-center rounded-full bg-ink text-white"><Check /></span>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}
