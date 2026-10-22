import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MESSAGES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export async function Header({ crumb }: { crumb?: string }) {
  const locale = await getLocale();
  const t = MESSAGES[locale];
  return (
    <header className="relative flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-14">
      <Link href="/" className="flex items-center gap-2 no-underline text-ink">
        <span className="h-3.5 w-3.5 rounded bg-butter" />
        <span className="h-3.5 w-3.5 rounded bg-blue" />
        <span className="h-3.5 w-3.5 rounded bg-mint" />
        <span className="ms-1.5 text-xl font-bold tracking-tight">Launch Kit</span>
        {crumb && <span className="ms-2 hidden text-sm text-ink-mute sm:inline">{crumb}</span>}
      </Link>
      <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[15px] font-medium">
        <Link href="/launches" className="no-underline text-ink hover:text-blue">{t.nav.myLaunches}</Link>
        <Link href="/#pricing" className="no-underline text-ink hover:text-blue">{t.nav.pricing}</Link>
        <LanguageSwitcher current={locale} label={t.langLabel} />
        <span aria-label={t.nav.account} className="h-8.5 w-8.5 rounded-full bg-line" />
      </nav>
    </header>
  );
}
