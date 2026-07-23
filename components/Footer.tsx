import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { MapPin, Clock, Mail, Phone, Globe2, Star } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import {
  CONTACT_PHONE_DISPLAY,
  CONTACT_WHATSAPP_URL,
  INSTAGRAM_URL,
} from "@/lib/contact";

const socialLinks = [
  { href: INSTAGRAM_URL, key: "instagram" as const, Icon: InstagramIcon },
  { href: "#", key: "tripadvisor" as const, Icon: Globe2 },
  { href: "#", key: "google" as const, Icon: Star },
];

export default async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const locale = await getLocale();
  const year = new Date().getFullYear();
  const lp = (path: string) => `/${locale}${path}`;

  const legalLinks = [
    { href: "#", label: t("legal.privacy") },
    { href: "#", label: t("legal.terms") },
    { href: "#", label: t("legal.sitemap") },
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
                src="/brand/logo-negro.png"
                alt=""
                width={200}
                height={200}
                className="h-20 w-auto"
              />
              <span
                aria-hidden="true"
                className="font-display text-primary text-2xl leading-tight tracking-tight"
              >
                Viña Casa Acosta
              </span>
            </Link>
            <p className="mt-6 font-body text-body-md text-on-surface-variant max-w-md leading-relaxed">
              {t("tagline")}
            </p>
          </div>

          <div className="md:col-span-3">
            <h4 className="font-body font-semibold text-label-sm uppercase tracking-widest text-primary mb-4">
              {t("navigation")}
            </h4>
            <ul className="space-y-2 font-body text-body-md text-on-surface-variant">
              <li><Link href={lp("/historia")} className="hover:text-primary transition-colors">{tNav("historia")}</Link></li>
              <li><Link href={lp("/vinos")} className="hover:text-primary transition-colors">{tNav("vinos")}</Link></li>
              <li><Link href={lp("/actividades")} className="hover:text-primary transition-colors">{tNav("actividades")}</Link></li>
              <li><Link href={lp("/tienda")} className="hover:text-primary transition-colors">{tNav("tienda")}</Link></li>
              <li><Link href={lp("/staff")} className="hover:text-primary transition-colors">{tNav("staff")}</Link></li>
              <li><Link href={lp("/contacto")} className="hover:text-primary transition-colors">{tNav("contacto")}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h4 className="font-body font-semibold text-label-sm uppercase tracking-widest text-primary mb-4">
              {t("contact")}
            </h4>
            <ul className="space-y-2 font-body text-body-md text-on-surface-variant">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-1 shrink-0" aria-hidden="true" />
                {t("location")}
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-primary mt-1 shrink-0" aria-hidden="true" />
                {t("hours")}
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
                <a href="mailto:contacto@vinacasaacosta.cl" className="hover:text-primary transition-colors">
                  contacto@vinacasaacosta.cl
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

        <div className="mt-12 pt-6 border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-4 text-on-surface-variant font-body text-sm">
          <p>{t("copyright", { year })}</p>
          <div className="flex gap-5">
            {legalLinks.map((l) => (
              <a key={l.label} href={l.href} className="hover:text-primary transition-colors">
                {l.label}
              </a>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-on-surface-variant/70 font-body">
          {t("disclaimer")}
        </p>
      </div>
    </footer>
  );
}
