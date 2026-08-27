#!/usr/bin/env node
/**
 * Paso previo a `next build`: refresca el snapshot de fallback y **nunca hace
 * fallar el build**.
 *
 * Por qué existe. `data/catalogo-fallback.json` es lo que el sitio sirve cuando
 * Afeleia no responde, y hasta hoy se regeneraba a mano. Con un sitio se puede
 * recordar; con cien, no: un sitio que no despliega hace tres meses sirve, el
 * día de la caída, precios de hace tres meses. Atarlo al build convierte "hay
 * que acordarse" en "pasa solo".
 *
 * Por qué no puede fallar el build. Si Afeleia está caído y además impide
 * desplegar, una caída se convierte en dos. Cuando la API no contesta, este paso
 * avisa y conserva el snapshot committeado, que es exactamente para lo que ese
 * archivo existe. El build sigue.
 *
 * Qué NO hace: no commitea nada. El snapshot refrescado vive en el artefacto de
 * ese deploy. El committeado es el piso —lo que el sitio serviría si la API
 * estuviera caída también en el momento de desplegar— y se actualiza con
 * `npm run catalogo:snapshot` cuando alguien quiere subir el piso.
 *
 * Ojo en local: un `npm run build` con las variables definidas también refresca
 * el archivo, así que puede dejar el árbol de trabajo sucio. Commitearlo es
 * legítimo (es la salida del generador, sellada); descartarlo también.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const GENERADOR = path.join(AQUI, "catalogo-snapshot.mjs");

const CONSERVADO =
  "El build sigue con el snapshot committeado: una caida de Afeleia no puede " +
  "ademas impedir desplegar.";

if (!process.env.NEXT_PUBLIC_AFELEIA_API_URL || !process.env.NEXT_PUBLIC_AFELEIA_SITIO) {
  console.info(
    `[afeleia] sin NEXT_PUBLIC_AFELEIA_API_URL/SITIO: no se refresca el snapshot. ${CONSERVADO}`,
  );
  process.exit(0);
}

/**
 * Techo duro del paso entero, por encima del que ya tiene el fetch del
 * generador.
 *
 * Son dos relojes a proposito: el de adentro cubre la API que no contesta, este
 * cubre todo lo demas —DNS que no resuelve, disco trabado, un generador que se
 * cuelga por un motivo que hoy no existe—. Colgarse es la peor de las fallas
 * posibles acá: no se distingue de "esta tardando", consume el timeout global
 * del build y termina impidiendo desplegar, que es la unica cosa que este paso
 * tiene prohibido hacer.
 */
const TIMEOUT_MS = 45_000;

// Se delega en el generador de siempre en vez de repetir su logica: el es el
// unico que sabe localizar las imagenes a public/vinos y sellar el resultado.
// Si divergieran, el snapshot del build se veria distinto del generado a mano.
const resultado = spawnSync(process.execPath, [GENERADOR], {
  stdio: "inherit",
  timeout: TIMEOUT_MS,
  killSignal: "SIGKILL",
});

if (resultado.error) {
  const colgado = resultado.error.code === "ETIMEDOUT";
  console.warn(
    colgado
      ? `[afeleia] el generador no termino en ${TIMEOUT_MS / 1000}s y se corto. ${CONSERVADO}`
      : `[afeleia] no se pudo ejecutar el generador (${resultado.error.message}). ${CONSERVADO}`,
  );
  process.exit(0);
}

if (resultado.signal) {
  console.warn(`[afeleia] el generador termino por senal ${resultado.signal}. ${CONSERVADO}`);
  process.exit(0);
}

if (resultado.status !== 0) {
  console.warn(`[afeleia] el snapshot no se pudo refrescar (codigo ${resultado.status}). ${CONSERVADO}`);
  process.exit(0);
}

console.info("[afeleia] snapshot refrescado para este build.");
