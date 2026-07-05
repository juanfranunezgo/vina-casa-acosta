import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // Calidades permitidas para next/image. Silencia el warning de Next 16
    // cuando un <Image> pide algo distinto del default (75).
    // 85 = balance calidad/peso del hero full-bleed · 95 = botellas de vino.
    qualities: [75, 85, 95],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
