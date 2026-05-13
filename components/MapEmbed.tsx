"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

type Props = {
  title: string;
  src: string;
};

export default function MapEmbed({ title, src }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full h-full min-h-[400px] md:min-h-full bg-surface-container">
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 skeleton">
          <MapPin className="h-8 w-8 text-primary/50" aria-hidden="true" />
          <span className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant/70">
            {title}
          </span>
        </div>
      )}
      <iframe
        title={title}
        src={src}
        className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
