// Worked example for /example: one 10-second knitting video, taken through the worker's steps by hand
// (frames picked and cropped, three 9:16 cuts with hooks, listing, four markets). Files live in public/example/knit.
// Only what the video shows is stated; yarn, size and care are left for the seller.
// Price comparables: Etsy search for hand-knit cable scarves, 2026-10-23. FX: frankfurter.dev rates of 2026-10-22, rounded.

const BASE = "/example/knit";

export type PhotoKey = "hero" | "cables" | "closeup" | "progress" | "yarn";

export const KNIT = {
  input: { src: `${BASE}/input.mp4`, poster: `${BASE}/input.jpg` },
  photos: (["hero", "cables", "closeup", "progress", "yarn"] as const).map((key) => ({ key, src: `${BASE}/photo-${key}.jpg` })),
  shorts: [
    { platform: "TikTok", badge: "bg-mint", seconds: 10, hook: "From one ball of yarn to this", src: `${BASE}/short-tiktok.mp4`, poster: `${BASE}/short-tiktok.jpg` },
    { platform: "Reels", badge: "bg-blush", seconds: 6, hook: "Every stitch, by hand.", src: `${BASE}/short-reels.mp4`, poster: `${BASE}/short-reels.jpg` },
    { platform: "Shorts", badge: "bg-lilac", seconds: 6, hook: "Would you wear this blue?", src: `${BASE}/short-shorts.mp4`, poster: `${BASE}/short-shorts.jpg` },
  ],
  listing: {
    title: "Hand-Knit Cable Scarf in Powder Blue | Chunky Knit Winter Scarf | Handmade Cable Knit Wrap | Cozy Gift for Her",
    tags: ["cable knit scarf", "hand knit scarf", "powder blue scarf", "chunky knit scarf", "handmade scarf", "winter scarf", "light blue scarf", "knitted scarf", "cozy scarf", "gift for her", "cable scarf", "handknit gift", "soft winter wrap"],
    description: [
      "Knit by hand, stitch by stitch, this scarf has a raised cable running down the middle and a soft powder blue that sits easily with grey coats, camel and cream.",
      "It is knit in a chunky yarn on wooden needles, so every stitch is big and easy to see. The cables are crossed by hand as the scarf grows, which is why no two come out exactly alike.",
      "Because it is made by hand, yours may differ slightly from the photos. That is how you can tell.",
    ],
    price: "$80.00",
    comparables: { range: "$30–$175", mid: "$75–$100", url: "https://www.etsy.com/market/cable_knit_scarf" },
  },
  markets: [
    { code: "UK", lang: "en-GB", title: "Hand-Knitted Cable Scarf in Powder Blue | Chunky Knit Winter Scarf", price: "£60.00" },
    { code: "DE", lang: "de-DE", title: "Handgestrickter Schal mit Zopfmuster in Puderblau | Grobstrick-Winterschal", price: "€71.00" },
    { code: "AU", lang: "en-AU", title: "Hand-Knitted Cable Scarf in Powder Blue | Chunky Winter Scarf", price: "A$114.00" },
    { code: "CA", lang: "fr-CA", title: "Foulard tricoté à la main à torsades, bleu poudre | Foulard d’hiver en grosse maille", price: "C$112.00" },
  ],
  channels: ["Shopify", "TikTok", "Pinterest"],
};
