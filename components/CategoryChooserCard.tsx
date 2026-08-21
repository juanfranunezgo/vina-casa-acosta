"use client";

import { useCallback, useId, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import {
  CategoryMenuPanel,
  useCerrarAlSalir,
  type CategoryMenuItem,
} from "@/components/CategoryMenu";

type Item = CategoryMenuItem;

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
 * El panel y su comportamiento viven en `components/CategoryMenu.tsx`, que
 * comparte con el mosaico A4 del Inicio: las mismas tres puertas están en las
 * dos páginas y abren el mismo menú. Ahí está también la razón por la que los
 * enlaces se renderizan siempre y se ocultan con `hidden`.
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
  const cerrar = useCallback(() => setAbierto(false), []);

  useCerrarAlSalir(abierto, contenedor, cerrar);

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

      <CategoryMenuPanel
        id={panelId}
        items={items ?? []}
        abierto={abierto}
        alElegir={cerrar}
      />
    </div>
  );
}
