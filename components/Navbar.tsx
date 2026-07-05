"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Menu, X, ArrowRight, ChevronDown } from "lucide-react";
import { routing } from "@/i18n/routing";
import { tours } from "@/data/activities";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("nav");
  const tTours = useTranslations("tours");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const links = [
    { href: "", label: t("home") },
    { href: "/historia", label: t("historia") },
    { href: "/actividades", label: t("actividades") },
    { href: "/vinos", label: t("vinos") },
    { href: "/contacto", label: t("contacto") },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const localePath = (suffix: string) => `/${locale}${suffix}`;
  const homePath = `/${locale}`;

  const isActive = (suffix: string) => {
    if (suffix === "") return pathname === homePath;
    return pathname.startsWith(`${homePath}${suffix}`);
  };

  // El navbar es transparente sobre el hero oscuro SOLO en el home cuando está
  // arriba. En el resto de páginas (fondo claro) o al scrollear, usa el
  // tratamiento oscuro para no perder legibilidad.
  const isHome = pathname === homePath;
  const overHero = isHome && !scrolled;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-surface/85 backdrop-blur-xl border-b border-outline-variant/25 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-(--container-max) mx-auto flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4">
          <Link
            href={homePath}
            className="flex items-center leading-none"
            aria-label={t("logoAlt")}
          >
            <Image
              src={overHero ? "/brand/logo-blanco.png" : "/brand/logo-negro.png"}
              alt={t("logoAlt")}
              width={200}
              height={200}
              className="h-14 w-auto md:h-16"
              priority
            />
          </Link>

          <ul className="hidden md:flex items-center gap-6 lg:gap-8 font-body text-body-md">
            {links.map((link) => {
              const active = isActive(link.href);
              const isActividades = link.href === "/actividades";
              return (
                <li key={link.href || "home"} className="relative group">
                  <Link
                    href={localePath(link.href)}
                    className={`relative pb-1 inline-flex items-center gap-1 transition-colors ${
                      active
                        ? overHero
                          ? "text-on-primary font-semibold"
                          : "text-primary font-semibold"
                        : overHero
                          ? "text-on-primary/80 hover:text-on-primary"
                          : "text-on-surface-variant hover:text-primary"
                    }`}
                  >
                    {link.label}
                    {isActividades && (
                      <ChevronDown
                        className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180"
                        aria-hidden="true"
                      />
                    )}
                    {active && (
                      <span
                        className={`absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full ${
                          overHero ? "bg-on-primary" : "bg-primary"
                        }`}
                      />
                    )}
                  </Link>

                  {isActividades && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 transition-all duration-200 z-50">
                      <div className="min-w-[248px] bg-surface rounded-xl border border-outline-variant/40 ambient-shadow p-2">
                        {tours.map((tour) => (
                          <Link
                            key={tour.slug}
                            href={localePath(`/actividades/${tour.slug}`)}
                            className="group/item flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-on-surface-variant hover:bg-primary/5 hover:text-primary transition-colors"
                          >
                            <span className="flex items-center gap-2 font-body text-body-md">
                              {tour.premium && (
                                <span className="text-primary" aria-hidden="true">
                                  ★
                                </span>
                              )}
                              {tTours(`${tour.slug}.name`)}
                            </span>
                            <ArrowRight
                              className="h-4 w-4 opacity-0 -translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-200"
                              aria-hidden="true"
                            />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div
            className={`hidden md:flex items-center gap-5 ${
              overHero ? "text-on-primary" : "text-on-surface-variant"
            }`}
          >
            <Link
              href={localePath("/tienda")}
              className={`inline-flex items-center justify-center h-10 px-6 rounded-md font-body text-body-md font-semibold shadow-[0_4px_14px_-4px_rgba(42,0,2,0.3)] hover:shadow-[0_8px_18px_-4px_rgba(42,0,2,0.5)] hover:-translate-y-0.5 transition-all duration-200 ${
                isActive("/tienda")
                  ? "bg-primary text-on-primary"
                  : "bg-primary-container text-on-primary hover:bg-primary"
              }`}
            >
              {t("tienda")}
            </Link>
            <LanguageSwitcher locales={routing.locales} currentLocale={locale} />
          </div>

          <button
            className={`md:hidden h-11 w-11 -mr-2 flex items-center justify-center relative z-[70] transition-opacity duration-200 ${
              overHero ? "text-on-primary" : "text-primary"
            } ${open ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            aria-label={t("openMenu")}
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </nav>

      {/* Mobile fullscreen drawer */}
      <div
        className={`md:hidden fixed inset-0 z-[60] transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={t("openMenu")}
      >
        <div
          className="absolute inset-0 bg-primary/95 backdrop-blur-2xl"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        <div
          className={`relative h-full flex flex-col px-margin-mobile pt-6 pb-10 overflow-y-auto transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? "translate-y-0" : "translate-y-4"
          }`}
        >
          {/* Top row: logo + cerrar X — alineados horizontalmente */}
          <div className="mb-12 flex items-center justify-between gap-4">
            <div
              className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: open ? "60ms" : "0ms" }}
            >
              <Link
                href={homePath}
                className="inline-flex items-center gap-3 leading-none"
                aria-label={t("logoAlt")}
              >
                <Image
                  src="/brand/logo-blanco.png"
                  alt=""
                  width={200}
                  height={200}
                  className="h-16 w-auto"
                />
                <span
                  aria-hidden="true"
                  className="font-display text-on-primary text-base leading-tight tracking-tight"
                >
                  Viña Casa Acosta
                </span>
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("closeMenu")}
              className="shrink-0 h-11 w-11 flex items-center justify-center text-on-primary rounded-full border border-on-primary/30 bg-on-primary/5 hover:bg-on-primary/15 active:bg-on-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary/60 transition-colors"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Sección 1 — Navegación */}
          <div
            className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: open ? "140ms" : "0ms" }}
          >
            <p className="font-body text-[11px] uppercase tracking-[0.3em] text-on-primary/55 mb-5">
              {t("sectionNav")}
            </p>
          </div>

          <ul className="flex flex-col">
            {links.map((link, idx) => (
              <li
                key={link.href || "home"}
                className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: open ? `${idx * 60 + 200}ms` : "0ms" }}
              >
                <Link
                  href={localePath(link.href)}
                  className={`block py-3 font-display text-2xl leading-tight transition-colors ${
                    isActive(link.href)
                      ? "text-on-primary font-semibold"
                      : "text-on-primary/70 hover:text-on-primary active:text-on-primary"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Divisor + Sección 2 — Comprar */}
          <div
            className={`mt-10 pt-8 border-t border-on-primary/15 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: open ? `${links.length * 60 + 260}ms` : "0ms" }}
          >
            <p className="font-body text-[11px] uppercase tracking-[0.3em] text-on-primary/55 mb-4">
              {t("sectionShop")}
            </p>
            <Link
              href={localePath("/tienda")}
              className="group flex items-center justify-between bg-on-primary text-primary px-5 py-4 rounded-md font-body font-semibold text-body-md shadow-[0_12px_30px_-8px_rgba(0,0,0,0.4)] active:scale-[0.98] transition-transform"
            >
              <span>{t("tienda")}</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Divisor + Sección 3 — Idioma */}
          <div
            className={`mt-10 pt-8 border-t border-on-primary/15 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: open ? `${links.length * 60 + 340}ms` : "0ms" }}
          >
            <p className="font-body text-[11px] uppercase tracking-[0.3em] text-on-primary/55 mb-4">
              {t("language")}
            </p>
            <LanguageSwitcher
              locales={routing.locales}
              currentLocale={locale}
              variant="mobile"
            />
          </div>
        </div>
      </div>
    </>
  );
}
