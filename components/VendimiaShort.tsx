"use client";

import Image from "next/image";
import { useState } from "react";
import { Play } from "lucide-react";
import { urlShortVendimia } from "@/data/vendimiaVideo";

/**
 * El espacio del short de YouTube. El reproductor se carga recién cuando la
 * persona aprieta play: así la página no baja YouTube ni deja sus cookies a quien
 * no lo va a ver. Sin id publicado, queda la foto con el aviso.
 */
export default function VendimiaShort({
  poster,
  alt,
  titulo,
  ver,
  pronto,
}: {
  poster: string;
  alt: string;
  titulo: string;
  ver: string;
  pronto: string;
}) {
  const [reproduciendo, setReproduciendo] = useState(false);
  const url = urlShortVendimia();

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[28px] bg-primary shadow-[0_24px_60px_-28px_rgba(27,28,28,0.55)]">
      {url && reproduciendo ? (
        <iframe
          src={url}
          title={titulo}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <>
          <Image
            src={poster}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 72vw, 340px"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/10"
          />
          {url ? (
            <button
              type="button"
              onClick={() => setReproduciendo(true)}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-primary shadow-lg">
                <Play className="ml-1 h-7 w-7 fill-current" aria-hidden="true" />
              </span>
              <span className="font-body text-base font-semibold">{ver}</span>
            </button>
          ) : (
            <p className="absolute inset-x-5 bottom-5 text-center font-body text-sm font-medium text-white">
              {pronto}
            </p>
          )}
        </>
      )}
    </div>
  );
}
