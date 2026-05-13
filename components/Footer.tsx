import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { MapPin, Clock, Mail, Camera, Globe2, Star } from "lucide-react";

const socialLinks = [
  { href: "#", key: "instagram" as const, Icon: Camera },
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
            <Link href={lp("")} className="inline-flex items-center gap-2">
              <Image
                src="/brand/logo-negro.png"
                alt="Viña Casa Acosta"
                width={180}
                height={48}
                className="h-12 w-auto"
              />
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
                <Mail className="h-4 w-4 text-primary mt-1 shrink-0" aria-hidden="true" />
                <a href="mailto:contacto@vinacasaacosta.cl" className="hover:text-primary transition-colors">
                  contacto@vinacasaacosta.cl
                </a>
              </li>
            </ul>

            <div className="flex gap-3 mt-6">
              {socialLinks.map(({ key, href, Icon }) => (
                <a
                  key={key}
                  href={href}
                  aria-label={t(`social.${key}`)}
                  className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
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
