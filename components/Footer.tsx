import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { MapPin, Clock, Mail, Phone, Star } from "lucide-react";
import FacebookIcon from "@/components/icons/FacebookIcon";
import InstagramIcon from "@/components/icons/InstagramIcon";
import { DOCUMENTOS_LEGALES } from "@/lib/legal";
import {
  CONTACT_EMAIL,
  CONTACT_MAILTO_URL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_WHATSAPP_URL,
  FACEBOOK_URL,
  INSTAGRAM_URL,
} from "@/lib/contact";

const socialLinks = [
  { href: INSTAGRAM_URL, key: "instagram" as const, Icon: InstagramIcon },
  { href: FACEBOOK_URL, key: "facebook" as const, Icon: FacebookIcon },
  { href: "https://maps.app.goo.gl/oWWNuFKGuqojD86B9", key: "google" as const, Icon: Star },
];

export default async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const locale = await getLocale();
  const year = new Date().getFullYear();
  const lp = (path: string) => `/${locale}${path}`;

  // Los tres documentos legales existen sólo en español, y en /en y /pt la
  // etiqueta se queda en texto a propósito: enlazar un PDF que el visitante no
  // puede leer promete algo que no se cumple. Cuando haya traducción, se agrega
  // su archivo a `DOCUMENTOS_LEGALES` bajo el idioma que corresponda y el enlace
  // aparece solo.
  //
  // "Mapa de Sitio" se quitó el 2026-08-18: era la única etiqueta que no
  // llevaba a ninguna parte. El sitemap que importa —el que leen los buscadores—
  // lo emite `app/sitemap.ts` y no necesita un enlace en el pie.
  const docs: Partial<Record<string, string>> = DOCUMENTOS_LEGALES[locale] ?? {};
  const legalItems = [
    { label: t("legal.privacy"), href: docs.privacy },
    { label: t("legal.terms"), href: docs.terms },
    { label: t("legal.cookies"), href: docs.cookies },
  ];

  return (
    <footer className="w-full border-t border-outline-variant/40 bg-surface-container-low">
      <div className="max-w-(--container-max) mx-auto px-margin-mobile md:px-margin-desktop pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-gutter">
          <div className="md:col-span-5">
            <Link
              href={lp("")}
              className="inline-flex items-center gap-4 leading-none"
              aria-label="Viña Casa Acosta — Inicio"
            >
              <Image
                src="/brand/logo-negro.webp"
                alt=""
                width={200}
                height={200}
                className="h-20 w-auto"
                sizes="80px"
              />
              <span
                aria-hidden="true"
                className="font-display text-primary text-2xl leading-tight tracking-tight"
              >
                Viña Casa Acosta
              </span>
            </Link>
            <p className="mt-6 font-body text-body-md text-on-surface max-w-md leading-relaxed">
              {t("tagline")}
            </p>
          </div>

          <div className="md:col-span-3">
            <h2 className="font-body font-semibold text-label-sm uppercase tracking-widest text-primary mb-4">
              {t("navigation")}
            </h2>
            <ul className="space-y-2 font-body text-body-md text-on-surface">
              <li><Link href={lp("/historia")} className="hover:text-primary transition-colors">{tNav("historia")}</Link></li>
              <li><Link href={lp("/vinos")} className="hover:text-primary transition-colors">{tNav("vinos")}</Link></li>
              <li><Link href={lp("/actividades")} className="hover:text-primary transition-colors">{tNav("actividades")}</Link></li>
              <li><Link href={lp("/tienda")} className="hover:text-primary transition-colors">{tNav("tienda")}</Link></li>
              <li><Link href={lp("/staff")} className="hover:text-primary transition-colors">{tNav("staff")}</Link></li>
              <li><Link href={lp("/contacto")} className="hover:text-primary transition-colors">{tNav("contacto")}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h2 className="font-body font-semibold text-label-sm uppercase tracking-widest text-primary mb-4">
              {t("contact")}
            </h2>
            <ul className="space-y-2 font-body text-body-md text-on-surface">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-1 shrink-0" aria-hidden="true" />
                {t("location")}
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-primary mt-1 shrink-0" aria-hidden="true" />
                {/* El horario trae un salto de línea: la excepción del jueves va en su
                    propia línea, igual que en /contacto. Sin `whitespace-pre-line` el
                    HTML lo colapsa y las dos frases quedan pegadas. */}
                <span className="whitespace-pre-line">{t("hours")}</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-primary mt-1 shrink-0" aria-hidden="true" />
                <a
                  href={CONTACT_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors tabular-nums"
                >
                  {CONTACT_PHONE_DISPLAY}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-primary mt-1 shrink-0" aria-hidden="true" />
                <a href={CONTACT_MAILTO_URL} className="hover:text-primary transition-colors">
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>

            <div className="flex gap-3 mt-6">
              {socialLinks.map(({ key, href, Icon }) => {
                const external = href.startsWith("http");
                return (
                  <a
                    key={key}
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    aria-label={t(`social.${key}`)}
                    className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-4 text-on-surface font-body text-sm">
          <div className="text-center md:text-left">
            <p>{t("copyright", { year })}</p>
            <p className="mt-1 text-[0.9375rem] font-body text-on-surface">
              {t("developedBy")} {" "}
              <a
                href="https://ligts.cl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-inherit underline decoration-current/35 underline-offset-2 transition-colors hover:text-primary hover:decoration-current"
              >
                ligts.cl
              </a>
            </p>
          </div>
          <div className="flex gap-5">
            {legalItems.map(({ label, href }) =>
              href ? (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-inherit underline decoration-current/35 underline-offset-2 transition-colors hover:text-primary hover:decoration-current"
                >
                  {label}
                </a>
              ) : (
                <span key={label}>{label}</span>
              ),
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-on-surface font-body">
          {t("disclaimer")}
        </p>
      </div>
    </footer>
  );
}
