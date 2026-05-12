import Image from "next/image";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Historia",
  description:
    "Tres generaciones de la familia Acosta en el Valle del Cachapoal. De Francia '98 al legado vitivinícola de hoy.",
};

const milestones = [
  {
    year: "1998",
    title: "El Sueño Comienza",
    description: "Nelson Acosta planta los primeros viñedos con una visión a largo plazo.",
    side: "left" as const,
  },
  {
    year: "2000",
    title: "Raíces Firmes",
    description: "Las primeras vides comienzan a mostrar el potencial único del suelo.",
    side: "right" as const,
  },
  {
    year: "2003",
    title: "Primera Producción",
    description: "Lanzamiento del aclamado Carmenere Reserva 'ACOSTA'.",
    side: "left" as const,
  },
  {
    year: "2012",
    title: "Expansión Sostenible",
    description: "Implementación de prácticas orgánicas y cuidado del medio ambiente.",
    side: "right" as const,
  },
  {
    year: "Hoy",
    title: "El Legado Continúa",
    description: "Damián Acosta lidera la nueva etapa, fiel a las raíces familiares.",
    side: "left" as const,
  },
];

const family = [
  {
    name: "Damián Acosta",
    role: "Cofundador",
    bio: "Heredero de la visión familiar, impulsando la innovación sin perder las raíces.",
    image:
      "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=800&q=70",
  },
  {
    name: "Andrea Leyton",
    role: "Event Planner",
    bio: "Creadora de experiencias memorables y anfitriona de nuestra casa.",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=70",
  },
  {
    name: "Enrique Pizarro",
    role: "Agrónomo",
    bio: "Guardián de la tierra, asegurando la máxima calidad desde la raíz.",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=70",
  },
  {
    name: "Alfonso Duarte",
    role: "Enólogo colaborador",
    bio: "El alquimista que traduce nuestro terroir en vinos de clase mundial.",
    image:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=70",
  },
];

export default function HistoriaPage() {
  return (
    <>
      <section className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto">
        <Reveal className="text-center mb-16">
          <p className="font-body text-label-sm uppercase tracking-[0.3em] text-outline mb-4">
            Nuestra herencia
          </p>
          <h1 className="font-display text-4xl md:text-display-lg text-primary mb-6 leading-tight">
            Pasión por la tierra,<br/>forjada generación a generación.
          </h1>
          <p className="font-body text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            La pasión por la tierra y el vino, transmitida en cada cosecha,
            define lo que somos en Viña Casa Acosta.
          </p>
        </Reveal>

        <Reveal className="relative rounded-xl overflow-hidden min-h-[500px] flex items-end p-8 mb-gutter">
          <Image
            src="https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=2000&q=75"
            alt="Viñedos al atardecer"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="relative z-10 glass-panel p-8 md:p-12 rounded-xl max-w-3xl ambient-shadow">
            <span className="font-body text-label-sm text-primary uppercase tracking-widest block mb-2">
              I · Sueño
            </span>
            <h2 className="font-display text-headline-h1 text-primary mb-4">
              El origen en Estación Francia
            </h2>
            <p className="font-body text-body-md text-on-surface leading-relaxed">
              La historia comienza con Nelson Acosta, un hombre con profundas
              raíces en la tierra y una visión inquebrantable. Criado cerca de
              la mítica Estación Francia, comprendió desde joven el lenguaje
              del suelo y el clima. En 1998 plantó los primeros viñedos,
              sentando las bases de un legado innegociable.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mt-12">
          <Reveal className="bg-surface-container-low rounded-xl p-8 md:p-12 border border-outline-variant/30">
            <span className="font-body text-label-sm text-primary uppercase tracking-widest block mb-2">
              II · La raíz de un sueño
            </span>
            <h3 className="font-display text-headline-h2 text-primary mb-4">
              Francia &apos;98 y el relevo
            </h3>
            <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
              La adquisición de la tierra fundacional coincidió con el espíritu
              del Mundial de Francia &apos;98. Hoy, su hijo Damián continúa el
              sueño, aportando una visión contemporánea sin renunciar a la
              tradición.
            </p>
          </Reveal>
          <Reveal className="bg-surface-container-low rounded-xl p-8 md:p-12 border border-outline-variant/30" delay={120}>
            <span className="font-body text-label-sm text-primary uppercase tracking-widest block mb-2">
              III · Artesanía
            </span>
            <h3 className="font-display text-headline-h2 text-primary mb-4">
              Primera producción
            </h3>
            <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
              Nuestro proceso sigue siendo celosamente manual. Este cuidado
              culminó en 2003 con la primera producción oficial: el aclamado
              Carmenere Reserva &lsquo;ACOSTA&rsquo;.
            </p>
          </Reveal>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="max-w-(--container-max) mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="font-display text-headline-h1 text-primary">Hitos del legado</h2>
          </Reveal>

          <div className="relative max-w-4xl mx-auto">
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-outline-variant md:-translate-x-1/2" />

            {milestones.map((m, idx) => (
              <Reveal
                key={m.year}
                delay={idx * 80}
                className={`relative flex items-center mb-12 ${
                  m.side === "right" ? "md:flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`hidden md:block w-1/2 ${
                    m.side === "left" ? "pr-12 text-right" : "pl-12 text-left"
                  }`}
                >
                  <h3 className="font-display text-headline-h2 text-primary">{m.year}</h3>
                </div>
                <div className="absolute left-4 md:left-1/2 w-3 h-3 rounded-full bg-primary md:-translate-x-1/2 ring-4 ring-surface-container-low" />
                <div
                  className={`ml-12 md:ml-0 md:w-1/2 ${
                    m.side === "left" ? "md:pl-12" : "md:pr-12 md:text-right"
                  }`}
                >
                  <div className="md:hidden mb-2">
                    <h3 className="font-display text-2xl text-primary">{m.year}</h3>
                  </div>
                  <div className="bg-surface p-6 rounded-xl border border-outline-variant/20 ambient-shadow inline-block w-full">
                    <span className="font-body text-label-sm text-primary uppercase tracking-wider">
                      {m.title}
                    </span>
                    <p className="font-body text-body-md text-on-surface mt-2">{m.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAMILIA */}
      <section className="py-section-gap px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto">
        <Reveal className="mb-12">
          <h2 className="font-display text-headline-h1 text-primary">Nuestra familia</h2>
          <p className="font-body text-body-md text-on-surface-variant mt-2">
            El equipo humano detrás de cada botella.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {family.map((person, idx) => (
            <Reveal key={person.name} delay={idx * 80}>
              <article className="bg-surface rounded-xl border border-outline-variant/20 overflow-hidden group h-full flex flex-col">
                <div className="relative aspect-[4/5] overflow-hidden bg-surface-container-high">
                  <Image
                    src={person.image}
                    alt={`Retrato de ${person.name}`}
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="font-display text-2xl text-primary">{person.name}</h3>
                  <span className="font-body text-label-sm text-on-surface-variant uppercase tracking-wider block mt-1">
                    {person.role}
                  </span>
                  <p className="font-body text-body-md text-on-surface mt-3 flex-grow">
                    {person.bio}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 text-xs text-on-surface-variant/70 text-center">
          Retratos de muestra · serán reemplazados por fotografías reales de la familia.
        </p>
      </section>
    </>
  );
}
