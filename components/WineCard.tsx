import Image from "next/image";
import Link from "next/link";

export type WineCardProps = {
  href: string;
  image: string;
  name: string;
  eyebrow: string;
};

/** Tarjeta de producto de formato amplio para la vista inicial de una colección. */
export default function WineCard({ href, image, name, eyebrow }: WineCardProps) {
  return (
    <article className="h-full">
      <Link
        href={href}
        className="group flex h-full flex-col overflow-hidden rounded-[1.25rem] bg-surface-container-lowest ambient-shadow transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-12px_rgba(74,14,14,0.14)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-surface-container-low to-surface-container">
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
            className="object-contain p-5 drop-shadow-[0_14px_20px_rgba(74,14,14,0.18)] transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>
        <div className="border-t border-on-surface-variant/10 px-5 py-4">
          <p className="mb-1 font-body text-label-sm uppercase tracking-widest text-on-surface-variant">
            {eyebrow}
          </p>
          <h3 className="font-display text-2xl leading-tight text-primary">{name}</h3>
        </div>
      </Link>
    </article>
  );
}
