import { MapPin } from "lucide-react";

type Props = {
  title: string;
  src: string;
};

/**
 * Mapa incrustado de la ficha de Google de la viña.
 *
 * **Por qué no tiene estado.** La versión anterior arrancaba el iframe en
 * `opacity: 0` y lo revelaba con el `onLoad` de React. Ese evento llega una sola
 * vez y no se puede recuperar: si el iframe termina de cargar antes de que React
 * hidrate —cosa cada vez más probable a medida que la página suma componentes—
 * nadie lo escucha, el estado se queda en `false` y el mapa queda **cargado pero
 * invisible** detrás del esqueleto, para siempre. Así se rompió en producción, y
 * el síntoma engaña: la URL del embed está bien, el iframe carga, y aun así no
 * se ve nada.
 *
 * La solución no es un temporizador de rescate sino sacar el evento del medio.
 * El esqueleto va **detrás** y el iframe encima, siempre opaco: mientras el
 * mapa no ha pintado, el iframe es transparente y se ve el esqueleto; cuando
 * pinta, lo tapa. Ningún JavaScript participa, así que no hay carrera que
 * perder — y el componente dejó de necesitar `"use client"`.
 *
 * Si el mapa no cargara nunca, el visitante ve el esqueleto con su etiqueta. La
 * dirección y el enlace a Google Maps viven igual en la tarjeta de abajo, así
 * que la página sigue diciendo dónde está la viña.
 */
export default function MapEmbed({ title, src }: Props) {
  return (
    <div className="relative w-full h-full min-h-[400px] md:min-h-full bg-surface-container">
      <div
        aria-hidden="true"
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 skeleton"
      >
        <MapPin className="h-8 w-8 text-primary/50" aria-hidden="true" />
        <span className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant/70">
          {title}
        </span>
      </div>
      <iframe
        title={title}
        src={src}
        className="absolute inset-0 w-full h-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
