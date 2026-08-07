import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Libre_Caslon_Text, Work_Sans, Crimson_Pro } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import CartButton from "@/components/CartButton";
import ScrollReset from "@/components/ScrollReset";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/siteUrl";
import "../globals.css";

const libreCaslon = Libre_Caslon_Text({
  variable: "--font-display",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const workSans = Work_Sans({
  variable: "--font-body",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

// Acento editorial para los antetítulos de la sección A (Crimson Pro Light Italic)
const crimsonPro = Crimson_Pro({
  variable: "--font-accent",
  weight: ["300"],
  style: ["italic"],
  subsets: ["latin"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("titleDefault"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    keywords: [
      "Viña Casa Acosta",
      "vino chileno",
      "San Vicente de Tagua Tagua",
      "Valle del Cachapoal",
      "Carmenere",
      "Tannat",
      "enoturismo Chile",
    ],
    // OJO: acá NO va `alternates`. El canonical del layout es el de la home, y
    // como `alternates` se hereda entero, toda página que no lo redeclare queda
    // apuntando a la portada. Cada ruta declara el suyo con `alternatesFor()`
    // de `lib/alternates.ts`. Si alguna se olvida, no emite canonical y Google
    // se auto-canonicaliza — molesto, pero infinitamente menos dañino que
    // declarar la home como canónica de las 78 URLs.
    openGraph: {
      type: "website",
      locale: locale === "es" ? "es_CL" : locale === "pt" ? "pt_BR" : "en_US",
      siteName: t("siteName"),
      title: t("ogTitle"),
      description: t("ogDescription"),
      images: [
        {
          url: "/brand/og-image.png",
          width: 1200,
          height: 630,
          alt: t("siteName"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
      images: ["/brand/og-image.png"],
    },
    // Los iconos se auto-detectan por convención de archivos en app/:
    // favicon.ico (16/32/48), icon.png (512) y apple-icon.png (180) — generados
    // desde el logo del sello. No hace falta declararlos acá.
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const htmlLang = locale === "es" ? "es-CL" : locale === "pt" ? "pt-BR" : "en";

  return (
    <html
      lang={htmlLang}
      className={`${libreCaslon.variable} ${workSans.variable} ${crimsonPro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-on-background">
        <NextIntlClientProvider>
          <ScrollReset />
          <Navbar />
          <main className="flex-grow">{children}</main>
          <Footer />
          <CartButton />
          <CartDrawer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
