import { partesConEnfasis } from "@/lib/enfasis";

/**
 * Dibuja un texto de `messages` con sus tramos `**destacados**` en negrita y en
 * el color de los títulos. El resto hereda el estilo del párrafo que lo
 * contiene. Ver `lib/enfasis.ts`.
 */
export default function Emphasis({ text }: { text: string }) {
  return (
    <>
      {partesConEnfasis(text).map((parte, i) =>
        parte.destacado ? (
          <strong key={i} className="font-semibold text-primary">
            {parte.texto}
          </strong>
        ) : (
          <span key={i}>{parte.texto}</span>
        ),
      )}
    </>
  );
}
