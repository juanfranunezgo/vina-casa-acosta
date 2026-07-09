import Image from "next/image";
import Reveal from "@/components/Reveal";

type Props = {
  /** Antetítulo del capítulo (ej. "I · Sueño"). */
  tag: string;
  title: string;
  body: string;
  image: { src: string; alt: string };
  /** En desktop, coloca la foto a la derecha (capítulos alternados). */
  reverse?: boolean;
};

/**
 * Un capítulo del relato de Historia: foto + texto en dos columnas que se
 * alternan de lado según `reverse`. En mobile siempre se apila (foto arriba).
 */
export default function StoryChapter({
  tag,
  title,
  body,
  image,
  reverse = false,
}: Props) {
  return (
    <Reveal
      as="article"
      className="grid md:grid-cols-2 gap-6 md:gap-12 lg:gap-16 items-center"
    >
      <figure
        className={`relative aspect-[4/3] overflow-hidden rounded-xl ambient-shadow ${
          reverse ? "md:order-2" : ""
        }`}
      >
        <Image
          src={image.src}
          alt={image.alt}
          fill
          loading="lazy"
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </figure>
      <div className={reverse ? "md:order-1" : ""}>
        <span className="font-body text-label-sm text-wine-accent uppercase tracking-widest block mb-3">
          {tag}
        </span>
        <h2 className="font-display text-headline-h1-mobile md:text-headline-h1 text-primary mb-4 leading-tight">
          {title}
        </h2>
        <p className="font-body text-body-md md:text-body-lg text-on-surface-variant leading-relaxed">
          {body}
        </p>
      </div>
    </Reveal>
  );
}
