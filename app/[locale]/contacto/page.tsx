import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapPin, Clock, Mail } from "lucide-react";
import Reveal from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";
import MapEmbed from "@/components/MapEmbed";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contacto">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.contacto" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function ContactoPage({
  params,
}: PageProps<"/[locale]/contacto">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contacto");

  return (
    <>
      <section className="pt-32 pb-12 px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto text-center">
        <Reveal>
          <p className="font-body text-label-sm uppercase tracking-[0.3em] text-outline mb-4">
            {t("hero.eyebrow")}
          </p>
          <h1
            className="font-display text-primary mb-6"
            style={{
              fontSize: "clamp(2.25rem, 5.5vw, 4rem)",
              lineHeight: 1.08,
            }}
          >
            {t("hero.title")}
          </h1>
          <p className="font-body text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            {t("hero.subtitle")}
          </p>
        </Reveal>
      </section>

      <section className="pb-section-gap px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto">
        <div className="bg-surface rounded-xl ambient-shadow overflow-hidden grid grid-cols-1 md:grid-cols-2">
          <div className="p-8 md:p-12 lg:p-16">
            <ContactForm />
          </div>

          <MapEmbed
            title={t("mapTitle")}
            src="https://www.google.com/maps?q=San+Vicente+de+Tagua+Tagua,+Chile&output=embed"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mt-12">
          <Reveal className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/30 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-12px_rgba(74,14,14,0.1)] transition-all duration-300">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h3 className="font-display text-xl text-primary mb-2">{t("cards.location.title")}</h3>
            <p className="font-body text-body-md text-on-surface-variant">
              {t("cards.location.body")}
            </p>
          </Reveal>
          <Reveal
            className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/30 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-12px_rgba(74,14,14,0.1)] transition-all duration-300"
            delay={80}
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h3 className="font-display text-xl text-primary mb-2">{t("cards.hours.title")}</h3>
            <p className="font-body text-body-md text-on-surface-variant whitespace-pre-line">
              {t("cards.hours.body")}
            </p>
          </Reveal>
          <Reveal
            className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/30 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-12px_rgba(74,14,14,0.1)] transition-all duration-300"
            delay={160}
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h3 className="font-display text-xl text-primary mb-2">{t("cards.email.title")}</h3>
            <a
              href="mailto:contacto@vinacasaacosta.cl"
              className="font-body text-body-md text-on-surface-variant hover:text-primary transition-colors"
            >
              {t("cards.email.body")}
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
