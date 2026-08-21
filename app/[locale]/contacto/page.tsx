import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowUpRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import Reveal from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";
import MapEmbed from "@/components/MapEmbed";
import { alternatesFor } from "@/lib/alternates";
import JsonLd from "@/components/JsonLd";
import { buildContactoJsonLd } from "@/lib/siteJsonLd";
import {
  CONTACT_EMAIL,
  CONTACT_MAILTO_URL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_WHATSAPP_URL,
} from "@/lib/contact";

/**
 * Enlace corto de la ficha de Google de la viña: abre el lugar con su nombre,
 * sus fotos y sus reseñas. Antes era una búsqueda por texto de la dirección, que
 * depende de que el buscador acierte con el fundo.
 */
const mapsUrl = "https://maps.app.goo.gl/2EAjVCjMTFMhj5A59";

/**
 * El embed va por coordenadas y no por la dirección escrita, por lo mismo: son
 * las de la ficha —`@-34.4651334,-71.0096746`, las mismas que declara el
 * `LocalBusiness` de `lib/siteJsonLd.ts`— y no dependen de cómo se escriba
 * "Fundo El Llano lote 6".
 */
const mapEmbedSrc =
  "https://maps.google.com/maps?q=-34.4651334,-71.0096746&z=16&output=embed";

/**
 * El hero E1 va en <picture> y no en next/image, porque next/image no hace art
 * direction: elige a qué tamaño bajar una foto, no cuál de dos. Mismo mecanismo
 * que el resto de los heros del sitio — ver `scripts/optimize-heros.mjs`.
 *
 * Los candidatos llegan hasta 1920px (desktop) y 750px (móvil) porque el master
 * mide 2000px de ancho: es la foto que ya vivía en el repo, no hay original
 * suelto. Prometer un `1920w` que la foto no tiene sería peor que servir esto.
 */
const heroSources = {
  desktop: [
    "/images/contacto/hero-mesa-larga-1280.webp 1280w",
    "/images/contacto/hero-mesa-larga-1920.webp 1920w",
  ].join(", "),
  movil: "/images/contacto/hero-mesa-larga-movil-750.webp 750w",
};

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contacto">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.contacto" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: alternatesFor(locale, "/contacto"),
  };
}

export default async function ContactoPage({
  params,
}: PageProps<"/[locale]/contacto">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contacto");
  const tMeta = await getTranslations("metadata.contacto");

  const jsonLd = buildContactoJsonLd(locale, {
    name: tMeta("title"),
    description: tMeta("description"),
  });

  const galleryImages = [
    { src: "/images/contacto/plato-cena.webp", alt: t("gallery.photoAlts.plato") },
    { src: "/images/contacto/cena.webp", alt: t("gallery.photoAlts.cena") },
    { src: "/images/contacto/asado.webp", alt: t("gallery.photoAlts.asado") },
    { src: "/images/contacto/letrero.webp", alt: t("gallery.photoAlts.letrero") },
  ];

  return (
    <>
      {/* ContactPage + la entidad de la viña: es la página que publica la
          dirección y el horario que el schema declara. Ver lib/siteJsonLd.ts. */}
      <JsonLd data={jsonLd} />

      {/* HERO (E1) — cinematográfico, en el mismo lenguaje que Historia, Vinos y
          Staff. Era el último encabezado de sólo texto sobre papel junto con el
          de la Tienda, y llegar acá desde cualquier otra página se sentía como
          salir del sitio. La foto es la cena en la mesa larga: la página pide
          reservar una visita y cotizar un evento, y esto es exactamente un
          evento. Al navbar hay que avisarle aparte — ver `hasDarkHero` en
          `components/Navbar.tsx`, que en Staff se olvidó y dejó texto oscuro
          sobre foto oscura. */}
      <section className="relative flex min-h-[100svh] w-full items-center overflow-hidden">
        {/* Dos encuadres: el 3:2 del master y un 9:16 recortado de él para
            pantallas verticales. `sizes` lleva el alto del viewport porque con
            object-cover en vertical la foto se estira hasta cubrir el alto, y
            ese ancho estirado —no el del contenedor— es el que hay que bajar. */}
        <picture className="absolute inset-0">
          <source
            media="(min-aspect-ratio: 3/4)"
            srcSet={heroSources.desktop}
            sizes="(max-aspect-ratio: 3/2) 150vh, 100vw"
          />
          <source srcSet={heroSources.movil} sizes="(max-aspect-ratio: 9/16) 56.25vh, 100vw" />
          <img
            src="/images/contacto/hero-mesa-larga-1920.webp"
            alt={t("hero.imageAlt")}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-center motion-safe:animate-[heroZoom_20s_ease-out_forwards]"
          />
        </picture>
        {/* Los velos van más suaves que en los otros heros: la foto es de noche
            y ya trae su propia oscuridad. Con el `from-black/70` de Staff, las
            copas y las luces del fondo —lo único que se ve— se apagaban. */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
        {/* El velo vertical se oscurece al medio sólo en celular: ahí el texto va
            centrado y cae encima de las copas iluminadas, que es lo más claro de
            la foto. En escritorio el texto se corre a la izquierda, donde ya lo
            cubre el velo lateral, y ensuciar el centro apagaría la mesa. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/25 to-black/30 md:via-transparent" />

        <div className="relative z-10 w-full px-margin-mobile pb-24 pt-24 md:px-margin-desktop lg:pl-20">
          <div data-hero-text className="mx-auto max-w-2xl text-center md:mx-0 md:text-left">
            <Reveal delay={120}>
              <p className="mb-4 font-accent text-lg font-light italic tracking-wide text-primary-fixed drop-shadow-md md:text-xl">
                {t("hero.eyebrow")}
              </p>
            </Reveal>
            <Reveal delay={220}>
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
            </Reveal>
            <Reveal delay={320}>
              {/* Misma medida que el resto de los heros (ver la nota del de
                  Staff): el bloque va centrado en el alto de la pantalla, así
                  que su altura decide dónde cae el título. */}
              <p
                className="mx-auto max-w-xl font-body text-on-primary/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] md:mx-0"
                style={{
                  fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
                  lineHeight: 1.6,
                  minHeight: "3.2em",
                }}
              >
                {t("hero.subtitle")}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-(--container-max) px-margin-mobile py-section-gap md:px-margin-desktop">
        <div className="grid overflow-hidden rounded-2xl bg-surface ambient-shadow-lg ring-1 ring-outline-variant/40 md:grid-cols-2">
          <div className="p-7 md:p-12 lg:p-16">
            <ContactForm />
          </div>
          <MapEmbed title={t("mapTitle")} src={mapEmbedSrc} />
        </div>

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <Reveal className="border-y border-primary/20">
            <div className="py-7 md:py-9">
              <p className="mb-2 font-accent text-xl font-light italic text-primary md:text-2xl">
                {t("gallery.eyebrow")}
              </p>
              <h2 className="max-w-md font-display text-4xl leading-[0.96] text-primary md:text-5xl">
                {t("gallery.title")}
              </h2>
            </div>

            <dl className="border-t border-primary/15">
              <div className="grid grid-cols-[1.5rem_1fr] gap-x-3 border-b border-primary/15 py-5">
                <MapPin className="mt-0.5 h-5 w-5 text-wine-accent" aria-hidden="true" />
                <div>
                  <dt className="font-body text-label-sm font-semibold uppercase tracking-wider text-wine-accent">
                    {t("cards.location.title")}
                  </dt>
                  <dd className="mt-1 font-body text-body-md leading-relaxed text-on-surface-variant">
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-baseline gap-1.5 transition-colors hover:text-primary"
                    >
                      <span>{t("cards.location.body")}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                    </a>
                  </dd>
                </div>
              </div>

              <div className="grid grid-cols-[1.5rem_1fr] gap-x-3 border-b border-primary/15 py-5">
                <Clock className="mt-0.5 h-5 w-5 text-wine-accent" aria-hidden="true" />
                <div>
                  <dt className="font-body text-label-sm font-semibold uppercase tracking-wider text-wine-accent">
                    {t("cards.hours.title")}
                  </dt>
                  <dd className="mt-1 whitespace-pre-line font-body text-body-md leading-relaxed text-on-surface-variant">
                    {t("cards.hours.body")}
                  </dd>
                </div>
              </div>

              <div className="grid grid-cols-[1.5rem_1fr] gap-x-3 border-b border-primary/15 py-5">
                <Phone className="mt-0.5 h-5 w-5 text-wine-accent" aria-hidden="true" />
                <div>
                  <dt className="font-body text-label-sm font-semibold uppercase tracking-wider text-wine-accent">
                    {t("cards.phone.title")}
                  </dt>
                  <dd className="mt-1 font-body text-body-md leading-relaxed text-on-surface-variant">
                    <a
                      href={CONTACT_WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-baseline gap-1.5 transition-colors hover:text-primary"
                    >
                      <span>{CONTACT_PHONE_DISPLAY}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                    </a>
                  </dd>
                </div>
              </div>

              <div className="grid grid-cols-[1.5rem_1fr] gap-x-3 py-5">
                <Mail className="mt-0.5 h-5 w-5 text-wine-accent" aria-hidden="true" />
                <div>
                  <dt className="font-body text-label-sm font-semibold uppercase tracking-wider text-wine-accent">
                    {t("cards.email.title")}
                  </dt>
                  <dd className="mt-1 font-body text-body-md leading-relaxed text-on-surface-variant">
                    <a
                      href={CONTACT_MAILTO_URL}
                      className="group inline-flex items-baseline gap-1.5 break-all transition-colors hover:text-primary"
                    >
                      <span>{CONTACT_EMAIL}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                    </a>
                  </dd>
                </div>
              </div>
            </dl>
          </Reveal>

          <div className="grid grid-cols-2 gap-3 md:gap-5">
            {galleryImages.map((image, index) => (
              <Reveal
                as="figure"
                key={image.src}
                delay={index * 75}
                className="relative m-0 aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-surface"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 1023px) 50vw, 35vw"
                  className="object-cover"
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
