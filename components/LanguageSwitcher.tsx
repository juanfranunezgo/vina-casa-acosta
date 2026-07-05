"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

type Locale = string;

type Props = {
  locales: readonly Locale[];
  currentLocale: Locale;
  variant?: "desktop" | "mobile";
};

const localeLabels: Record<string, string> = {
  es: "ES",
  en: "EN",
  pt: "PT",
};

export default function LanguageSwitcher({
  locales,
  currentLocale,
  variant = "desktop",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: Locale) => {
    if (next === currentLocale) return;
    const segments = pathname.split("/");
    segments[1] = next;
    const newPath = segments.join("/") || `/${next}`;
    startTransition(() => router.replace(newPath));
  };

  if (variant === "mobile") {
    return (
      <div
        className="flex items-center gap-2"
        role="group"
        aria-label="Language"
      >
        {locales.map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => switchTo(loc)}
            disabled={isPending}
            aria-current={loc === currentLocale ? "true" : undefined}
            className={`flex-1 h-12 rounded-md font-body font-semibold text-label-sm uppercase tracking-wider transition-all duration-200 ${
              loc === currentLocale
                ? "bg-on-primary text-primary"
                : "bg-white/10 text-on-primary/70 border border-on-primary/20 hover:bg-white/20 hover:text-on-primary"
            }`}
          >
            {localeLabels[loc] ?? loc.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  // Desktop: minimal y discreto — hereda el color del navbar (currentColor).
  // Activo = opacidad plena + semibold; el resto atenuado.
  return (
    <div
      className="flex items-center gap-2 font-body text-label-sm uppercase tracking-wider"
      role="group"
      aria-label="Language"
    >
      {locales.map((loc, i) => (
        <div key={loc} className="flex items-center gap-2">
          {i > 0 && (
            <span aria-hidden="true" className="opacity-30 select-none">
              ·
            </span>
          )}
          <button
            type="button"
            onClick={() => switchTo(loc)}
            disabled={isPending}
            aria-current={loc === currentLocale ? "true" : undefined}
            className={`transition-opacity duration-200 ${
              loc === currentLocale
                ? "font-semibold opacity-100"
                : "opacity-55 hover:opacity-90"
            }`}
          >
            {localeLabels[loc] ?? loc.toUpperCase()}
          </button>
        </div>
      ))}
    </div>
  );
}
