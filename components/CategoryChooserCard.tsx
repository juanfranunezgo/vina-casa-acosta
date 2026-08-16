"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";

type Item = { href: string; label: string };

type Props = {
  name: string;
  image: string;
  /** Vacío cuando la tarjeta es un enlace externo y no un selector. */
  items?: Item[];
  externalUrl?: string;
  externalLabel?: string;
  /** Qué dice la píldora del selector: "Ver cuáles". */
  openLabel?: string;
};

/**
 * Tarjeta que pregunta cuál querés ver, en vez de decorar. Reemplaza a las tres
 * tarjetas de A4 y D3, de las cuales dos eran `<article>` sin enlace: prometían
 * una categoría y no llevaban a ninguna parte.
 *
 * Los enlaces del panel se renderizan SIEMPRE y se ocultan con `hidden`. Es lo
 * que hace que estas tarjetas cuenten como enlazado interno y no solo como
 * interfaz — ver tests/navegacion-enlaces-source.test.mjs, y el caso real del
 * desplegable del navbar, que durante meses no enlazó nada.
 *
 * Es un menú, no un diálogo: cierra con Escape, con clic fuera y al elegir,
 * pero no atrapa el foco.
 */
export default function CategoryChooserCard({
  name,
  image,
  items,
  externalUrl,
  externalLabel,
  openLabel,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const panelId = useId();
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    const alClickear = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    window.addEventListener("mousedown", alClickear);
    return () => {
      window.removeEventListener("keydown", alTeclear);
      window.removeEventListener("mousedown", alClickear);
    };
  }, [abierto]);

  const pildora =
    "mt-4 inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-on-primary/45 bg-on-primary/10 px-4 font-body text-label-sm font-semibold uppercase tracking-wider text-on-primary backdrop-blur-sm transition-colors group-hover:bg-on-primary group-hover:text-primary";

  if (externalUrl) {
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block h-80 overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
      >
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-primary/85 via-primary/35 to-transparent p-6">
          <h3 className="font-display text-2xl text-on-primary">{name}</h3>
          <span className={pildora}>
            {externalLabel}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </a>
    );
  }

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls={panelId}
        className="group relative block h-80 w-full overflow-hidden rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
      >
        <Image
          src={image}
          alt=""
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-primary/85 via-primary/35 to-transparent p-6">
          <h3 className="font-display text-2xl text-on-primary">{name}</h3>
          <span className={pildora}>
            {openLabel}
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </span>
        </div>
      </button>

      {/* Sin clase de display en este elemento: pisaría el display:none que
          aplica `hidden`. */}
      <div
        id={panelId}
        hidden={!abierto}
        className="absolute inset-x-0 bottom-0 z-30 max-h-72 overflow-y-auto rounded-xl border border-outline-variant/40 bg-surface p-2 ambient-shadow-lg"
      >
        <ul>
          {items?.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setAbierto(false)}
                className="group/item flex min-h-11 items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 font-body text-body-md text-on-surface-variant transition-colors hover:bg-primary/5 hover:text-primary"
              >
                {item.label}
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
