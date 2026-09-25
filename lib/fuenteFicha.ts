import { Plus_Jakarta_Sans } from "next/font/google";

/**
 * Plus Jakarta Sans para el texto de las fichas —no para los títulos, que
 * siguen en Libre Caslon—. Pedido de Juan Francisco del 2026-09-24 sobre la
 * lectura de Quorum Legal para las fichas de actividad, y extendido el
 * 2026-09-25 a la ficha de vino. Menú, pie y el resto del sitio siguen en
 * Work Sans.
 *
 * Se aplica redefiniendo `--font-body` en cada bloque de primer nivel de la
 * ficha, así que todo `font-body` de adentro —componentes incluidos— cambia
 * sin tocarlos. No va en un `div` que envuelva la página porque el Navbar busca
 * el hero como `main > section` (components/Navbar.tsx) y un envoltorio lo
 * escondería. Si una ficha gana un bloque de primer nivel, lleva esta clase.
 *
 * Vive acá y no en cada página para que las dos fichas carguen la misma
 * instancia de la letra: dos llamadas a `Plus_Jakarta_Sans()` son dos
 * `@font-face` con nombres distintos para el mismo archivo.
 */
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const FUENTE_FICHA = `${jakarta.variable} font-body [--font-body:var(--font-jakarta)]`;
