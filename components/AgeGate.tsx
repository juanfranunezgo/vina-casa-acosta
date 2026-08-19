"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

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
 *    legal del pie sigue estando en las tres traducciones.
 *
 * `Escape` no cierra —no es un modal de marketing— y el foco queda atrapado
 * adentro mientras la pregunta esté en pantalla.
 */

/** Cuánto dura la confirmación. */
const DIAS = 30;
const CLAVE = "vca:mayor-edad";

type Estado = "oculto" | "preguntando" | "despedida";

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
const hayQuePreguntar = () =>
  document.documentElement.getAttribute("data-age-gate") === "pendiente";
const enElServidor = () => true;

export default function AgeGate() {
  const t = useTranslations("ageGate");
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
    if (document.documentElement.getAttribute("data-age-gate") !== "pendiente") return;
    const panel = panelRef.current;
    if (!panel) return;

    const foco = () =>
      panel.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
    foco()[0]?.focus();

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
      aria-describedby="age-gate-body"
      className="fixed inset-0 z-[100] items-center justify-center bg-primary/95 px-margin-mobile py-10 backdrop-blur-sm"
    >
      <div
        ref={panelRef}
        className="w-full max-w-lg rounded-2xl bg-surface p-8 text-center ambient-shadow-lg md:p-10"
      >
        <Image
          src="/brand/logo-negro.webp"
          alt=""
          width={200}
          height={200}
          className="mx-auto h-16 w-auto"
          sizes="64px"
          priority
        />

        <h2
          id="age-gate-title"
          className="mt-6 font-display text-[1.75rem] leading-[1.15] text-primary md:text-[2rem]"
        >
          {despedida ? t("byeTitle") : t("title")}
        </h2>

        <p
          id="age-gate-body"
          className="mt-4 font-body text-[17px] leading-[1.7] text-on-surface-variant"
        >
          {despedida ? t("byeBody") : t("body")}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {despedida ? (
            <button
              type="button"
              onClick={() => setRespuesta("ninguna")}
              className="inline-flex h-11 items-center justify-center rounded-md border border-outline px-7 font-body text-body-md font-semibold text-primary transition-colors duration-200 hover:bg-surface-container-low"
            >
              {t("back")}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={confirmar}
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-7 font-body text-body-md font-semibold text-on-primary shadow-[0_8px_24px_-8px_rgba(42,0,2,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-container active:translate-y-0"
              >
                {t("confirm")}
              </button>
              <button
                type="button"
                onClick={() => setRespuesta("menor")}
                className="inline-flex h-11 items-center justify-center rounded-md border border-outline px-7 font-body text-body-md font-semibold text-primary transition-colors duration-200 hover:bg-surface-container-low"
              >
                {t("deny")}
              </button>
            </>
          )}
        </div>

        <p className="mt-8 border-t border-outline-variant/60 pt-5 font-body text-[12px] leading-relaxed text-on-surface-variant">
          {t("legal")}
        </p>
      </div>
    </div>
  );
}
