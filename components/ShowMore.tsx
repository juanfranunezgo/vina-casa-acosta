"use client";

import { useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import Button from "@/components/ui/Button";

type Props = {
  /** id del bloque que se despliega: lo nombra el `aria-controls` del botón. */
  id: string;
  /** Texto del botón, ya traducido. */
  label: string;
  /** Nombre accesible del bloque desplegado, ya traducido. */
  regionLabel: string;
  children: ReactNode;
};

/**
 * "Ver más": el contenido extra llega en el HTML servido pero oculto con
 * `hidden`, y un botón lo muestra. Nació para la galería de la vendimia (Dv6).
 *
 * Por qué así y no de otra forma:
 *
 * - **El contenido está en el HTML desde el principio**, no se monta al hacer
 *   clic: Google indexa las fotos y sus `alt` igual. Y como `hidden` es
 *   `display: none`, las imágenes con carga diferida no se descargan hasta que
 *   alguien las pide.
 * - **Sólo se abre, no se vuelve a cerrar.** Un "Ver menos" al pie de un bloque
 *   largo lo haría desaparecer por encima de quien lo está leyendo y la página
 *   saltaría hacia arriba. Una vez abierto, el botón se va.
 * - **El foco pasa al bloque nuevo** al abrir. Si no, el botón desaparece con el
 *   foco adentro y quien navega con teclado o lector de pantalla vuelve al
 *   principio de la página.
 *
 * Sin JavaScript el bloque se queda oculto. Es contenido de más, no el
 * contenido: la parte visible de la galería se entiende sola.
 */
export default function ShowMore({ id, label, regionLabel, children }: Props) {
  const [open, setOpen] = useState(false);
  const region = useRef<HTMLDivElement>(null);

  const reveal = () => {
    setOpen(true);
    // Después del render que le quita el `hidden`: antes no se puede enfocar.
    requestAnimationFrame(() => region.current?.focus({ preventScroll: true }));
  };

  return (
    <>
      <div
        id={id}
        ref={region}
        role="group"
        aria-label={regionLabel}
        tabIndex={-1}
        hidden={!open}
        className="outline-none"
      >
        {children}
      </div>
      {!open && (
        <div className="mt-10 flex justify-center">
          <Button
            variant="outline"
            aria-expanded={false}
            aria-controls={id}
            onClick={reveal}
            iconRight={<ChevronDown className="h-4 w-4" />}
          >
            {label}
          </Button>
        </div>
      )}
    </>
  );
}
