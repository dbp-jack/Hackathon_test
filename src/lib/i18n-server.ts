import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n";

/** The language the visitor picked in the switcher; English until they pick one. */
export async function getLocale(): Promise<Locale> {
  const picked = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(picked) ? picked : DEFAULT_LOCALE;
}
