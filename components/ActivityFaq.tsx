"use client";

import { useState } from "react";
import { ChevronDown, ChevronsUpDown, MessageCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Emphasis from "@/components/Emphasis";

export type FaqEntry = { q: string; a: string };

type Props = {
  title: string;
  entries: FaqEntry[];
  /** "¿Tienes otra pregunta?" — la salida para lo que la lista no responde. */
  more: string;
  whatsappLabel: string;
  whatsappHref: string;
  expandAll: string;
  collapseAll: string;
};

/**
 * Dd6b — Preguntas frecuentes de una ficha.
 *
 * Va justo antes del formulario: son las dudas que frenan una reserva (¿hace
 * falta saber yoga?, ¿y si llueve?, ¿pueden venir menores?), y resolverlas
 * donde el visitante está por escribir es lo que hace que escriba.
 *
 * Cada pregunta es una tarjeta con borde y sombra, no una fila entre filetes:
 * pedido de Juan Francisco del 2026-09-24 sobre las preguntas de Quorum Legal.
 * Entre filetes la lista se leía como un índice; como tarjetas, cada pregunta
 * es algo que se toca.
 *
 * Sigue siendo `<details>` nativo: abre con teclado, lo anuncia el lector de
 * pantalla y Chrome encuentra una respuesta cerrada con Ctrl+F. Lo único que
 * agrega el estado es "Expandir todo", que necesita saber cuáles están
 * abiertas. La apertura se anima en CSS (`.faq-item` en globals.css) donde el
 * navegador sabe animar hasta `auto`, y en el resto abre de golpe, como antes.
 *
 * Sin marcado `FAQPage`: desde 2023 Google sólo lo muestra para sitios de
 * gobierno y de salud, así que no le daría nada a la viña.
 */
export default function ActivityFaq({
  title,
  entries,
  more,
  whatsappLabel,
  whatsappHref,
  expandAll,
  collapseAll,
}: Props) {
  const [open, setOpen] = useState<boolean[]>(() => entries.map(() => false));
  const allOpen = open.every(Boolean);

  // Tres piezas en el orden de celular: título, preguntas y recién ahí la
  // salida a WhatsApp — ofrecer "¿otra pregunta?" antes de mostrar las que hay
  // no tiene sentido. En escritorio la grilla las ubica sin reordenar el DOM:
  // la lista ocupa las dos filas de la derecha y la salida queda bajo el
  // título. `grid-rows-[auto_1fr]` hace que la primera fila mida lo que el
  // título y no la mitad de la lista.
  return (
    <div className="grid grid-cols-1 gap-x-16 gap-y-8 lg:grid-cols-12 lg:grid-rows-[auto_1fr]">
      <div className="lg:col-span-4 lg:col-start-1 lg:row-start-1">
        <span className="mb-5 block h-px w-12 bg-wine-accent/60" />
        <h2 className="font-display text-[2rem] leading-[1.12] text-primary md:text-[2.6rem]">
          {title}
        </h2>
      </div>

      <div className="lg:col-span-8 lg:col-start-5 lg:row-span-2 lg:row-start-1">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(entries.map(() => !allOpen))}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-[14px] text-on-surface-variant transition-colors hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {allOpen ? collapseAll : expandAll}
            <ChevronsUpDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3 md:space-y-4">
          {entries.map(({ q, a }, index) => (
            <details
              key={q}
              open={open[index]}
              onToggle={(event) => {
                const isOpen = event.currentTarget.open;
                setOpen((current) =>
                  current[index] === isOpen
                    ? current
                    : current.map((value, i) => (i === index ? isOpen : value)),
                );
              }}
              className="faq-item group rounded-2xl border border-outline-variant/50 bg-surface-container-lowest shadow-[0_14px_34px_-22px_rgba(74,14,14,0.30),0_2px_6px_-2px_rgba(74,14,14,0.05)] transition-[border-color,box-shadow] duration-300 open:border-wine-accent/30 open:shadow-[0_22px_44px_-24px_rgba(74,14,14,0.38),0_2px_6px_-2px_rgba(74,14,14,0.06)] hover:border-wine-accent/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 rounded-2xl px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:px-7 md:py-6 [&::-webkit-details-marker]:hidden">
                {/* Cada pregunta es un H3 bajo el H2 de la sección: así la
                    leen como pregunta → respuesta Google y los buscadores con
                    IA, que citan este tipo de bloque tal cual. `<summary>`
                    admite un encabezado adentro. */}
                <h3 className="font-body text-[1rem] font-semibold leading-snug text-primary md:text-[1.08rem]">
                  {q}
                </h3>
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-wine-accent transition-colors duration-300 group-open:bg-wine-accent group-open:text-on-primary"
                >
                  <ChevronDown className="h-5 w-5 motion-safe:transition-transform motion-safe:duration-300 group-open:rotate-180" />
                </span>
              </summary>
              <p className="max-w-[62ch] px-5 pb-6 font-body text-[17px] leading-[1.7] text-on-surface-variant md:px-7 md:pb-7">
                <Emphasis text={a} />
              </p>
            </details>
          ))}
        </div>
      </div>

      <div className="lg:col-span-4 lg:col-start-1 lg:row-start-2">
        <p className="font-body text-[17px] leading-[1.7] text-on-surface-variant">{more}</p>
        <div className="mt-3">
          <Button
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            variant="link"
            iconLeft={<MessageCircle className="h-4 w-4" />}
          >
            {whatsappLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
