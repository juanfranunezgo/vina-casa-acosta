import { MessageCircle, Plus } from "lucide-react";
import Button from "@/components/ui/Button";

export type FaqEntry = { q: string; a: string };

type Props = {
  title: string;
  entries: FaqEntry[];
  /** "¿Tienes otra pregunta?" — la salida para lo que la lista no responde. */
  more: string;
  whatsappLabel: string;
  whatsappHref: string;
};

/**
 * Dd6b — Preguntas frecuentes de una ficha.
 *
 * Va justo antes del formulario: son las dudas que frenan una reserva (¿hace
 * falta saber yoga?, ¿y si llueve?, ¿pueden venir menores?), y resolverlas
 * donde el visitante está por escribir es lo que hace que escriba.
 *
 * `<details>` nativo y no un acordeón con estado: abre con teclado, lo anuncia
 * el lector de pantalla, funciona sin JavaScript y Chrome encuentra el texto de
 * una respuesta cerrada con Ctrl+F. El `+` gira a `×` al abrir; el giro se
 * apaga con movimiento reducido.
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
}: Props) {
  // Tres piezas en el orden de celular: título, preguntas y recién ahí la
  // salida a WhatsApp — ofrecer "¿otra pregunta?" antes de mostrar las que hay
  // no tiene sentido. En escritorio la grilla las ubica sin reordenar el DOM:
  // la lista ocupa las dos filas de la derecha y la salida queda bajo el
  // título. `grid-rows-[auto_1fr]` hace que la primera fila mida lo que el
  // título y no la mitad de la lista.
  return (
    <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-12 lg:grid-rows-[auto_1fr]">
      <div className="lg:col-span-4 lg:col-start-1 lg:row-start-1">
        <span className="mb-5 block h-px w-12 bg-wine-accent/60" />
        <h2 className="font-display text-[2rem] leading-[1.12] text-primary md:text-[2.6rem]">
          {title}
        </h2>
      </div>

      <div className="border-b border-outline-variant lg:col-span-8 lg:col-start-5 lg:row-span-2 lg:row-start-1">
        {entries.map(({ q, a }) => (
          <details key={q} className="group border-t border-outline-variant">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 rounded-sm py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-4 focus-visible:ring-offset-surface [&::-webkit-details-marker]:hidden">
              <span className="font-display text-[1.15rem] leading-snug text-primary md:text-[1.3rem]">
                {q}
              </span>
              <Plus
                aria-hidden="true"
                strokeWidth={1.5}
                className="mt-0.5 h-6 w-6 shrink-0 text-wine-accent motion-safe:transition-transform motion-safe:duration-300 group-open:rotate-45"
              />
            </summary>
            <p className="max-w-[62ch] pb-7 pr-10 font-body text-[17px] leading-[1.7] text-on-surface-variant">
              {a}
            </p>
          </details>
        ))}
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
