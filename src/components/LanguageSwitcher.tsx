"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, dirOf, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ current, label }: { current: Locale; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const currentName = LOCALES.find((l) => l.code === current)?.name ?? "English";

  // Close on outside click or Escape while the list is open
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function choose(code: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = code;
    document.documentElement.dir = dirOf(code);
    setOpen(false);
    button.current?.focus();
    startTransition(() => router.refresh());
  }

  return (
    <div ref={wrap} className="sm:relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="language-list"
        aria-label={`${label}: ${currentName}`}
        onClick={() => setOpen((o) => !o)}
        className={`btn btn-ghost btn-sm text-[13px] ${pending ? "opacity-60" : ""}`}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
        <span>{currentName}</span>
        <svg className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div id="language-list" className="tile absolute inset-x-6 top-full z-50 mt-2 border-2 border-ink bg-white p-2 shadow-[0_8px_0_0_#151515] sm:inset-x-auto sm:end-0 sm:w-[340px]">
          <div className="px-3 pb-1.5 pt-1 text-xs font-semibold text-ink-mute">{label}</div>
          <ul className="m-0 grid list-none grid-cols-2 gap-1 p-0">
            {LOCALES.map((l) => {
              const selected = l.code === current;
              return (
                <li key={l.code}>
                  <button
                    type="button"
                    lang={l.code}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => choose(l.code)}
                    className={`flex w-full items-center justify-between gap-2 rounded-full px-3 py-2 text-start text-sm ${selected ? "bg-butter font-semibold" : "hover:bg-chalk"}`}
                  >
                    <span className="truncate">{l.name}</span>
                    {selected && (
                      <svg className="h-3.5 w-3.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
