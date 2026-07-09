"use client";

import Image from "next/image";

export interface StackedPhoto {
  src: string;
  alt: string;
}

interface StackedPhotosProps {
  photos: StackedPhoto[];
  activeIndex: number;
  className?: string;
}

export default function StackedPhotos({
  photos,
  activeIndex,
  className = "",
}: StackedPhotosProps) {
  const length = photos.length;
  if (length === 0) return null;

  return (
    <div
      className={`relative h-full w-full select-none [--peek-x:10%] [--peek-y:-5%] [--peek-scale:0.88] [--peek-rotate:12deg] md:[--peek-x:22%] md:[--peek-y:-8%] md:[--peek-scale:0.82] md:[--peek-rotate:18deg] ${className}`}
      style={{ perspective: "1200px" }}
    >
      {photos.map((photo, i) => {
        const isActive = i === activeIndex;
        const isLeft =
          length > 1 && (activeIndex - 1 + length) % length === i;
        const isRight =
          length > 1 && (activeIndex + 1) % length === i;
        const visible = isActive || isLeft || isRight;

        let transform =
          "translateX(0) translateY(0) scale(0.7) rotateY(0deg)";
        if (isActive) {
          transform = "translateX(0) translateY(0) scale(1) rotateY(0deg)";
        } else if (isLeft) {
          transform =
            "translateX(calc(-1 * var(--peek-x))) translateY(var(--peek-y)) scale(var(--peek-scale)) rotateY(var(--peek-rotate))";
        } else if (isRight) {
          transform =
            "translateX(var(--peek-x)) translateY(var(--peek-y)) scale(var(--peek-scale)) rotateY(calc(-1 * var(--peek-rotate)))";
        }

        return (
          <div
            key={photo.src}
            aria-hidden={!isActive}
            className="absolute inset-0 rounded-lg overflow-hidden ambient-shadow motion-reduce:transition-none"
            style={{
              transform,
              transition:
                "transform 1.1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.6s ease-out",
              zIndex: isActive ? 3 : visible ? 2 : 1,
              opacity: visible ? 1 : 0,
              pointerEvents: visible && isActive ? "auto" : "none",
              transformStyle: "preserve-3d",
              willChange: "transform, opacity",
            }}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
              priority={i === 0}
            />
          </div>
        );
      })}
    </div>
  );
}
