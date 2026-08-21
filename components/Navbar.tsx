"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Menu, X, ArrowRight, ChevronDown, ShoppingBag } from "lucide-react";
import { routing } from "@/i18n/routing";
import { useCart } from "@/lib/cart";
import ActivitiesMenu from "./ActivitiesMenu";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("nav");
  const tCart = useTranslations("cart");
  // El hero ya pasó por debajo del header (o, en páginas claras, hay scroll).
  const [pastHero, setPastHero] = useState(false);
  // El texto del hero está pasando por detrás del header transparente.
  const [heroTextBehind, setHeroTextBehind] = useState(false);
  const [open, setOpen] = useState(false);
  const [activitiesMenuOpen, setActivitiesMenuOpen] = useState(false);
  const [mobileActivitiesOpen, setMobileActivitiesOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const closeMobileMenu = useCallback(() => {
    setOpen(false);
    setMobileActivitiesOpen(false);
  }, []);

  // El carrito del panel móvil. La cuenta vive en `localStorage`, así que no
  // existe en el render del servidor: pintarla sin esperar a montar es un
  // desajuste de hidratación. Mismo guard que usa `CartButton`, que es el botón
  // flotante con el que este comparte destino.
  const totalCarrito = useCart((s) => s.totalItems());
  const abrirCarrito = useCart((s) => s.toggle);
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const enElCarrito = montado ? totalCarrito : 0;

  const links = [
    { href: "", label: t("home") },
    { href: "/historia", label: t("historia") },
    { href: "/actividades", label: t("actividades") },
    { href: "/vinos", label: t("vinos") },
    { href: "/staff", label: t("staff") },
    { href: "/contacto", label: t("contacto") },
  ];

  const localePath = (suffix: string) => `/${locale}${suffix}`;
  const homePath = `/${locale}`;

  const isActive = (suffix: string) => {
    if (suffix === "") return pathname === homePath;
    return pathname.startsWith(`${homePath}${suffix}`);
  };

  // El navbar va transparente con logo/texto claros sobre los heros oscuros
  // full-bleed (Inicio, Historia, Actividades —incluidas las fichas de tour— y
  // Vinos). Al pasar el hero —o en páginas de fondo claro— toma el tratamiento
  // oscuro para no perder legibilidad. /vinos va con match exacto porque la
  // ficha de vino (/vinos/[slug]) sí abre con fondo claro.
  const hasDarkHero =
    pathname === homePath ||
    pathname === `${homePath}/historia` ||
    pathname.startsWith(`${homePath}/actividades`) ||
    pathname === `${homePath}/vinos`;

  useEffect(() => {
    // Fondo claro: el header se vuelve opaco apenas se scrollea.
    const onPlainScroll = () => {
      setPastHero(window.scrollY > 12);
      setHeroTextBehind(false);
    };

    const hero = hasDarkHero ? document.querySelector<HTMLElement>("main > section") : null;
    if (!hero) {
      onPlainScroll();
      window.addEventListener("scroll", onPlainScroll, { passive: true });
      return () => window.removeEventListener("scroll", onPlainScroll);
    }

    // Hero oscuro: el header queda transparente TODO el hero y recién toma su
    // tratamiento claro cuando el hero termina de pasar por debajo. Mientras
    // dura el hero, si su texto se mete detrás del header se enciende un velo
    // para que las letras no choquen con los links.
    const heroText = hero.querySelector<HTMLElement>("[data-hero-text]");
    const update = () => {
      const navHeight = navRef.current?.offsetHeight ?? 88;
      setPastHero(hero.getBoundingClientRect().bottom <= navHeight);
      setHeroTextBehind(
        heroText ? heroText.getBoundingClientRect().top <= navHeight + 8 : false,
      );
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [hasDarkHero, pathname]);

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
      if (e.key === "Escape") closeMobileMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeMobileMenu]);

  const overHero = hasDarkHero && !pastHero;

  return (
    <>
      {/* Landmark banner del sitio; contiene la navegación principal. */}
      <header>
        <nav
          ref={navRef}
          className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          pastHero
            ? "bg-surface/85 backdrop-blur-xl border-b border-outline-variant/25 shadow-sm"
            : "bg-transparent"
        }`}
      >
        {/* Velo cinematográfico: solo mientras el texto del hero pasa por detrás
            del header transparente, para que no se lean encimadas las letras. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-gradient-to-b from-black/75 via-black/40 to-transparent transition-opacity duration-300 ${
            !pastHero && heroTextBehind ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="relative max-w-(--container-max) mx-auto flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4">
          <Link
            href={homePath}
            className="flex items-center leading-none"
            aria-label={t("logoAlt")}
          >
            <Image
              src={overHero ? "/brand/logo-blanco-v2.webp" : "/brand/logo-negro.webp"}
              alt={t("logoAlt")}
              width={200}
              height={200}
              className="h-14 w-auto md:h-16"
              sizes="64px"
              priority
            />
          </Link>

          <ul className="hidden md:flex items-center gap-6 lg:gap-8 font-body text-body-md">
            {links.map((link) => {
              const active = isActive(link.href);
              const isActividades = link.href === "/actividades";
              return (
                <li
                  key={link.href || "home"}
                  className="relative"
                  onMouseEnter={isActividades ? () => setActivitiesMenuOpen(true) : undefined}
                  onMouseLeave={isActividades ? () => setActivitiesMenuOpen(false) : undefined}
                  onFocusCapture={isActividades ? () => setActivitiesMenuOpen(true) : undefined}
                  onBlurCapture={
                    isActividades
                      ? (event) => {
                          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                            setActivitiesMenuOpen(false);
                          }
                        }
                      : undefined
                  }
                >
                  <Link
                    href={localePath(link.href)}
                    onClick={isActividades ? () => setActivitiesMenuOpen(false) : undefined}
                    aria-expanded={isActividades ? activitiesMenuOpen : undefined}
                    aria-controls={isActividades ? "nav-actividades-menu" : undefined}
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
                          className={`h-3.5 w-3.5 transition-transform duration-200 ${activitiesMenuOpen ? "rotate-180" : ""}`}
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

                  {/* El panel se renderiza SIEMPRE y solo se oculta. Antes se
                      montaba con `activitiesMenuOpen &&`, y como el estado
                      arranca cerrado sus enlaces no existían en el HTML del
                      servidor: un menú que parecía navegación y no enlazaba
                      nada. El elemento que lleva `hidden` no puede traer clase
                      de display —la pisaría—, por eso la grilla va adentro. */}
                  {isActividades && (
                    <div
                      id="nav-actividades-menu"
                      hidden={!activitiesMenuOpen}
                      className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3"
                    >
                      <div className="w-[min(92vw,22rem)] rounded-xl border border-outline-variant/40 bg-surface p-3 ambient-shadow">
                        <ActivitiesMenu locale={locale} variant="desktop" />
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
            <LanguageSwitcher
              locales={routing.locales}
              currentLocale={locale}
              onDark={overHero}
            />
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
      </header>

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
          onClick={closeMobileMenu}
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
                onClick={closeMobileMenu}
                className="inline-flex items-center gap-2.5 leading-none"
                aria-label={t("logoAlt")}
              >
                {/* 56px y no 64: con el desplegable de idioma en la misma fila,
                    a 375px el nombre se partía en dos líneas. El nombre lleva
                    `whitespace-nowrap` para que si algún día vuelve a no caber
                    se note en el acto y no en un salto de línea silencioso. */}
                <Image
                  src="/brand/logo-blanco-v2.webp"
                  alt=""
                  width={200}
                  height={200}
                  className="h-14 w-auto"
                  sizes="56px"
                />
                <span
                  aria-hidden="true"
                  className="font-display text-on-primary text-base leading-tight tracking-tight whitespace-nowrap"
                >
                  Viña Casa Acosta
                </span>
              </Link>
            </div>

            {/* El idioma vive acá: es lo que menos se usa del panel y la fila
                del encabezado ya existía, así que no cuesta alto. Y va como el
                desplegable del escritorio —globo, idioma actual, chevron— en
                vez de tres pastillas: es el mismo control en las dos pantallas,
                y cerrado ocupa un tercio de lo que ocupaban las pastillas. */}
            <div className="ml-auto flex items-center gap-1">
              <LanguageSwitcher
                locales={routing.locales}
                currentLocale={locale}
                onDark
              />
              <button
                type="button"
                onClick={closeMobileMenu}
                aria-label={t("closeMenu")}
                className="shrink-0 h-11 w-11 flex items-center justify-center text-on-primary rounded-full border border-on-primary/30 bg-on-primary/5 hover:bg-on-primary/15 active:bg-on-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary/60 transition-colors"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Sección 1 — Navegación */}
          <div
            className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: open ? "140ms" : "0ms" }}
          >
            {/* Acá vivía el rótulo "NAVEGACIÓN", que nombraba lo único que el
                panel podía ser. No lo reemplaza nada: el idioma —que antes
                cerraba el panel, 167px bajo el pliegue en un teléfono de 667px—
                se fue al encabezado, y la lista arranca directamente. */}
          </div>

          <ul className="flex flex-col">
            {links.map((link, idx) => {
              const isActivities = link.href === "/actividades";
              const linkClass = `font-display text-2xl leading-tight transition-colors ${
                isActive(link.href)
                  ? "text-on-primary font-semibold"
                  : "text-on-primary/70 hover:text-on-primary active:text-on-primary"
              }`;

              return (
                <li
                  key={link.href || "home"}
                  className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: open ? `${idx * 60 + 200}ms` : "0ms" }}
                >
                  {isActivities ? (
                    <>
                      <div className="flex items-center justify-between">
                        <Link
                          href={localePath(link.href)}
                          onClick={closeMobileMenu}
                          className={`flex-1 py-2.5 ${linkClass}`}
                        >
                          {link.label}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setMobileActivitiesOpen((current) => !current)}
                          aria-expanded={mobileActivitiesOpen}
                          aria-controls="mobile-activities-menu"
                          aria-label={mobileActivitiesOpen ? t("closeTours") : t("openTours")}
                          className="-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-primary transition-colors hover:bg-on-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary/60"
                        >
                          <ChevronDown
                            className={`h-5 w-5 transition-transform duration-200 ${mobileActivitiesOpen ? "rotate-180" : ""}`}
                            aria-hidden="true"
                          />
                        </button>
                      </div>

                      {/* Mismo criterio que el panel de escritorio: se
                          renderiza siempre y se oculta. `py-2` no toca display,
                          así que `hidden` manda. */}
                      <div
                        id="mobile-activities-menu"
                        hidden={!mobileActivitiesOpen}
                        className="py-2"
                      >
                        <ActivitiesMenu
                          locale={locale}
                          variant="mobile"
                          onNavigate={closeMobileMenu}
                        />
                      </div>
                    </>
                  ) : (
                    <Link
                      href={localePath(link.href)}
                      onClick={closeMobileMenu}
                      className={`block py-2.5 ${linkClass}`}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Divisor + Sección 2 — Comprar.
              El aire era `mt-10 pt-8`: 72px para separar dos bloques que ya
              separa un filete. A la mitad sigue leyéndose como otra sección. */}
          <div
            className={`mt-6 pt-6 border-t border-on-primary/15 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: open ? `${links.length * 60 + 260}ms` : "0ms" }}
          >
            <p className="font-body text-[11px] uppercase tracking-[0.3em] text-on-primary/55 mb-4">
              {t("sectionShop")}
            </p>
            {/* Tienda y carrito en la misma fila: el carrito no tenía puerta en
                el menú —sólo el botón flotante, que el propio panel tapa— y en
                dos filas costaba los 56px que acabamos de ganar. */}
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Link
                href={localePath("/tienda")}
                onClick={closeMobileMenu}
                className="group flex items-center justify-between bg-on-primary text-primary px-5 py-4 rounded-md font-body font-semibold text-body-md shadow-[0_12px_30px_-8px_rgba(0,0,0,0.4)] active:scale-[0.98] transition-transform"
              >
                <span>{t("tienda")}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  closeMobileMenu();
                  abrirCarrito(true);
                }}
                aria-label={
                  enElCarrito > 0
                    ? tCart("openLabelWithCount", { count: enElCarrito })
                    : tCart("openLabel")
                }
                className="relative flex items-center gap-2 rounded-md border border-on-primary/30 px-4 py-4 font-body font-semibold text-body-md text-on-primary transition-colors hover:bg-on-primary/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary/60"
              >
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                {enElCarrito > 0 && (
                  <span className="min-w-[22px] rounded-full bg-tertiary-fixed px-1 py-0.5 text-center font-body text-xs font-bold tabular-nums text-primary">
                    {enElCarrito}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
