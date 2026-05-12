import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { getFeaturedWines } from "@/data/wines";

const heroImage =
  "https://images.unsplash.com/photo-1543418219-44e30b057fea?auto=format&fit=crop&w=2400&q=75";

const casaImage =
  "https://images.unsplash.com/photo-1514982506064-7a5f78fb5cf6?auto=format&fit=crop&w=1400&q=75";

const activities = [
  {
    name: "Tour",
    description: "Recorre nuestros viñedos históricos y nuestra bodega.",
    image:
      "https://images.unsplash.com/photo-1474722883778-792e7990302f?auto=format&fit=crop&w=1200&q=70",
    href: "/actividades#tours",
  },
  {
    name: "Eventos",
    description: "Celebra matrimonios y eventos en un entorno único.",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=70",
    href: "/actividades#eventos",
  },
  {
    name: "Experiencias",
    description: "Catas guiadas, vendimias y maridajes.",
    image:
      "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=70",
    href: "/actividades#experiencias",
  },
];

export default function HomePage() {
  const featured = getFeaturedWines();

  return (
    <>
      {/* HERO */}
      <section className="relative h-svh min-h-[640px] w-full flex items-center justify-center overflow-hidden">
        <Image
          src={heroImage}
          alt="Viñedos del Valle del Cachapoal al atardecer"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative z-10 text-center px-margin-mobile md:px-margin-desktop max-w-4xl mx-auto pt-20">
          <p className="font-body text-label-sm uppercase tracking-[0.3em] text-on-primary/80 mb-4 drop-shadow-md">
            San Vicente de Tagua Tagua · Valle del Cachapoal
          </p>
          <h1 className="font-display text-[40px] leading-[1.1] md:text-display-lg text-on-primary mb-6 drop-shadow-lg">
            Un tributo a la familia
          </h1>
          <p className="font-body text-body-lg text-on-primary/90 mb-10 max-w-2xl mx-auto drop-shadow-md">
            Donde la vida ha ido dando sus frutos con raíces firmes, para hacer
            crecer los sueños.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/tienda"
              className="glass-panel text-on-primary px-8 py-3 rounded font-body text-body-md hover:bg-white/25 transition-all duration-300 w-full sm:w-auto"
            >
              Tienda
            </Link>
            <Link
              href="/actividades"
              className="glass-panel text-on-primary px-8 py-3 rounded font-body text-body-md hover:bg-white/25 transition-all duration-300 w-full sm:w-auto"
            >
              Reservar visita
            </Link>
          </div>
        </div>
      </section>

      {/* CASA ACOSTA */}
      <section className="relative bg-surface py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="max-w-(--container-max) mx-auto grid grid-cols-1 md:grid-cols-12 gap-gutter items-center">
          <Reveal className="md:col-span-5 md:col-start-2 relative z-10 mb-12 md:mb-0">
            <div className="relative aspect-[4/5] rounded-lg overflow-hidden ambient-shadow">
              <Image
                src={casaImage}
                alt="Detalle del viñedo de Casa Acosta"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
            </div>
          </Reveal>
          <Reveal className="md:col-span-5 md:col-start-8" delay={120}>
            <span className="font-body text-label-sm text-outline uppercase tracking-widest block mb-3">
              Casa Acosta
            </span>
            <h2 className="font-display text-headline-h1 text-primary mb-6 leading-tight">
              Tres generaciones, un mismo origen.
            </h2>
            <p className="font-body text-body-md text-on-surface-variant mb-6 leading-relaxed">
              Casa Acosta es un tributo a la familia. Un espacio donde la vida ha
              ido dando sus frutos con raíces firmes en un territorio propicio
              para hacer crecer los sueños, respetando y fortaleciendo su origen.
            </p>
            <p className="font-body text-body-md text-on-surface-variant mb-8 leading-relaxed">
              Tu visita te conectará con un paisaje que surge del tesón, pasión y
              cepa de sangre uruguaya, convertida en generaciones nuevas
              dispuestas a seguir el trabajo de la tierra del Cachapoal.
            </p>
            <Link
              href="/historia"
              className="inline-flex items-center gap-2 text-primary font-body font-semibold border-b border-primary pb-1 hover:gap-3 transition-all"
            >
              Conocer nuestra historia
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* VINOS DESTACADOS */}
      <section className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="max-w-(--container-max) mx-auto">
          <Reveal className="text-center mb-16">
            <span className="font-body text-label-sm text-outline uppercase tracking-widest block mb-2">
              Nuestros vinos
            </span>
            <h2 className="font-display text-headline-h1 text-primary mb-4">
              Destacados
            </h2>
            <p className="font-body text-body-md text-on-surface-variant">
              Una selección recomendada para descubrir nuestro estilo.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {featured.map((wine, idx) => (
              <Reveal key={wine.slug} delay={idx * 100}>
                <Link
                  href={`/vinos/${wine.slug}`}
                  className="group block bg-surface rounded-lg p-6 ambient-shadow hover:-translate-y-1 transition-transform duration-300"
                >
                  <div className="aspect-[3/4] bg-surface-variant/40 rounded mb-6 flex items-center justify-center overflow-hidden relative">
                    <Image
                      src={wine.image}
                      alt={`Botella ${wine.name}`}
                      fill
                      className="object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    {wine.badge && (
                      <span className="absolute top-3 left-3 bg-primary text-on-primary px-3 py-1 text-label-sm uppercase tracking-wider rounded">
                        {wine.badge}
                      </span>
                    )}
                  </div>
                  <p className="font-body text-label-sm text-on-surface-variant uppercase tracking-widest mb-1">
                    Línea {wine.line}
                  </p>
                  <h3 className="font-display text-2xl text-primary mb-2">{wine.name}</h3>
                  <p className="font-body text-body-md text-on-surface-variant mb-4">
                    {wine.shortDescription}
                  </p>
                  <span className="inline-flex items-center gap-1 text-primary font-body font-semibold">
                    Ver detalles
                    <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link
              href="/vinos"
              className="inline-flex items-center gap-2 text-primary font-body font-semibold border-b border-primary pb-1 hover:gap-3 transition-all"
            >
              Ver toda la colección
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ACTIVIDADES */}
      <section className="bg-surface py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="max-w-(--container-max) mx-auto">
          <Reveal className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
            <div>
              <span className="font-body text-label-sm text-outline uppercase tracking-widest block mb-2">
                Las mejores
              </span>
              <h2 className="font-display text-headline-h1 text-primary mb-4">
                Actividades
              </h2>
              <p className="font-body text-body-md text-on-surface-variant max-w-md">
                Hay recuerdos que el tiempo no borra.
              </p>
            </div>
            <Link
              href="/actividades"
              className="text-primary font-body font-semibold border-b border-primary pb-1 hover:text-primary-container transition-colors"
            >
              Ver todas las actividades
            </Link>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {activities.map((a, idx) => (
              <Reveal key={a.name} delay={idx * 100}>
                <Link
                  href={a.href}
                  className="group relative block rounded-lg overflow-hidden aspect-[4/5] ambient-shadow"
                >
                  <Image
                    src={a.image}
                    alt={a.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-8 w-full">
                    <h3 className="font-display text-3xl text-on-primary mb-2">
                      {a.name}
                    </h3>
                    <p className="font-body text-body-md text-on-primary/80 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                      {a.description}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA CONTACTO */}
      <section className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="max-w-(--container-max) mx-auto bg-primary text-on-primary rounded-xl px-8 md:px-16 py-16 md:py-24 text-center ambient-shadow">
          <Reveal>
            <h2 className="font-display text-headline-h1 mb-6">
              Visítanos en el Cachapoal
            </h2>
            <p className="font-body text-body-lg text-on-primary/85 max-w-2xl mx-auto mb-10">
              Te recibimos con la calidez de la familia. Reserva tu visita y
              recorramos juntos el origen de cada botella.
            </p>
            <Link
              href="/contacto"
              className="inline-block bg-on-primary text-primary px-8 py-3 rounded font-body font-semibold hover:bg-primary-fixed transition-colors"
            >
              Reservar visita
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
