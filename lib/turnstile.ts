/**
 * El widget invisible de Cloudflare Turnstile, sin React.
 *
 * La puerta de formularios de Afeleia exige en cada envío un token de Turnstile
 * con la acción `formulario` (contrato v1: `supabase/functions/formularios-publico/README.md`
 * del repo de Afeleia). El token dura 300 s y sirve una vez, así que no se pide al
 * cargar la página sino al enviar: `obtenerToken()` reinicia el widget, lo ejecuta y
 * espera el token. Con `interaction-only` la persona no ve nada salvo que Cloudflare
 * necesite que marque la casilla.
 *
 * Todo lo que puede fallar termina en un `ErrorTurnstile`, y el formulario muestra
 * su alternativa (manual de conexión §12, Respaldo): el script bloqueado por una
 * extensión o por la CSP falla enseguida, no a los 30 s; sin clave pública falla
 * como `configuracion` sin cargar nada.
 *
 * `components/TurnstileInvisible.tsx` solo monta y desmonta esto; la lógica vive
 * acá para poder probarla en Node (`tests/turnstile.test.mjs`).
 */

/**
 * La URL exacta del script, sin copiarlo ni pasarlo por un proxy y sin
 * `integrity`: Cloudflare lo actualiza en la misma URL.
 */
export const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** La acción que exige la puerta; cualquier otra es un 403. */
const ACCION = "formulario";

/** Sin respuesta de Cloudflare en este plazo, el envío falla. */
const PLAZO_MS = 30_000;

/**
 * Desde que Cloudflare pide que la persona actúe. Con `interaction-only` la casilla
 * aparece recién ahí, y hay que verla y marcarla: 30 s castigarían justo a quien
 * Cloudflare quiere mirar. El desafío interactivo tiene además su propio vencimiento
 * (`timeout-callback`); este plazo es el techo por si nunca llega.
 */
const PLAZO_INTERACTIVO_MS = 180_000;

/** Las opciones del render que se usan (developers.cloudflare.com/turnstile, "Widget configurations"). */
export type OpcionesWidget = {
  sitekey: string;
  action: string;
  execution: "execute";
  appearance: "interaction-only";
  retry: "never";
  "response-field": boolean;
  theme: "light";
  callback: (token: string) => void;
  "error-callback": (codigo?: string) => void;
  "timeout-callback": () => void;
  "unsupported-callback": () => void;
  "before-interactive-callback": () => void;
};

/** Lo que se usa de `window.turnstile`. */
export type TurnstileApi = {
  render(contenedor: HTMLElement, opciones: OpcionesWidget): string | null | undefined;
  execute(contenedor: HTMLElement): void;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

export type MotivoTurnstile =
  | "configuracion"
  | "script"
  | "widget"
  | "tiempo_agotado"
  | "no_soportado"
  | "desmontado"
  | "reemplazado";

export class ErrorTurnstile extends Error {
  // Sin propiedades de parámetro: los tests corren este archivo en Node, que solo borra tipos.
  readonly motivo: MotivoTurnstile;

  constructor(motivo: MotivoTurnstile) {
    super(motivo);
    this.name = "ErrorTurnstile";
    this.motivo = motivo;
  }
}

export type Turnstile = {
  /** Carga el script (una sola vez por página) y pinta el widget en el contenedor. */
  montar(contenedor: HTMLElement): void;
  /** Quita el widget y corta lo pendiente. Se puede volver a montar. */
  desmontar(): void;
  /** Un token nuevo para este envío. */
  obtenerToken(): Promise<string>;
};

type Pedido = {
  resolver: (token: string) => void;
  rechazar: (error: ErrorTurnstile) => void;
  plazo: ReturnType<typeof setTimeout>;
};

export function crearTurnstile({
  sitekey,
  cargarApi = cargarApiTurnstile,
  plazoMs = PLAZO_MS,
  plazoInteractivoMs = PLAZO_INTERACTIVO_MS,
}: {
  sitekey: string | undefined;
  cargarApi?: () => Promise<TurnstileApi>;
  plazoMs?: number;
  plazoInteractivoMs?: number;
}): Turnstile {
  // Sube en cada montar y desmontar: un script que termina de cargar para un
  // montaje que ya no existe no pinta nada.
  let montaje = 0;
  let contenedor: HTMLElement | null = null;
  let api: TurnstileApi | null = null;
  let widgetId: string | null = null;
  // Un fallo que se repetiría en cada intento: el siguiente falla sin esperar.
  let fallo: MotivoTurnstile | null = null;
  let pedido: Pedido | null = null;

  const cerrar = () => {
    const actual = pedido;
    if (actual) clearTimeout(actual.plazo);
    pedido = null;
    return actual;
  };
  const cumplir = (token: string) => cerrar()?.resolver(token);
  const fallar = (motivo: MotivoTurnstile) => cerrar()?.rechazar(new ErrorTurnstile(motivo));
  const plazo = (ms: number) => setTimeout(() => fallar("tiempo_agotado"), ms);

  const ejecutar = () => {
    if (!pedido || !api || !widgetId || !contenedor) return;
    try {
      api.reset(widgetId);
      api.execute(contenedor);
    } catch {
      fallar("widget");
    }
  };

  const opciones = (clave: string): OpcionesWidget => ({
    sitekey: clave,
    action: ACCION,
    execution: "execute",
    appearance: "interaction-only",
    // Cada envío hace reset + execute: un fallo tiene que llegar al formulario, no
    // quedarse reintentando solo cada 8 s.
    retry: "never",
    // El token se pasa a mano; el input oculto que agrega Cloudflare sobra.
    "response-field": false,
    // El sitio no tiene modo oscuro.
    theme: "light",
    callback: cumplir,
    "error-callback": () => fallar("widget"),
    "timeout-callback": () => fallar("tiempo_agotado"),
    "unsupported-callback": () => {
      fallo = "no_soportado";
      fallar("no_soportado");
    },
    "before-interactive-callback": () => {
      if (!pedido) return;
      clearTimeout(pedido.plazo);
      pedido.plazo = plazo(plazoInteractivoMs);
    },
  });

  return {
    montar(nuevo) {
      montaje += 1;
      const este = montaje;
      contenedor = nuevo;
      fallo = null;
      if (!sitekey) return;
      cargarApi().then(
        (cargada) => {
          if (este !== montaje || widgetId) return;
          api = cargada;
          try {
            widgetId = cargada.render(nuevo, opciones(sitekey)) ?? null;
          } catch {
            widgetId = null;
          }
          if (!widgetId) {
            fallo = "widget";
            fallar("widget");
            return;
          }
          ejecutar();
        },
        () => {
          if (este !== montaje) return;
          fallo = "script";
          fallar("script");
        },
      );
    },

    desmontar() {
      montaje += 1;
      if (api && widgetId) {
        try {
          api.remove(widgetId);
        } catch {
          // El widget ya no está: no hay nada que limpiar.
        }
      }
      widgetId = null;
      contenedor = null;
      fallar("desmontado");
    },

    obtenerToken() {
      if (!sitekey) return Promise.reject(new ErrorTurnstile("configuracion"));
      if (fallo) return Promise.reject(new ErrorTurnstile(fallo));
      fallar("reemplazado");
      const promesa = new Promise<string>((resolver, rechazar) => {
        pedido = { resolver, rechazar, plazo: plazo(plazoMs) };
      });
      // Si el script todavía no cargó, ejecuta al pintarse el widget.
      ejecutar();
      return promesa;
    },
  };
}

type VentanaConTurnstile = { turnstile?: TurnstileApi };

/**
 * Carga el script una sola vez por página. No usa `next/script` a propósito: su
 * caché da por cargado un script que falló cuando el componente se vuelve a montar,
 * y en desarrollo no repite `onReady` en el doble montaje de React. Acá un script
 * que falla se saca, y el próximo montaje lo vuelve a pedir.
 */
export function crearCargadorTurnstile(
  documento: Pick<Document, "createElement" | "head">,
  ventana: VentanaConTurnstile,
): () => Promise<TurnstileApi> {
  let enCurso: Promise<TurnstileApi> | null = null;

  return () => {
    if (ventana.turnstile) return Promise.resolve(ventana.turnstile);
    enCurso ??= new Promise<TurnstileApi>((resolver, rechazar) => {
      const script = documento.createElement("script");
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      const descartar = (motivo: string) => {
        enCurso = null;
        script.remove();
        rechazar(new Error(motivo));
      };
      script.addEventListener("load", () => {
        if (ventana.turnstile) resolver(ventana.turnstile);
        else descartar("turnstile: el script cargó sin la API");
      });
      script.addEventListener("error", () => descartar("turnstile: el script no cargó"));
      documento.head.appendChild(script);
    });
    return enCurso;
  };
}

let cargadorDeLaPagina: (() => Promise<TurnstileApi>) | null = null;

/** El cargador de la página, creado recién en el navegador. */
export function cargarApiTurnstile(): Promise<TurnstileApi> {
  cargadorDeLaPagina ??= crearCargadorTurnstile(document, window as Window & VentanaConTurnstile);
  return cargadorDeLaPagina();
}
