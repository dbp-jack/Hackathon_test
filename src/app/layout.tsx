import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { dirOf } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const metadata: Metadata = {
  title: "Launch Kit — Make it once. Launch it everywhere.",
  description: "One phone video of you making your product. Claude turns it into an Etsy listing, photos, shorts and translated listings in about five minutes.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={dirOf(locale)}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-dvh flex flex-col">
        <Header />
        {children}
      </body>
    </html>
  );
}
