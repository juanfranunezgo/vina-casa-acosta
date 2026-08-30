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
  hayRespaldoPendiente,
  recuperarPar,
} from "./catalogo-integridad.mjs";
import {
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
 * Techo duro del paso entero, por encima del que ya tiene el fetch del generador.
 *
 * Son dos relojes a proposito: el de adentro cubre la API que no contesta, este
 * cubre todo lo demas —DNS que no resuelve, disco trabado, un generador que se
 * cuelga por un motivo que hoy no existe—. Colgarse es la peor de las fallas
 * posibles aca: no se distingue de "esta tardando", consume el timeout global
 * del build y termina impidiendo desplegar.
 */
const TIMEOUT_MS = 45_000;

/**
 * Cierra el paso mirando lo que quedó en el disco, no lo que se quiso hacer.
 *
 * Se llama por TODOS los caminos —refresco exitoso, API caída, generador
 * colgado, sin configuración—: es la única puerta por la que se pasa a
 * `next build`, así que es donde tiene sentido preguntar si queda algo servible.
 */
async function cerrar() {
  const crudo = await readFile(RUTA_SNAPSHOT, "utf8").catch(() => null);
  // El tenant se mira acá igual que el contrato: un snapshot ajeno es servible
  // —cumple el contrato— y publicarlo es publicar el catálogo de otro cliente.
  const razon = razonParaNoDesplegar(crudo, process.env.NEXT_PUBLIC_AFELEIA_SITIO);
  if (razon) {
    if (process.env.AFELEIA_PERMITIR_SIN_CATALOGO === "1") {
      console.warn(
        `[afeleia] ${razon}\n` +
          "[afeleia] AFELEIA_PERMITIR_SIN_CATALOGO=1: se construye igual, con la tienda " +
          "vacia. Es una decision operativa deliberada; sacar la variable despues.",
      );
      process.exit(0);
    }

    console.error(
      `[afeleia] ${razon}\n` +
        "[afeleia] Como salir: regenerar el snapshot con `npm run catalogo:snapshot` contra " +
        "una API sana y commitearlo, o —si hace falta publicar YA con la tienda vacia— " +
        "volver a desplegar con AFELEIA_PERMITIR_SIN_CATALOGO=1.",
    );
    process.exit(1);
  }

  // Segunda puerta: el par tiene que CERRAR. Que el snapshot sea servible no dice
  // de donde salio, y la tercera ronda de review dejo justo eso —snapshot de un
  // generador, sello de otro, sin respaldos— con el build en verde. Un par que no
  // cierra significa que alguien toco la ultima linea de defensa del sitio sin
  // que el protocolo lo acompanara: se intenta reparar y, si no cierra igual, no
  // se despliega. En un hosting atomico eso deja publicado lo anterior, entero.
  let estado = await estadoDelPar();
  if (!estado.coherente && (await hayRespaldoPendiente())) {
    await repararLoQueHayaQuedadoAMedias("antes de construir");
    estado = await estadoDelPar();
  }
  if (estado.coherente) process.exit(0);

  const detalle =
    `el snapshot y su sello no cierran (${estado.motivo}): no se sabe que catalogo se ` +
    "estaria desplegando.";
  if (process.env.AFELEIA_PERMITIR_PAR_A_MEDIAS === "1") {
    console.warn(
      `[afeleia] ${detalle}\n` +
        "[afeleia] AFELEIA_PERMITIR_PAR_A_MEDIAS=1: se construye igual. Es una decision " +
        "operativa deliberada; sacar la variable despues.",
    );
    process.exit(0);
  }

  console.error(
    `[afeleia] ${detalle}\n` +
      "[afeleia] Como salir: `npm run catalogo:snapshot` contra una API sana (regenera y " +
      "sella el par), o `npm run catalogo:sellar` si el snapshot es el bueno y lo unico " +
      "desactualizado es el sello. Para publicar YA con lo que hay: " +
      "AFELEIA_PERMITIR_PAR_A_MEDIAS=1.",
  );
  process.exit(1);
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
    const reparacion = await conElParTomado(() => recuperarPar());
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
