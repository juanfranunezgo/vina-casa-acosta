import type { Metadata } from "next";
import { Libre_Caslon_Text, Work_Sans } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import CartButton from "@/components/CartButton";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://web-casa-acosta.vercel.app"),
  title: {
    default: "Viña Casa Acosta — Tributo a la familia",
    template: "%s · Viña Casa Acosta",
  },
  description:
    "Viña boutique familiar en San Vicente de Tagua Tagua, Valle del Cachapoal. Vinos artesanales, tours y experiencias que celebran nuestras raíces.",
  keywords: [
    "Viña Casa Acosta",
    "vino chileno",
    "San Vicente de Tagua Tagua",
    "Valle del Cachapoal",
    "Carmenere",
    "Tannat",
    "enoturismo Chile",
  ],
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: "Viña Casa Acosta",
    title: "Viña Casa Acosta — Tributo a la familia",
    description:
      "Viña boutique familiar en el Valle del Cachapoal. Vinos artesanales y experiencias enoturísticas.",
    images: [
      {
        url: "/brand/logo-negro.png",
        width: 1200,
        height: 630,
        alt: "Viña Casa Acosta",
      },
    ],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es-CL"
      className={`${libreCaslon.variable} ${workSans.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-on-background">
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
        <CartButton />
        <CartDrawer />
      </body>
    </html>
  );
}
