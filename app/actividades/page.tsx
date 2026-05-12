import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import { tours, experiences } from "@/data/activities";
import { formatCLP } from "@/data/wines";

export const metadata: Metadata = {
  title: "Actividades",
  description:
    "Tours guiados por nuestros viñedos, experiencias estacionales y eventos privados en Viña Casa Acosta, Cachapoal.",
};

export default function ActividadesPage() {
  return (
    <>
      <section className="pt-32 pb-12 px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto text-center">
        <Reveal>
          <p className="font-body text-label-sm uppercase tracking-[0.3em] text-outline mb-4">
            Hay recuerdos que el tiempo no borra
          </p>
          <h1 className="font-display text-4xl md:text-display-lg text-primary mb-6">
            Actividades
          </h1>
          <p className="font-body text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10">
            Sumérgete en el mundo del vino. Explora nuestros viñedos, degusta
            nuestras mejores creaciones y celebra en un entorno de calidez y
            patrimonio.
          </p>
          <nav className="flex flex-col md:flex-row justify-center gap-6">
            <a href="#tours" className="text-primary font-body font-semibold uppercase tracking-wider border-b border-primary pb-1">Tours</a>
            <a href="#experiencias" className="text-primary font-body font-semibold uppercase tracking-wider border-b border-primary pb-1">Experiencias</a>
            <a href="#eventos" className="text-primary font-body font-semibold uppercase tracking-wider border-b border-primary pb-1">Eventos</a>
          </nav>
        </Reveal>
      </section>

      {/* TOURS */}
      <section id="tours" className="py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="max-w-(--container-max) mx-auto">
          <Reveal className="mb-12 md:w-2/3">
            <h2 className="font-display text-headline-h1 text-primary mb-4">
              Nuestros tours
            </h2>
            <p className="font-body text-body-md text-on-surface-variant">
              Descubre el alma de Viña Casa Acosta a través de recorridos
              personalizados. Cada tour está diseñado para ofrecer una
              experiencia íntima y educativa.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-12">
            {tours.map((tour, idx) => (
              <Reveal key={tour.slug} delay={idx * 100}>
                <article
                  className={`bg-surface-container-low rounded-lg overflow-hidden group h-full flex flex-col ${
                    idx === 1 ? "md:-mt-8" : ""
                  }`}
                >
                  <div className="relative h-64 overflow-hidden">
                    <Image
                      src={tour.image}
                      alt={tour.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-4 gap-3">
                      <h3 className="font-display text-2xl text-primary">{tour.name}</h3>
                      <span className="shrink-0 font-body text-label-sm text-on-surface-variant bg-surface-container-high px-2 py-1 rounded uppercase tracking-wider">
                        {formatCLP(tour.priceCLP)}
                      </span>
                    </div>
                    <p className="font-body text-body-md text-on-surface-variant mb-4 flex-grow">
                      {tour.description}
                    </p>
                    <ul className="space-y-1 mb-6">
                      {tour.highlights.map((h) => (
                        <li
                          key={h}
                          className="font-body text-body-md text-on-surface flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-primary text-sm">check</span>
                          {h}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/contacto?asunto=tour"
                      className={`block w-full text-center py-3 rounded font-body font-semibold transition-colors ${
                        tour.premium
                          ? "bg-primary-container text-on-primary hover:bg-primary shadow-[0_4px_14px_rgba(74,14,14,0.15)]"
                          : "border border-outline text-primary hover:bg-surface-container-high"
                      }`}
                    >
                      Reservar {tour.premium ? "premium" : "tour"}
                    </Link>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal className="glass-panel rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6 border border-outline-variant/30">
            <div className="flex items-start gap-4 flex-1">
              <span className="material-symbols-outlined text-primary text-4xl">schedule</span>
              <div>
                <h4 className="font-body font-semibold text-label-sm uppercase tracking-wider text-primary mb-1">
                  Horarios
                </h4>
                <p className="font-body text-body-md text-on-surface">Lunes a sábado · 10:00 – 18:00 hrs</p>
                <p className="font-body text-body-md text-on-surface">Jueves · 10:00 – 20:00 (horario extendido)</p>
              </div>
            </div>
            <div className="flex items-start gap-4 flex-1 border-t md:border-t-0 md:border-l border-outline-variant/50 pt-6 md:pt-0 md:pl-6">
              <span className="material-symbols-outlined text-primary text-4xl">group</span>
              <div>
                <h4 className="font-body font-semibold text-label-sm uppercase tracking-wider text-primary mb-1">
                  Domingos y feriados
                </h4>
                <p className="font-body text-body-md text-on-surface">Solo con reserva previa · mínimo 6 personas.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* EXPERIENCIAS */}
      <section id="experiencias" className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="max-w-(--container-max) mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="font-display text-headline-h1 text-primary mb-4">
              Experiencias especiales
            </h2>
            <p className="font-body text-body-md text-on-surface-variant max-w-2xl mx-auto">
              Acompaña el ciclo de la vid y celebra fechas importantes con
              nosotros. Experiencias temporales a lo largo del año.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {experiences.map((exp, idx) => (
              <Reveal key={exp.slug} delay={idx * 100}>
                <article className="relative h-80 rounded-lg overflow-hidden group cursor-pointer">
                  <Image
                    src={exp.image}
                    alt={exp.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/30 to-transparent flex flex-col justify-end p-6">
                    <span className="font-body text-label-sm text-white/80 uppercase tracking-wider mb-2">
                      {exp.badge}
                    </span>
                    <h3 className="font-display text-2xl text-white">{exp.name}</h3>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* EVENTOS */}
      <section id="eventos" className="py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="max-w-(--container-max) mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <p className="font-body text-label-sm uppercase tracking-[0.3em] text-outline mb-4">
              Eventos privados
            </p>
            <h2 className="font-display text-headline-h1 text-primary mb-6">
              Celebra entre nuestros viñedos
            </h2>
            <p className="font-body text-body-md text-on-surface-variant leading-relaxed mb-6">
              Matrimonios, eventos corporativos y celebraciones privadas en un
              entorno único del Valle del Cachapoal. Te ayudamos a diseñar la
              experiencia de principio a fin.
            </p>
            <ul className="space-y-3 font-body text-body-md text-on-surface mb-8">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">check_circle</span>
                Capacidad hasta 200 invitados
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">check_circle</span>
                Catering y maridajes personalizados
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">check_circle</span>
                Coordinación completa con Andrea, nuestra event planner
              </li>
            </ul>
            <Link
              href="/contacto?asunto=evento"
              className="inline-flex items-center gap-2 bg-primary-container text-on-primary px-8 py-3 rounded font-body font-semibold hover:bg-primary transition-colors"
            >
              Cotizar mi evento
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative aspect-[4/5] rounded-xl overflow-hidden ambient-shadow">
              <Image
                src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=70"
                alt="Mesa larga con vista al viñedo preparada para evento"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
