import { Images } from "lucide-react";

type Props = {
  title: string;
  /** "Estamos preparando la galería…" — por qué no hay fotos todavía. */
  coming: string;
};

/**
 * Galería sin fotos (Dd6 · Dv6).
 *
 * Marcos de diseño y no fotos de stock: una imagen comprada diría que así se ve
 * esta actividad en Casa Acosta, y no es cierto. El aviso de abajo es lo que
 * convierte el hueco en una promesa en vez de un error.
 *
 * Vive en un componente porque lo dibujan la ficha y el hub de Vendimia igual;
 * cuando lleguen las fotos, el reemplazo es en un solo archivo.
 */
export default function GalleryPlaceholder({ title, coming }: Props) {
  return (
    <>
      <span className="mb-5 block h-px w-12 bg-wine-accent/60" />
      <h2 className="mb-8 font-display text-headline-h2 text-primary">{title}</h2>
      <div className="grid grid-cols-2 gap-gutter md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex aspect-[4/3] items-center justify-center rounded-xl border border-outline-variant/25 bg-gradient-to-br from-surface to-surface-container"
          >
            <Images className="h-8 w-8 text-primary-container/30" aria-hidden="true" />
          </div>
        ))}
      </div>
      <p className="mt-6 font-body text-body-md italic text-on-surface-variant/80">{coming}</p>
    </>
  );
}
