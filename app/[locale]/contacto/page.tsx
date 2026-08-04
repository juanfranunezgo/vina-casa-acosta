import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowUpRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import Reveal from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";
import MapEmbed from "@/components/MapEmbed";
import { alternatesFor } from "@/lib/alternates";
import { jsonLdHtml } from "@/lib/jsonLd";
import { buildContactoJsonLd } from "@/lib/siteJsonLd";
import {
  CONTACT_EMAIL,
  CONTACT_MAILTO_URL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_WHATSAPP_URL,
} from "@/lib/contact";

const mapsUrl =
  "https://www.google.com/maps/search/?api=1&query=Fundo+El+Llano+lote+6,+San+Vicente+de+Tagua+Tagua,+O%27Higgins,+Chile";

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />

      <section className="mx-auto max-w-(--container-max) px-margin-mobile pb-12 pt-32 text-center md:px-margin-desktop">
        <Reveal>
          <p className="mb-2 font-accent text-xl font-light italic text-primary md:text-2xl">
            {t("hero.eyebrow")}
          </p>
          <h1
            className="mb-6 font-display text-primary"
            style={{ fontSize: "clamp(2.25rem, 5.5vw, 4rem)", lineHeight: 1.08 }}
          >
            {t("hero.title")}
          </h1>
          <p className="mx-auto max-w-2xl font-body text-body-lg text-on-surface-variant">
            {t("hero.subtitle")}
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-(--container-max) px-margin-mobile pb-section-gap md:px-margin-desktop">
        <div className="grid overflow-hidden rounded-2xl bg-surface ambient-shadow-lg ring-1 ring-outline-variant/40 md:grid-cols-2">
          <div className="p-7 md:p-12 lg:p-16">
            <ContactForm />
          </div>
          <MapEmbed
            title={t("mapTitle")}
            src="https://www.google.com/maps?q=Fundo+El+Llano+lote+6,+San+Vicente+de+Tagua+Tagua,+O%27Higgins,+Chile&output=embed"
          />
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
