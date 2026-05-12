import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import AddToCartButton from "@/components/AddToCartButton";
import { wines, getWineBySlug, formatCLP } from "@/data/wines";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return wines.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const wine = getWineBySlug(slug);
  if (!wine) return { title: "Vino no encontrado" };
  return {
    title: wine.name,
    description: wine.shortDescription,
  };
}

export default async function WinePage({ params }: Props) {
  const { slug } = await params;
  const wine = getWineBySlug(slug);
  if (!wine) notFound();

  const related = wines.filter((w) => w.line === wine.line && w.slug !== wine.slug).slice(0, 3);

  return (
    <>
      <section className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto">
        <Link
          href="/vinos"
          className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary font-body transition-colors mb-10"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Toda la colección
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          <Reveal>
            <div className="relative aspect-[3/4] bg-surface-container rounded-xl overflow-hidden">
              <Image
                src={wine.image}
                alt={`Botella ${wine.name}`}
                fill
                className="object-contain p-12"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
              {wine.badge && (
                <span className="absolute top-6 left-6 bg-primary text-on-primary px-3 py-1.5 text-label-sm uppercase tracking-wider rounded">
                  {wine.badge}
                </span>
              )}
            </div>
          </Reveal>

          <Reveal delay={120} className="md:pt-8">
            <p className="font-body text-label-sm uppercase tracking-[0.3em] text-outline mb-3">
              Línea {wine.line} · {wine.category}
            </p>
            <h1 className="font-display text-4xl md:text-5xl text-primary mb-3 leading-tight">
              {wine.name}
            </h1>
            <p className="font-body text-body-lg text-on-surface-variant mb-6">
              {wine.variety} · Cosecha {wine.vintage}
            </p>

            <p className="font-body text-body-md text-on-surface leading-relaxed mb-8">
              {wine.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
              <div>
                <h3 className="font-body text-label-sm uppercase tracking-widest text-primary mb-3">
                  Notas de cata
                </h3>
                <ul className="space-y-1.5 font-body text-body-md text-on-surface-variant">
                  {wine.tastingNotes.map((note) => (
                    <li key={note} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-body text-label-sm uppercase tracking-widest text-primary mb-3">
                  Maridaje
                </h3>
                <ul className="space-y-1.5 font-body text-body-md text-on-surface-variant">
                  {wine.pairings.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-sm">restaurant</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-outline-variant/40 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <span className="font-display text-3xl text-primary">{formatCLP(wine.priceCLP)}</span>
                <span className="font-body text-body-md text-on-surface-variant ml-2">CLP</span>
              </div>
              <AddToCartButton
                item={{
                  slug: wine.slug,
                  name: wine.name,
                  line: wine.line,
                  variety: wine.variety,
                  image: wine.image,
                  priceCLP: wine.priceCLP,
                }}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop">
          <div className="max-w-(--container-max) mx-auto">
            <Reveal className="mb-12">
              <h2 className="font-display text-headline-h2 text-primary">
                También de la línea {wine.line}
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
              {related.map((r, idx) => (
                <Reveal key={r.slug} delay={idx * 80}>
                  <Link
                    href={`/vinos/${r.slug}`}
                    className="group block bg-surface rounded-xl overflow-hidden hover:-translate-y-1 transition-transform duration-300"
                  >
                    <div className="aspect-[3/4] relative bg-surface-container">
                      <Image
                        src={r.image}
                        alt={r.name}
                        fill
                        className="object-contain p-8 group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="font-display text-xl text-primary mb-1">{r.name}</h3>
                      <p className="font-body text-body-md text-on-surface-variant">
                        {r.variety}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
