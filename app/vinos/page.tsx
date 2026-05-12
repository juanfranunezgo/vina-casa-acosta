import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import { wines, wineLines } from "@/data/wines";

export const metadata: Metadata = {
  title: "Nuestros Vinos",
  description:
    "Colección completa de vinos de Viña Casa Acosta: Ombú, Lajau, Estación Francia, Berá, Guidaí y Yaráy Guá.",
};

export default function VinosPage() {
  return (
    <>
      <section className="pt-32 pb-12 px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto text-center">
        <Reveal>
          <p className="font-body text-label-sm uppercase tracking-[0.3em] text-outline mb-4">
            Catálogo completo
          </p>
          <h1 className="font-display text-4xl md:text-display-lg text-primary mb-6">
            Nuestros vinos
          </h1>
          <p className="font-body text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            Una colección de expresiones auténticas, nacidas en nuestro viñedo
            boutique del Valle del Cachapoal. Cada botella cuenta la historia
            de nuestro patrimonio y nuestro terroir.
          </p>
        </Reveal>
      </section>

      {wineLines.map((line, lineIdx) => {
        const lineWines = wines.filter((w) => w.line === line);
        if (lineWines.length === 0) return null;

        return (
          <section
            key={line}
            className={`px-margin-mobile md:px-margin-desktop py-16 ${
              lineIdx % 2 === 0 ? "bg-surface" : "bg-surface-container-low"
            }`}
          >
            <div className="max-w-(--container-max) mx-auto">
              <Reveal className="mb-10 flex items-end justify-between gap-6 flex-wrap">
                <div>
                  <span className="font-body text-label-sm text-outline uppercase tracking-widest block mb-2">
                    Línea
                  </span>
                  <h2 className="font-display text-headline-h1 text-primary">{line}</h2>
                </div>
                <p className="font-body text-body-md text-on-surface-variant max-w-lg">
                  {lineDescriptions[line]}
                </p>
              </Reveal>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {lineWines.map((wine, idx) => (
                  <Reveal key={wine.slug} delay={idx * 80}>
                    <Link
                      href={`/vinos/${wine.slug}`}
                      className="group bg-surface-container-lowest rounded-xl overflow-hidden hover:bg-surface-container-low transition-colors duration-300 block h-full"
                    >
                      <div className="aspect-[3/4] relative overflow-hidden bg-surface-container p-8 flex items-center justify-center">
                        <Image
                          src={wine.image}
                          alt={`Botella ${wine.name}`}
                          fill
                          className="object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                        {wine.badge && (
                          <span className="absolute top-4 left-4 bg-primary text-on-primary px-3 py-1 text-label-sm uppercase tracking-wider rounded">
                            {wine.badge}
                          </span>
                        )}
                      </div>
                      <div className="p-6">
                        <span className="font-body text-label-sm text-on-surface-variant uppercase tracking-widest block mb-2">
                          {wine.variety} · {wine.category}
                        </span>
                        <h3 className="font-display text-2xl text-primary mb-3">
                          {wine.name}
                        </h3>
                        <p className="font-body text-body-md text-on-surface-variant line-clamp-2">
                          {wine.shortDescription}
                        </p>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}

const lineDescriptions: Record<string, string> = {
  Ombú: "Línea reserva: la cara más reconocible de la viña. Vinos para celebrar lo cotidiano.",
  Lajau: "Edición limitada y guarda: parcelas seleccionadas, producción acotada.",
  "Estación Francia": "Homenaje al lugar fundacional y al espíritu del Mundial '98.",
  Berá: "Cabernet Sauvignon de gran reserva: elegancia y estructura clásica.",
  Guidaí: "Edición limitada en honor al nombre charrúa de la luna.",
  "Yaráy Guá": "Línea fresca y frutal, accesible para el día a día.",
};
