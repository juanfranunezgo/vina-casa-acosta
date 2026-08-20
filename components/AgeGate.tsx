"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { routing } from "@/i18n/routing";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Button from "@/components/ui/Button";

/**
 * Verificación de edad (+18) — Ley N° 19.925.
 *
 * Cubre el sitio entero y se recuerda 30 días. Tres cosas del diseño que no son
 * cosméticas:
 *
 * 1. **Es una capa sobre el HTML ya servido, no un reemplazo.** La página se
 *    renderiza completa y esto va encima: Google sigue viendo las 112 páginas y
 *    no existe una ruta `/edad` que indexar. Nada de `display:none` sobre el
 *    contenido.
 *
 * 2. **Quién decide que la capa se ve.** El servidor no puede saber si este
 *    visitante ya confirmó —el dato vive en su navegador— así que montarla
 *    después de hidratar le mostraría medio segundo de sitio a quien no ha
 *    confirmado, y a quien ya confirmó le haría parpadear la capa. Lo resuelve
 *    el script de `AgeGateScript`, que marca `<html data-age-gate="pendiente">`
 *    antes del primer pintado; el CSS de `globals.css` decide desde ahí. Después
 *    de hidratar manda React, y al aceptar se quita el atributo: bloqueo del
 *    scroll y visibilidad viajan juntos, en un solo mecanismo.
 *
 * 3. **Sin JavaScript la capa no aparece.** Es deliberado: sus botones necesitan
 *    JS, así que mostrarla sería dejar el sitio bloqueado sin salida. El aviso
 *    legal sigue estando en las tres traducciones.
 *
 * `Escape` no cierra —no es un modal de marketing— y el foco queda atrapado
 * adentro mientras la pregunta esté en pantalla.
 *
 * **Por qué es una foto a sangre y no una tarjeta.** Pasó por las dos formas el
 * 2026-08-20. La tarjeta —foto en una columna de 320px y tres líneas de texto al
 * lado— dejaba la imagen como una miniatura y la pantalla como un formulario.
 * Esta es la forma en que la resuelven las viñas grandes: la foto es la pantalla,
 * y encima va lo mínimo —logo, idioma, la pregunta y dos botones—. El párrafo que
 * explicaba la ley se fue: lo dice la línea legal de abajo en una sola frase.
 *
 * La foto usa el mismo `<picture>` con dirección de arte que los heros del sitio
 * (ver `scripts/optimize-heros.mjs`): encuadre 3:2 para pantallas horizontales y
 * 9:16 para verticales, porque `object-cover` sobre un master horizontal estira
 * la foto hasta cubrir el alto y deja ver una franja del centro.
 *
 * **Por qué el selector de idioma vive acá.** La pregunta llega antes que el
 * sitio, así que el navbar —donde está el otro selector— todavía no se puede
 * tocar. Quien entra en inglés o portugués tenía que confirmar su edad en
 * español para recién después poder cambiar de idioma.
 */

/** Cuánto dura la confirmación. */
const DIAS = 30;
const CLAVE = "vca:mayor-edad";

type Estado = "oculto" | "preguntando" | "despedida";

/**
 * Los dos encuadres de la foto. El master vertical sale de 1125px de ancho —los
 * 2000 de alto del master por 9/16— y no hay candidato mayor: prometer 1600w
 * sería declarar un ancho que el archivo no tiene.
 */
const fotoSources = {
  desktop: [
    "/images/edad/uvas-1280.webp 1280w",
    "/images/edad/uvas-1920.webp 1920w",
    "/images/edad/uvas-2560.webp 2560w",
  ].join(", "),
  movil: ["/images/edad/uvas-movil-828.webp 828w", "/images/edad/uvas-movil-1125.webp 1125w"].join(
    ", ",
  ),
};

/** Script que corre antes del primer pintado. Se inyecta desde el layout. */
export const AGE_GATE_SCRIPT = `try{var v=localStorage.getItem(${JSON.stringify(
  CLAVE,
)});if(!v||Date.now()>Number(v)){document.documentElement.setAttribute("data-age-gate","pendiente")}}catch(e){document.documentElement.setAttribute("data-age-gate","pendiente")}`;

/**
 * Si la capa está pendiente, leído del atributo que dejó `AGE_GATE_SCRIPT`.
 *
 * Va por `useSyncExternalStore` y no por un `useState` con efecto: el dato vive
 * fuera de React —en el `<html>`— y el servidor tiene que responder `true` para
 * que el marcado exista en el HTML servido, que es lo que le permite al CSS
 * mostrar la capa antes del primer pintado. El atributo no cambia solo, así que
 * la suscripción no tiene a qué escuchar.
 */
const suscribir = () => () => {};
const hayQuePreguntar = () => {
  if (document.documentElement.getAttribute("data-age-gate") === "pendiente") return true;
  // El atributo no sobrevive a una navegacion del cliente —ver el efecto de
  // abajo—, asi que la respuesta de verdad es la de siempre: lo que guardo el
  // navegador. Sin esta segunda lectura, cambiar de idioma desde la capa dejaba
  // entrar al sitio sin confirmar la edad.
  try {
    const vence = localStorage.getItem(CLAVE);
    return !vence || Date.now() > Number(vence);
  } catch {
    return true;
  }
};
const enElServidor = () => true;

export default function AgeGate() {
  const t = useTranslations("ageGate");
  const locale = useLocale();
  const pendiente = useSyncExternalStore(suscribir, hayQuePreguntar, enElServidor);
  const [respuesta, setRespuesta] = useState<"ninguna" | "menor" | "mayor">("ninguna");
  const panelRef = useRef<HTMLDivElement>(null);

  const estado: Estado =
    !pendiente || respuesta === "mayor"
      ? "oculto"
      : respuesta === "menor"
        ? "despedida"
        : "preguntando";

  // Foco atrapado mientras la capa está arriba. Sin esto, tabular saca el foco
  // al sitio de atrás —que sigue en el DOM— y quien navega con teclado queda
  // moviéndose por una página que no debería poder usar todavía.
  //
  // Sólo cuando la capa se está viendo de verdad: `estado` puede ser
  // "preguntando" en el render del servidor y en el primer render del cliente
  // aunque el CSS la tenga oculta, y robarle el foco ahí se lo quitaría a la
  // página a quien ya confirmó su edad.
  useEffect(() => {
    if (estado === "oculto") return;
    // Repone el atributo que puso `AGE_GATE_SCRIPT`. Al cambiar de idioma, el
    // `router.replace` re-renderiza `<html>` con las props del layout y React se
    // lleva por delante lo que no es suyo; el script no vuelve a correr, porque
    // la navegacion es del cliente. Sin el atributo, el CSS deja la capa en
    // `display:none` y el visitante entra al sitio sin haber contestado.
    // Tambien es lo que vuelve a bloquear el scroll del fondo.
    document.documentElement.setAttribute("data-age-gate", "pendiente");
    const panel = panelRef.current;
    if (!panel) return;

    const foco = () =>
      panel.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
    // El foco entra por el botón que responde la pregunta, no por el primer
    // elemento del panel: desde que el selector de idioma vive acá, el primero
    // es "ES" y el teclado empezaría eligiendo idioma en vez de contestando.
    const principal = panel.querySelector<HTMLElement>("[data-age-gate-principal]");
    (principal ?? foco()[0])?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const elementos = foco();
      if (elementos.length === 0) return;
      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [estado]);

  const confirmar = () => {
    try {
      localStorage.setItem(CLAVE, String(Date.now() + DIAS * 24 * 60 * 60 * 1000));
    } catch {
      // Navegador sin almacenamiento (modo privado, cookies bloqueadas): se deja
      // pasar igual y se vuelve a preguntar en la próxima visita. Negarle el
      // sitio a quien no puede guardar nada sería castigar la configuración.
    }
    document.documentElement.removeAttribute("data-age-gate");
    setRespuesta("mayor");
  };

  if (estado === "oculto") return null;

  const despedida = estado === "despedida";

  return (
    <div
      id="age-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      aria-describedby="age-gate-legal"
      className="fixed inset-0 z-[100] items-center justify-center overflow-hidden px-margin-mobile py-10"
    >
      {/* Los umbrales de cada `media` son la proporción de su encuadre, y el
          `sizes` lleva el alto del viewport: con `object-cover` en vertical la
          foto se estira hasta cubrir el alto, y ese ancho estirado —no el del
          contenedor— es el que hay que descargar. Mismo criterio que los heros. */}
      <picture className="absolute inset-0">
        <source
          media="(min-aspect-ratio: 3/4)"
          srcSet={fotoSources.desktop}
          sizes="(max-aspect-ratio: 3/2) 150vh, 100vw"
        />
        <source srcSet={fotoSources.movil} sizes="(max-aspect-ratio: 9/16) 56.25vh, 100vw" />
        <img
          src="/images/edad/uvas-1920.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover object-center"
        />
      </picture>
      {/* Dos velos, medidos para que la foto se siga viendo: uno parejo en el
          granate de la marca, que la unifica sin apagarla, y otro vertical que
          carga arriba y abajo —donde cae el texto— y deja el centro casi limpio.
          Con el primero al 45% y el vertical al 65/35/70 la foto se volvia un
          fondo oscuro cualquiera: el detalle de los racimos desaparecia. */}
      <div className="absolute inset-0 bg-primary/25" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/60" />

      <div ref={panelRef} className="relative z-10 w-full max-w-4xl text-center">
        <Image
          src="/brand/logo-blanco-v2.webp"
          alt=""
          width={200}
          height={200}
          className="mx-auto h-24 w-auto md:h-28"
          sizes="112px"
          priority
        />

        <div className="mt-6 flex justify-center">
          <LanguageSwitcher locales={routing.locales} currentLocale={locale} variant="gate" />
        </div>

        {/* `clamp()` y no media queries, como el resto de los títulos grandes del
            sitio: una sola declaración cubre de 375px a 1920px. */}
        <h2
          id="age-gate-title"
          className="mt-8 font-display text-on-primary drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
          style={{ fontSize: "clamp(2.25rem, 6.4vw, 4.5rem)", lineHeight: 1.08, letterSpacing: "-0.015em" }}
        >
          {despedida ? t("byeTitle") : t("title")}
        </h2>

        {despedida && (
          <p className="mx-auto mt-5 max-w-lg font-body text-[16px] leading-[1.65] text-on-primary/85">
            {t("byeBody")}
          </p>
        )}

        <div className="mx-auto mt-10 grid max-w-lg gap-3 sm:grid-cols-2 sm:gap-4">
          {despedida ? (
            <Button
              variant="glass"
              size="lg"
              fullWidth
              onClick={() => setRespuesta("ninguna")}
              data-age-gate-principal=""
            >
              {t("back")}
            </Button>
          ) : (
            <>
              <Button size="lg" fullWidth onClick={confirmar} data-age-gate-principal="">
                {t("confirm")}
              </Button>
              <Button
                variant="glass"
                size="lg"
                fullWidth
                onClick={() => setRespuesta("menor")}
              >
                {t("deny")}
              </Button>
            </>
          )}
        </div>

        <p
          id="age-gate-legal"
          className="mx-auto mt-10 max-w-xl font-accent text-sm italic leading-relaxed text-on-primary/85 md:text-base"
        >
          {t("legal")}
        </p>
      </div>
    </div>
  );
}
