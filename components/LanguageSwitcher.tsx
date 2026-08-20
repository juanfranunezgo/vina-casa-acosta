"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";

type Locale = string;

type Props = {
  locales: readonly Locale[];
  currentLocale: Locale;
  variant?: "desktop" | "mobile" | "gate";
  /** true cuando el navbar está transparente sobre un hero oscuro. */
  onDark?: boolean;
};

const localeLabels: Record<string, string> = {
  es: "ES",
  en: "EN",
  pt: "PT",
};

const localeNames: Record<string, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
};

export default function LanguageSwitcher({
  locales,
  currentLocale,
  variant = "desktop",
  onDark = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const switchTo = (next: Locale) => {
    setOpen(false);
    if (next === currentLocale) return;
    const segments = pathname.split("/");
    segments[1] = next;
    const newPath = segments.join("/") || `/${next}`;
    startTransition(() => router.replace(newPath));
  };

  // Cierra el menú al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Variante para la capa de +18: la pregunta llega antes que el sitio, asi que
  // el idioma tiene que poder elegirse ahi mismo y de un toque, sin desplegar
  // nada. Va sobre la foto a sangre de la capa, de ahi el vidrio: el actual es
  // una pastilla blanca y los otros dos, texto claro sobre la foto. La `mobile`
  // tambien son tres botones, pero rellenos y pensados para el panel del menu.
  if (variant === "gate") {
    return (
      <div className="flex items-center gap-2" role="group" aria-label="Language" translate="no">
        {/* El globo dice de que se trata la fila sin gastar una palabra que
            habria que traducir tres veces. Es `aria-hidden` porque el grupo ya
            se anuncia como "Language". */}
        <Globe
          className="h-[18px] w-[18px] shrink-0 text-on-primary/85 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
          aria-hidden="true"
        />
        {locales.map((loc) => {
          const isCurrent = loc === currentLocale;
          return (
            <button
              key={loc}
              type="button"
              onClick={() => switchTo(loc)}
              disabled={isPending}
              aria-current={isCurrent ? "true" : undefined}
              className={`h-9 rounded-full px-4 font-body text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary/60 ${
                isCurrent
                  ? "bg-on-primary text-primary"
                  : "border border-white/25 text-on-primary/75 backdrop-blur-sm hover:bg-white/15 hover:text-on-primary"
              }`}
            >
              {localeLabels[loc] ?? loc.toUpperCase()}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "mobile") {
    return (
      <div className="flex items-center gap-2" role="group" aria-label="Language" translate="no">
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

  // Desktop: disparador discreto (globo + idioma actual + chevron) y menú con
  // los tres idiomas. Los colores del disparador se adaptan al navbar; el menú
  // siempre va sobre superficie clara, igual que el desplegable de Actividades.
  return (
    <div ref={rootRef} className="relative" translate="no">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 font-body text-label-sm uppercase tracking-wider transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 ${
          onDark
            ? "text-on-primary hover:bg-white/10 focus-visible:ring-on-primary/50"
            : "text-on-surface-variant hover:bg-primary/5 hover:text-primary focus-visible:ring-primary/40"
        }`}
      >
        <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="font-semibold">{localeLabels[currentLocale] ?? currentLocale.toUpperCase()}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Language"
          className="absolute right-0 top-full z-50 mt-2 min-w-[10rem] rounded-xl border border-outline-variant/40 bg-surface p-1.5 ambient-shadow"
        >
          {locales.map((loc) => {
            const isCurrent = loc === currentLocale;
            return (
              <li key={loc}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isCurrent}
                  onClick={() => switchTo(loc)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left font-body text-body-md transition-colors ${
                    isCurrent
                      ? "bg-primary/5 font-semibold text-primary"
                      : "text-on-surface-variant hover:bg-primary/5 hover:text-primary"
                  }`}
                >
                  <span>{localeNames[loc] ?? loc.toUpperCase()}</span>
                  {isCurrent ? (
                    <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <span className="text-label-sm uppercase tracking-wider opacity-60">
                      {localeLabels[loc] ?? loc.toUpperCase()}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
