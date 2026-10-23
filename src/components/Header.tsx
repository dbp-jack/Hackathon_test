import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MESSAGES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export async function Header({ crumb }: { crumb?: string }) {
  const locale = await getLocale();
  const t = MESSAGES[locale];
  return (
    <header className="relative flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-5 sm:px-14">
      <Link href="/" className="order-1 me-auto flex items-center gap-2 no-underline text-ink">
        <span className="h-3.5 w-3.5 rounded bg-butter" />
        <span className="h-3.5 w-3.5 rounded bg-blue" />
        <span className="h-3.5 w-3.5 rounded bg-mint" />
        <span className="ms-1.5 text-xl font-bold tracking-tight">Launch Kit</span>
        {crumb && <span className="ms-2 hidden text-sm text-ink-mute sm:inline">{crumb}</span>}
      </Link>
      {/* Phones: logo and language on the first row, links on their own row below */}
      <nav className="order-3 flex w-full items-center gap-x-6 text-[15px] font-medium sm:order-2 sm:w-auto">
        <Link href="/launches" className="no-underline text-ink hover:text-blue">{t.nav.myLaunches}</Link>
        <Link href="/#pricing" className="no-underline text-ink hover:text-blue">{t.nav.pricing}</Link>
      </nav>
      <div className="order-2 flex items-center gap-6 sm:order-3">
        <LanguageSwitcher current={locale} label={t.langLabel} />
        <span aria-label={t.nav.account} className="hidden h-8.5 w-8.5 rounded-full bg-line sm:block" />
      </div>
    </header>
  );
}
