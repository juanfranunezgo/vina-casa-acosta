import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Reveal from "@/components/Reveal";
import { alternatesFor } from "@/lib/alternates";
import { buildStaffJsonLd } from "@/lib/siteJsonLd";
import JsonLd from "@/components/JsonLd";

// Cada persona es una fila editorial: foto grande + texto, alternando lados.
// `image`: retrato real. `pos`: object-position para encuadrar bien el rostro
// según cada foto.
//
// PENDIENTE: los originales de Andrea (591×1280) y Alfonso (800×650, horizontal)
// llegaron en baja resolución; el slot mide ~650×810 en desktop, así que quedan
// algo blandos. Reemplazar por versiones ≥1600px de ancho cuando lleguen.
const staffMembers = [
  { key: "damian", image: "/images/staff/damian.webp", pos: "50% 18%" },
  { key: "andrea", image: "/images/staff/andrea.webp", pos: "50% 15%" },
  { key: "enrique", image: "/images/staff/enrique.webp", pos: "50% 16%" },
  // Foto horizontal: el 62% horizontal centra el rostro en el recorte 4:5.
  { key: "alfonso", image: "/images/staff/alfonso.webp", pos: "62% 50%" },
] as const;

// El hero E1 va en <picture> y no en next/image, porque next/image no hace art
// direction: elige a qué tamaño bajar una foto, no cuál de dos. Mismo mecanismo
// que el resto de los heros del sitio — ver scripts/optimize-heros.mjs.
const heroSources = {
  desktop: [
    "/images/staff/hero-caja-uvas-1280.webp 1280w",
    "/images/staff/hero-caja-uvas-1920.webp 1920w",
    "/images/staff/hero-caja-uvas-2560.webp 2560w",
  ].join(", "),
  movil: [
    "/images/staff/hero-caja-uvas-movil-828.webp 828w",
    "/images/staff/hero-caja-uvas-movil-1125.webp 1125w",
  ].join(", "),
};

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/staff">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.staff" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: alternatesFor(locale, "/staff"),
  };
}

export default async function StaffPage({
  params,
}: PageProps<"/[locale]/staff">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("staff");

  // Las personas del equipo como entidades. Se arma desde `staffMembers`, la
  // misma lista que dibuja la pagina, para que no puedan existir en el marcado
  // personas que la pagina no muestra —ni al reves—.
  const tMeta = await getTranslations("metadata.staff");
  const jsonLd = buildStaffJsonLd(
    locale,
    { name: tMeta("title"), description: tMeta("description") },
    staffMembers.map((person) => ({
      key: person.key,
      name: t(`members.${person.key}.name`),
      role: t(`members.${person.key}.role`),
      bio: t(`members.${person.key}.bio`),
      image: person.image,
    })),
  );

  return (
    <>
      <JsonLd data={jsonLd} />
      {/* E1 — Hero cinematográfico, en el mismo lenguaje que Historia y Vinos.
          La página era la última con un encabezado de sólo texto sobre papel,
          así que llegar a Staff se sentía como salir del sitio. La foto es la
          del temporero dejando la caja: el eyebrow habla de las manos detrás de
          la viña y acá se ven. */}
      <section className="relative flex min-h-[100svh] w-full items-center overflow-hidden">
        {/* Dos encuadres: el 3:2 de siempre y un 9:16 para pantallas verticales.
            `sizes` lleva el alto del viewport porque con object-cover en vertical
            la foto se estira hasta cubrir el alto, y ese ancho estirado —no el
            del contenedor— es el que hay que descargar. */}
        <picture className="absolute inset-0">
          <source
            media="(min-aspect-ratio: 3/4)"
            srcSet={heroSources.desktop}
            sizes="(max-aspect-ratio: 3/2) 150vh, 100vw"
          />
          <source srcSet={heroSources.movil} sizes="(max-aspect-ratio: 9/16) 56.25vh, 100vw" />
          <img
            src="/images/staff/hero-caja-uvas-1920.webp"
            alt={t("hero.imageAlt")}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-center motion-safe:animate-[heroZoom_20s_ease-out_forwards]"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />

        <div className="relative z-10 w-full px-margin-mobile pb-24 pt-24 md:px-margin-desktop lg:pl-20">
          <div data-hero-text className="mx-auto max-w-2xl text-center md:mx-0 md:text-left">
            <p className="mb-4 font-accent text-lg font-light italic tracking-wide text-primary-fixed drop-shadow-md md:text-xl">
              {t("hero.eyebrow")}
            </p>
            <h1
              className="mb-6 font-display text-on-primary drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]"
              style={{
                fontSize: "clamp(2.25rem, 6.4vw, 4.5rem)",
                lineHeight: 1.14,
                letterSpacing: "-0.015em",
              }}
            >
              {t("hero.title")}
            </h1>
            {/* La bajada reserva dos líneas aunque escriba una.
                El bloque va centrado en el alto de la pantalla, así que su
                altura decide dónde cae el título: con una bajada de una línea
                —"El equipo humano detrás de cada botella."— el bloque medía 32px
                menos que el de Historia o Vinos y el título aparecía 16px más
                abajo, que al cambiar de página se nota. Reservando la segunda
                línea los tres heros dejan el título a la misma altura, en
                cualquier alto de pantalla. */}
            <p
              className="mx-auto max-w-xl font-body text-on-primary/90 drop-shadow-md md:mx-0"
              style={{
                fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
                lineHeight: 1.6,
                minHeight: "3.2em",
              }}
            >
              {t("hero.subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* E2 — Las cuatro filas del equipo. */}
      <section className="max-w-(--container-max) mx-auto px-margin-mobile md:px-margin-desktop py-section-gap">
        <div className="space-y-20 md:space-y-28">
          {staffMembers.map((person, idx) => {
            const reversed = idx % 2 === 1; // foto a la derecha en filas impares
            const name = t(`members.${person.key}.name`);
            return (
              <Reveal
                key={person.key}
                className="grid md:grid-cols-2 gap-8 md:gap-14 lg:gap-20 items-center"
              >
                {/* El retrato iba con un canto "cosido" —una tira de guiones
                    vino en el borde exterior, guiño al boceto original—. Se
                    quitó: era la única textura de ese tipo en el sitio y con la
                    foto a sangre ya no hacía falta un marco que la sostuviera. */}
                <figure
                  className={`group relative aspect-[4/5] overflow-hidden rounded-2xl ambient-shadow-lg bg-surface-container-low ${
                    reversed ? "md:order-2" : "md:order-1"
                  }`}
                >
                  <Image
                    src={person.image}
                    alt={name}
                    fill
                    className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-[1.04]"
                    style={{ objectPosition: person.pos }}
                    sizes="(max-width: 768px) 100vw, 45vw"
                  />
                </figure>

                <div
                  className={`flex flex-col justify-center ${
                    reversed ? "md:order-1" : "md:order-2"
                  }`}
                >
                  <span className="font-body text-label-sm text-wine-accent uppercase tracking-widest mb-3">
                    {t(`members.${person.key}.role`)}
                  </span>
                  <h2
                    className="font-display text-primary leading-tight"
                    style={{ fontSize: "clamp(1.9rem, 3.5vw, 3rem)" }}
                  >
                    {name}
                  </h2>
                  <div className="w-14 h-px bg-outline-variant/50 my-6" />
                  <p className="font-body text-body-md text-on-surface-variant leading-relaxed max-w-[62ch]">
                    {t(`members.${person.key}.bio`)}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>
    </>
  );
}
