"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/historia", label: "Historia" },
  { href: "/actividades", label: "Actividades" },
  { href: "/vinos", label: "Nuestros Vinos" },
  { href: "/contacto", label: "Contacto" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-surface/85 backdrop-blur-xl border-b border-outline-variant/25 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-(--container-max) mx-auto flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-xl md:text-2xl text-primary leading-none"
          aria-label="Viña Casa Acosta — Inicio"
        >
          <Image
            src="/brand/logo-negro.png"
            alt="Logo Casa Acosta"
            width={140}
            height={40}
            className="h-9 w-auto md:h-10"
            priority
          />
        </Link>

        <ul className="hidden md:flex items-center gap-6 lg:gap-8 font-body text-body-md">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
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

        <div className="hidden md:block">
          <Link
            href="/tienda"
            className={`px-6 py-2 rounded font-body text-body-md transition-colors shadow-sm ambient-shadow ${
              isActive("/tienda")
                ? "bg-primary text-on-primary"
                : "bg-primary-container text-on-primary hover:bg-primary"
            }`}
          >
            Tienda
          </Link>
        </div>

        <button
          className="md:hidden text-primary p-2 -mr-2"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span className="material-symbols-outlined text-3xl">
            {open ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ${
          open ? "max-h-[480px] opacity-100" : "max-h-0 opacity-0"
        } bg-surface/95 backdrop-blur-xl border-b border-outline-variant/25`}
      >
        <ul className="flex flex-col px-margin-mobile py-4 gap-1">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`block py-3 font-body text-body-md ${
                  isActive(link.href)
                    ? "text-primary font-semibold"
                    : "text-on-surface-variant"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/tienda"
              className="block mt-2 bg-primary-container text-on-primary text-center py-3 rounded font-body text-body-md"
            >
              Tienda
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
