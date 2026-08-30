#!/usr/bin/env node
/**
 * Paso previo a `next build`. Hace tres cosas, en este orden, y cada una salió de
 * una falla real:
 *
 *   1. **repara** un par snapshot/sello que haya quedado a medias por una muerte
 *      anterior, ANTES de que el build lea nada;
 *   2. **refresca** el snapshot de fallback contra la API, sin poder hacer fallar
 *      el build por una caída de Afeleia;
 *   3. **decide si corresponde construir**: si no queda catálogo servible, corta.
 *
 * Por qué una caída no puede fallar el build. `data/catalogo-fallback.json` es lo
 * que el sitio sirve cuando Afeleia no responde. Si Afeleia está caído y además
 * impide desplegar, una caída se convierte en dos: el paso avisa, conserva el
 * snapshot committeado —que existe exactamente para eso— y el build sigue.
 *
 * Por qué un snapshot INSERVIBLE sí lo falla. Es el otro extremo, y hasta la
 * segunda ronda de review no estaba cubierto: con la API caída y el snapshot
 * corrupto, el build salía verde y publicaba una tienda vacía, reemplazando la
 * última versión buena del sitio. Netlify despliega atómicamente: si el build
 * falla, el deploy anterior sigue publicado con sus productos. Fallar es lo
 * seguro. Se puede forzar el build igual con `AFELEIA_PERMITIR_SIN_CATALOGO=1`,
 * que es una decisión operativa deliberada y queda escrita en el log.
 *
 * Y por qué una configuración rota lo falla también: una variable vacía, con
 * espacios o a medias no es una caída — deja el sitio degradado PARA SIEMPRE, en
 * verde. Se detecta acá, donde todavía se puede arreglar.
 *
 * Lo que frena un deploy, entonces, es exactamente esto y nada más:
 *
 *   · configuración inválida (`razonDeConfiguracionInvalida`);
 *   · sin catálogo servible, o de OTRO sitio (`razonParaNoDesplegar`) —
 *     escotilla `AFELEIA_PERMITIR_SIN_CATALOGO=1`;
 *   · el par snapshot/sello no cierra después de intentar repararlo —
 *     escotilla `AFELEIA_PERMITIR_PAR_A_MEDIAS=1`.
 *
 * Una caída de Afeleia no está en la lista, y es la regla que ordena todo lo
 * demás.
 *
 * Qué NO hace: no commitea nada. El snapshot refrescado vive en el artefacto de
 * ese deploy. El committeado es el piso, y se actualiza con
 * `npm run catalogo:snapshot` cuando alguien quiere subirlo.
 */
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
// `@next/env` es CommonJS: el named import no existe desde ESM.
import entornoDeNext from "@next/env";
import {
  CandadoOcupado,
  RUTA_SNAPSHOT,
  conElParTomado,
  estadoDelPar,
  frenteAlRespaldo,
  recuperarPar,
} from "./catalogo-integridad.mjs";
import {
  decisionDeCierre,
  razonDeConfiguracionInvalida,
  razonParaNoDesplegar,
} from "./catalogo-validacion.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const GENERADOR = path.join(AQUI, "catalogo-snapshot.mjs");
const RAIZ = path.join(AQUI, "..");

/**
 * Las MISMAS variables que va a ver `next build`.
 *
 * `next build` carga `.env.local` y `.env`; este script, que corre antes y en
 * otro proceso, solo veia las del shell. Con eso las dos capas comparaban contra
 * configuraciones distintas: en una maquina con `.env.local` apuntando a otro
 * slug, el prebuild decia "sin API/SITIO" y dejaba pasar, y el runtime —que si
 * leia el archivo— se encontraba con un snapshot que no era de su sitio y servia
 * la tienda vacia, con el build en verde. Es la misma clase de agujero que las
 * dos capas que no miraban lo mismo.
 *
 * En Netlify no cambia nada: ahi las variables son variables de entorno de
 * verdad y no hay `.env*` en el repo.
 *
 * `loadEnvConfig` es el cargador de Next (`@next/env`, dependencia fija de
 * `next`), y no un parser propio: un `.env` se lee exactamente igual de los dos
 * lados o la contencion vuelve a ser aparente.
 */
entornoDeNext.loadEnvConfig(RAIZ, false, {
  info: (mensaje) => console.info(`[afeleia] ${mensaje}`),
  error: (mensaje) => console.error(`[afeleia] ${mensaje}`),
});

const CONSERVADO =
  "El build sigue con el snapshot committeado: una caida de Afeleia no puede " +
  "ademas impedir desplegar.";

/**
 * Techo del `spawnSync` del generador.
 *
 * Son dos relojes a proposito: el de adentro cubre la API que no contesta, este
 * cubre todo lo demas —DNS que no resuelve, disco trabado, un generador que se
 * cuelga por un motivo que hoy no existe—. Colgarse es la peor de las fallas
 * posibles aca: no se distingue de "esta tardando", consume el timeout global
 * del build y termina impidiendo desplegar.
 *
 * NO es el techo del paso entero, y decirlo importa: a esto se le suman las
 * esperas del candado de este mismo script (`ESPERA_DEL_CANDADO_MS` por cada
 * reparacion y por la lectura de cierre). El techo real del paso es
 * 45 + 5 x 3 = **60 s**, y esta acotado a proposito: el generador espera el
 * candado 10 s como mucho (`--espera-candado`), asi que sus 15 s de fetch mas su
 * espera entran holgados en estos 45.
 */
const TIMEOUT_MS = 45_000;

/**
 * Cuanto espera ESTE script por el candado, en cada una de sus tres tomas.
 *
 * Corto a proposito: si otro proceso esta refrescando, lo que hay en disco es
 * suyo y va a quedar coherente; quedarse esperandolo adentro de un build es
 * convertir una molestia en un despliegue lento.
 */
const ESPERA_DEL_CANDADO_MS = 5_000;

/**
 * Lo que el build va a servir, leido de una sola vez y CON EL CANDADO TOMADO.
 *
 * Sin el candado, la muestra puede caer en el medio de un refresco ajeno —entre
 * el snapshot y su sello— y ahi el par se ve "a medias" sin que nada este mal:
 * es trabajo en vuelo. Decidir frenar un deploy sobre esa lectura seria frenar
 * un build inocente.
 *
 * Si el candado esta ocupado igual se lee, pero el estado del par se marca como
 * NO juzgable: el contenido del snapshot se puede mirar siempre —`escribirAtomico`
 * garantiza que sea el viejo entero o el nuevo entero— y lo unico que se suspende
 * es la puerta del par.
 */
async function loQueSeVaAServir() {
  const mirar = async () => ({
    crudo: await readFile(RUTA_SNAPSHOT, "utf8").catch(() => null),
    estado: await estadoDelPar(),
    juzgable: true,
  });
  try {
    return await conElParTomado(mirar, { esperaMs: ESPERA_DEL_CANDADO_MS });
  } catch (error) {
    if (!(error instanceof CandadoOcupado)) throw error;
    console.warn(
      "[afeleia] otro proceso esta escribiendo el snapshot: se construye con lo que hay y " +
        "no se juzga el par (la lectura seria de un refresco en vuelo).",
    );
    return { ...(await mirar()), juzgable: false };
  }
}

/**
 * Cierra el paso mirando lo que quedó en el disco, no lo que se quiso hacer.
 *
 * Se llama por TODOS los caminos —refresco exitoso, API caída, generador
 * colgado, sin configuración—: es la única puerta por la que se pasa a
 * `next build`, así que es donde tiene sentido preguntar si queda algo servible.
 *
 * El ORDEN importa y salió de una review: primero se repara lo que haya quedado
 * a medias, y recién después se juzga. Al revés, un par a medias hacía disparar
 * la puerta equivocada —«no queda catálogo servible»— con el respaldo bueno ahí
 * al lado, sin que nadie lo hubiera mirado; y la escotilla que ofrecía el
 * mensaje publicaba la tienda vacía en vez de restaurar.
 *
 * Qué se decide con lo leído vive en `decisionDeCierre`, que es pura y está
 * cubierta por tests: acá solo se lee el disco, se imprime y se sale.
 */
async function cerrar() {
  await repararLoQueHayaQuedadoAMedias("antes de construir");

  const { crudo, estado, juzgable } = await loQueSeVaAServir();
  const decision = decisionDeCierre({
    // El tenant se mira acá igual que el contrato: un snapshot ajeno es servible
    // —cumple el contrato— y publicarlo es publicar el catálogo de otro cliente.
    razon: razonParaNoDesplegar(crudo, process.env.NEXT_PUBLIC_AFELEIA_SITIO),
    parCoherente: estado.coherente,
    motivoDelPar: estado.motivo,
    parJuzgable: juzgable,
    env: process.env,
  });

  if (decision.mensaje) console[decision.nivel](decision.mensaje);
  process.exit(decision.salida);
}

/**
 * Deja el par en estado coherente antes de que el build lea nada.
 *
 * Con el candado tomado: reparar mientras otro escribe es la misma carrera que se
 * cerro del lado del generador, pero peor —esta le devuelve al disco un par
 * viejo—. Si el candado esta ocupado, el que lo tiene esta escribiendo un par
 * entero: no hay nada que reparar y se sigue.
 */
async function repararLoQueHayaQuedadoAMedias(momento) {
  try {
    const reparacion = await conElParTomado(() => recuperarPar(), {
      esperaMs: ESPERA_DEL_CANDADO_MS,
    });
    if (!reparacion.habiaRespaldo) return;
    if (reparacion.reparado) {
      console.warn(
        `[afeleia] ${momento}: el snapshot y su sello habian quedado a medias ` +
          `(${reparacion.motivo}). Se restauro el par anterior, que es el ultimo que cerraba.`,
      );
    } else if (reparacion.respaldoConservado) {
      // El respaldo NO se consume en un intento fallido: es el ultimo par que
      // cerraba, y el proximo prebuild vuelve a intentar con el.
      console.warn(
        `[afeleia] ${momento}: el par quedo a medias (${reparacion.motivo}) y NO se pudo ` +
          `restaurar${reparacion.fallos.length > 0 ? `: ${reparacion.fallos.join(", ")}` : ""}. ` +
          "El respaldo (data/*.bak) se conserva para el proximo intento.",
      );
    } else {
      console.info(
        `[afeleia] ${momento}: habia un respaldo pendiente de un refresco anterior y el par ` +
          "cierra; se conserva lo nuevo y se retira el respaldo.",
      );
    }
  } catch (error) {
    // Este paso no puede ser el que rompa el build.
    console.warn(
      error instanceof CandadoOcupado
        ? `[afeleia] ${momento}: otro proceso esta refrescando el snapshot; no se repara nada.`
        : `[afeleia] no se pudo revisar el par snapshot/sello (${error.message}).`,
    );
  }
}

await repararLoQueHayaQuedadoAMedias("al empezar");

const razonDeConfiguracion = razonDeConfiguracionInvalida(process.env);
if (razonDeConfiguracion) {
  console.error(
    `[afeleia] configuracion invalida: ${razonDeConfiguracion}\n` +
      "[afeleia] Esto NO es una caida de Afeleia: con esta configuracion el sitio se " +
      "construiria degradado para siempre y en verde. Corregir las variables en " +
      "Netlify -> Project configuration -> Environment variables.",
  );
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_AFELEIA_API_URL || !process.env.NEXT_PUBLIC_AFELEIA_SITIO) {
  console.info(
    `[afeleia] sin NEXT_PUBLIC_AFELEIA_API_URL/SITIO: no se refresca el snapshot. ${CONSERVADO}`,
  );
  await cerrar();
}

// Se delega en el generador de siempre en vez de repetir su logica: el es el
// unico que sabe localizar las imagenes a public/vinos y sellar el resultado.
// Si divergieran, el snapshot del build se veria distinto del generado a mano.
const resultado = spawnSync(process.execPath, [GENERADOR], {
  stdio: "inherit",
  timeout: TIMEOUT_MS,
  killSignal: "SIGKILL",
});

/**
 * Lo que se dice cuando el refresco no salio.
 *
 * El mensaje viejo afirmaba siempre «el build sigue con el snapshot committeado»,
 * y las dos ultimas rondas de review demostraron que podia ser falso de dos
 * maneras distintas: matando al generador entre los dos renames (el committeado
 * ya habia sido reemplazado) y matandolo despues de escribir y sellar (el par
 * cerraba, pero era el NUEVO). Ahora no se afirma nada sin mirar el disco: el
 * estado del par dice si cierra, y la comparacion con el respaldo dice si lo que
 * quedo es lo committeado o el refresco.
 */
async function contarComoQuedoElFallback(encabezado) {
  const estado = await estadoDelPar();
  const respaldo = await frenteAlRespaldo();

  if (estado.coherente && respaldo !== "distinto") {
    // Nadie alcanzo a reemplazar nada: lo que hay es lo committeado, palabra por
    // palabra. Es el unico caso en el que esa frase es verdadera.
    console.warn(`${encabezado} ${CONSERVADO}`);
  } else if (estado.coherente) {
    console.warn(
      `${encabezado} El refresco alcanzo a dejar un par COHERENTE y mas nuevo que el ` +
        "committeado: el build sigue con ESE. Una caida de Afeleia no puede ademas impedir " +
        "desplegar.",
    );
  } else {
    console.warn(
      `${encabezado} Ademas el par snapshot/sello quedo a medias (${estado.motivo}).`,
    );
  }

  await repararLoQueHayaQuedadoAMedias("despues del generador");
  await cerrar();
}

if (resultado.error) {
  const colgado = resultado.error.code === "ETIMEDOUT";
  await contarComoQuedoElFallback(
    colgado
      ? `[afeleia] el generador no termino en ${TIMEOUT_MS / 1000}s y se corto.`
      : `[afeleia] no se pudo ejecutar el generador (${resultado.error.message}).`,
  );
}

if (resultado.signal) {
  await contarComoQuedoElFallback(
    `[afeleia] el generador termino por senal ${resultado.signal}.`,
  );
}

if (resultado.status !== 0) {
  await contarComoQuedoElFallback(
    `[afeleia] el snapshot no se pudo refrescar (codigo ${resultado.status}).`,
  );
}

console.info("[afeleia] snapshot refrescado para este build.");
await cerrar();
