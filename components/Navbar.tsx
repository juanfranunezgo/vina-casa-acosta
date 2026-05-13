"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { routing } from "@/i18n/routing";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("nav");
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
            className="flex items-center gap-2 font-display text-xl md:text-2xl text-primary leading-none"
            aria-label={t("logoAlt")}
          >
            <Image
              src="/brand/logo-negro.png"
              alt={t("logoAlt")}
              width={180}
              height={56}
              className="h-12 w-auto md:h-14"
              priority
            />
          </Link>

          <ul className="hidden md:flex items-center gap-6 lg:gap-8 font-body text-body-md">
            {links.map((link) => (
              <li key={link.href || "home"}>
                <Link
                  href={localePath(link.href)}
                  className={`relative pb-1 transition-colors ${
                    isActive(link.href)
                      ? "text-primary font-semibold"
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-primary rounded-full" />
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher locales={routing.locales} currentLocale={locale} />
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
          </div>

          <button
            className="md:hidden text-primary h-11 w-11 -mr-2 flex items-center justify-center relative z-[70]"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <span className="relative h-6 w-6">
              <Menu
                className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${
                  open ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
                }`}
                aria-hidden="true"
              />
              <X
                className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${
                  open ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
                }`}
                aria-hidden="true"
              />
            </span>
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
          className={`relative h-full flex flex-col px-margin-mobile pt-24 pb-12 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? "translate-y-0" : "translate-y-4"
          }`}
        >
          <ul className="flex flex-col gap-1 flex-grow">
            {links.map((link, idx) => (
              <li
                key={link.href || "home"}
                className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: open ? `${idx * 60 + 100}ms` : "0ms" }}
              >
                <Link
                  href={localePath(link.href)}
                  className={`block py-4 font-display text-4xl border-b border-on-primary/15 transition-colors ${
                    isActive(link.href)
                      ? "text-on-primary"
                      : "text-on-primary/70 hover:text-on-primary"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li
              className={`mt-6 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: open ? `${links.length * 60 + 100}ms` : "0ms" }}
            >
              <Link
                href={localePath("/tienda")}
                className="block bg-on-primary text-primary text-center py-4 rounded-md font-body font-semibold text-body-lg shadow-[0_12px_30px_-8px_rgba(0,0,0,0.4)] active:scale-[0.98] transition-transform"
              >
                {t("tienda")}
              </Link>
            </li>
          </ul>

          <div
            className={`pt-8 mt-auto border-t border-on-primary/15 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: open ? "500ms" : "0ms" }}
          >
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
