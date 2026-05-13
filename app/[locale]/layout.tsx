import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Libre_Caslon_Text, Work_Sans } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import CartButton from "@/components/CartButton";
import { routing } from "@/i18n/routing";
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
    metadataBase: new URL("https://web-casa-acosta.vercel.app"),
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
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}`]),
      ),
    },
    openGraph: {
      type: "website",
      locale: locale === "es" ? "es_CL" : locale === "pt" ? "pt_BR" : "en_US",
      siteName: t("siteName"),
      title: t("ogTitle"),
      description: t("ogDescription"),
      images: [
        {
          url: "/brand/logo-negro.png",
          width: 1200,
          height: 630,
          alt: t("siteName"),
        },
      ],
    },
    icons: {
      icon: "/favicon.ico",
    },
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
      className={`${libreCaslon.variable} ${workSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-on-background">
        <NextIntlClientProvider>
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
