#!/usr/bin/env node
/**
 * Sello de procedencia de `data/catalogo-fallback.json`.
 *
 * El snapshot es salida de `npm run catalogo:snapshot`, nunca un archivo que se
 * edita a mano — pero eso era una regla escrita en la documentación, y una regla
 * que nadie puede ver desde el editor no es un control. Este sello la vuelve
 * verificable: `tests/catalogo-snapshot-integridad.test.mjs` se pone rojo cuando
 * el JSON y su hash dejan de coincidir.
 *
 * No es a prueba de manipulación: quien edite el snapshot puede recalcular el
 * sello. Lo que evita es la edición SILENCIOSA, que es la que costó un incidente.
 *
 * Uso:
 *   npm run catalogo:sellar     (lo llama también `catalogo:snapshot` al terminar)
 */

import { link, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SNAPSHOT = path.join(ROOT, "data", "catalogo-fallback.json");
const SELLO = path.join(ROOT, "data", "catalogo-fallback.integrity.json");
const CANDADO = path.join(ROOT, "data", "catalogo-fallback.lock");

/** Los dos archivos del fallback, para quien tenga que restaurarlos. */
export const RUTA_SNAPSHOT = SNAPSHOT;
export const RUTA_SELLO = SELLO;
/** El candado que serializa a los que refrescan o reparan el par. */
export const RUTA_CANDADO = CANDADO;

/**
 * Escribe reemplazando de una sola vez: primero a un temporal, después `rename`.
 *
 * `writeFile` directo TRUNCA el destino y recién entonces escribe. Si el proceso
 * muere en el medio —y el generador corre dentro de un build, que puede quedarse
 * sin tiempo o sin memoria— el fallback queda como medio JSON: `next build` no
 * lo puede importar y el sitio pierde su última línea de defensa justo mientras
 * intenta desplegarse. `rename` en el mismo volumen es atómico: o está el
 * archivo viejo entero, o está el nuevo entero.
 */
export async function escribirAtomico(destino, contenido) {
  // El temporal lleva PID y un identificador unico, y eso NO es cosmetica: con un
  // nombre fijo (`<destino>.tmp`) dos escritores sobre el mismo checkout se
  // pisaban —el primero en renombrar se llevaba el archivo que el otro estaba por
  // renombrar, y el segundo moria con ENOENT—. Pasa con dos builds en paralelo,
  // con un `catalogo:snapshot` a mano mientras corre un build, y con cualquier
  // agente que dispare las dos cosas. Cada escritor con su temporal no compite.
  const temporal = `${destino}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`;
  try {
    // `recursive` porque una ruta temporal vieja puede haber quedado como
    // carpeta: sin esto, `writeFile` fallaba con EISDIR y nada la limpiaba.
    await rm(temporal, { recursive: true, force: true }).catch(() => {});
    await writeFile(temporal, contenido, "utf8");
    await renombrarConReintento(temporal, destino);
  } catch (error) {
    // Sin esto, un `rename` que falla —el destino bloqueado, por ejemplo— deja
    // el temporal tirado en `data/`, donde alguien termina commiteandolo.
    await rm(temporal, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

/** Errores de Windows que significan "el destino esta ocupado ahora mismo". */
const OCUPADO = new Set(["EPERM", "EACCES", "EBUSY"]);

/**
 * `rename` con reintento corto sobre el destino ocupado.
 *
 * En Linux —donde construye Netlify— `rename` reemplaza atomicamente aunque haya
 * otro escritor: no hace falta reintentar y este bucle nunca corre. En Windows,
 * en cambio, reemplazar un archivo que otro proceso tiene abierto un instante
 * falla con EPERM, asi que dos generadores simultaneos en la maquina de
 * desarrollo se rechazaban entre si. Ceder unos milisegundos y reintentar
 * convierte esa colision en una espera; si el destino sigue ocupado despues de
 * ~500 ms, el error es real y se propaga.
 */
async function renombrarConReintento(temporal, destino, intentos = 10) {
  for (let intento = 1; ; intento += 1) {
    try {
      await rename(temporal, destino);
      return;
    } catch (error) {
      const ocupado = OCUPADO.has(error?.code);
      if (!ocupado || intento >= intentos) throw error;
      await new Promise((listo) => setTimeout(listo, intento * 10));
    }
  }
}

/**
 * --- El candado: un solo escritor por checkout --------------------------------
 *
 * El protocolo del par sobrevive a que el proceso MUERA, y eso ya estaba. Lo que
 * no sobrevivia era que hubiera DOS: la tercera ronda de review largo dos
 * generadores, dejo al primero pausado justo despues de leer el snapshot para
 * sellarlo, dejo que el segundo escribiera y confirmara entero, y recien entonces
 * dejo al primero escribir su sello. Quedo snapshot del segundo con sello del
 * primero, sin respaldos —el segundo los retiro al confirmar, porque para el todo
 * habia salido bien— y el build en verde.
 *
 * Escrituras atomicas de a un archivo no alcanzan para eso: el problema no es
 * cada `rename`, es que la secuencia entera —respaldar, escribir, sellar,
 * verificar, confirmar— tiene que ser de UN escritor a la vez. Serializar es la
 * unica forma; versionar el par seria mas caro y no compra nada mas aca, donde
 * los escritores viven en la misma maquina y el par tiene un solo dueño.
 *
 * Reglas del candado, todas por un motivo:
 *
 *   - **se toma con `wx`**, que es una creacion atomica del sistema de archivos:
 *     dos procesos no pueden crearlo los dos;
 *   - **la espera es acotada** (~20 s): pasada, el que espera NO refresca y se
 *     queda con lo que hay, porque un refresco que no sale es una molestia y un
 *     build colgado es un despliegue perdido;
 *   - **un candado vencido se roba** (~60 s, y la seccion critica son cuatro
 *     escrituras de disco): sin esto, un proceso muerto con SIGKILL dejaria el
 *     par bloqueado para siempre, que es cambiar una falla rara por una peor;
 *   - **solo lo suelta su dueño**: se compara el contenido antes de borrarlo, asi
 *     el que se pasa de tiempo no le retira el candado al que se lo robo.
 *
 * La primera version de esto tenia adentro el bug que venia a cerrar, y lo midio
 * la revision siguiente: `open(wx)` crea el archivo VACIO y escribe el dueño
 * despues, asi que habia un instante en el que el candado existia sin contenido.
 * El que llegaba segundo lo leia vacio, no lo podia parsear, lo tomaba por
 * abandonado y se lo robaba a un dueño vivo: dos escritores adentro, que es
 * exactamente el P1 que este candado vino a cerrar. Por eso ahora el candado se
 * publica con `link()` —el contenido ya esta completo cuando el nombre aparece—
 * y por eso un candado ilegible NO se roba por ilegible: se juzga por la edad del
 * archivo, como cualquier otro.
 */

/** Cuanto se espera a que se libere antes de rendirse y no refrescar. */
const ESPERA_MAXIMA_MS = 20_000;

/**
 * A partir de cuanto un candado se considera abandonado.
 *
 * La seccion critica que protege son cuatro escrituras de disco: si sigue tomado
 * un minuto despues, el dueño no existe. El `fetch` a la API pasa ANTES de tomar
 * el candado, a proposito: una API lenta no puede bloquear al que quiere reparar.
 */
const CANDADO_VENCIDO_MS = 60_000;

/** Codigos de `link` que significan "este sistema de archivos no sabe hacerlo". */
const SIN_ENLACES = new Set(["EPERM", "EACCES", "ENOSYS", "EXDEV", "EOPNOTSUPP", "EMLINK"]);

/** Error de "no se pudo tomar el candado", para distinguirlo de un fallo de disco. */
export class CandadoOcupado extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = "CandadoOcupado";
    this.code = "CANDADO_OCUPADO";
  }
}

/** Si la ruta existe, sea archivo o carpeta. */
async function existeRuta(ruta) {
  try {
    await stat(ruta);
    return true;
  } catch {
    return false;
  }
}

/** Edad del archivo segun su mtime, o `null` si no se puede saber. */
async function edadPorArchivo(ruta) {
  try {
    return Date.now() - (await stat(ruta)).mtimeMs;
  } catch {
    return null;
  }
}

/**
 * Saca el candado y dice si REALMENTE salio.
 *
 * `recursive` porque una ruta vieja puede haber quedado como carpeta —la misma
 * leccion que ya estaba escrita en `escribirAtomico`—, y se comprueba que haya
 * salido porque devolver "lo saque" sin haberlo sacado convierte la espera en un
 * bucle apretado: medido, un core al 100% durante los 20 segundos enteros.
 */
async function sacarCandado(candado) {
  await rm(candado, { force: true, recursive: true }).catch(() => {});
  return !(await existeRuta(candado));
}

/**
 * Toma el candado, o `null` si ya esta tomado.
 *
 * El contenido se escribe en un temporal y el candado se PUBLICA con `link()`:
 * cuando el nombre aparece, el dueño ya esta escrito. `link` falla con EEXIST si
 * el nombre existe, que es la misma atomicidad que daba `open(wx)` pero sin la
 * ventana del archivo vacio. Donde no hay enlaces duros —FAT, algunos montajes
 * de red— se cae al modo anterior, y ahi la ventana la cubre la regla de que un
 * candado ilegible no se roba por ilegible.
 */
async function intentarTomar(candado) {
  const dueño = JSON.stringify({
    pid: process.pid,
    host: os.hostname(),
    desde: Date.now(),
    id: randomUUID(),
  });

  const temporal = `${candado}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`;
  try {
    await writeFile(temporal, dueño, "utf8");
    try {
      await link(temporal, candado);
      return dueño;
    } catch (error) {
      if (error?.code === "EEXIST") return null;
      if (!SIN_ENLACES.has(error?.code)) throw error;
      // Sin enlaces duros: creacion exclusiva y escritura, como antes.
      let archivo;
      try {
        archivo = await open(candado, "wx");
      } catch (fallo) {
        if (fallo?.code === "EEXIST") return null;
        throw fallo;
      }
      try {
        await archivo.writeFile(dueño, "utf8");
      } finally {
        // Se cierra enseguida: un candado con el descriptor abierto no se puede
        // borrar en Windows, ni siquiera por su dueño.
        await archivo.close();
      }
      return dueño;
    }
  } finally {
    await rm(temporal, { force: true, recursive: true }).catch(() => {});
  }
}

/**
 * Si el proceso que dice tener el candado sigue vivo EN ESTA MAQUINA.
 *
 * `kill(pid, 0)` no manda ninguna señal: solo pregunta si el proceso existe.
 * Sirve para el caso que importa —el generador muerto con SIGKILL, que no
 * alcanza a soltar nada— y que sin esto obligaba a esperar el minuto entero
 * ANTES de poder reparar el par, dentro de un build. Un candado de otra maquina,
 * o con un pid que no es un pid, no se puede juzgar asi: se respeta, y decide la
 * edad. El pid se valida porque `kill(0)` y `kill(-1)` son selectores de GRUPO en
 * Linux y devuelven exito: sin validarlo, el mismo archivo se juzgaria al reves
 * en la maquina donde construye Netlify.
 */
function dueñoVivo(dueño) {
  if (!Number.isInteger(dueño.pid) || dueño.pid <= 0) return true;
  if (dueño.host !== os.hostname()) return true;
  try {
    process.kill(dueño.pid, 0);
    return true;
  } catch (error) {
    // EPERM = existe pero es de otro usuario. ESRCH = no existe.
    return error?.code === "EPERM";
  }
}

/** Roba el candado si esta vencido o su dueño ya no existe. Devuelve si lo robo. */
async function robarSiVencido(candado, vencidoMs) {
  const crudo = await leerSiExiste(candado);
  if (crudo === null && !(await existeRuta(candado))) return true; // se libero solo

  let dueño = null;
  try {
    const leido = JSON.parse(crudo ?? "");
    if (leido && typeof leido === "object") dueño = leido;
  } catch {
    // Ilegible: se decide abajo, por la edad del archivo.
  }

  // Un candado ilegible NO se roba por ilegible. Puede ser el instante en que
  // otro proceso lo esta publicando —o un candado que quedo a medias por un disco
  // lleno—, y robarlo ahi mete a dos escritores en la seccion critica: es el bug
  // que tenia la primera version de este archivo. Se juzga por la edad, que
  // existe aunque el contenido no sirva.
  if (dueño === null) {
    const edad = await edadPorArchivo(candado);
    if (edad === null || edad < vencidoMs) return false;
    console.warn(
      "[afeleia] el candado del snapshot esta ilegible y sin tocar hace " +
        `${Math.round(edad / 1000)}s: se lo saca y se sigue.`,
    );
    return sacarCandado(candado);
  }

  const muerto = !dueñoVivo(dueño);
  // `desde` tiene que ser un numero para poder juzgar por contenido. Cualquier
  // otra cosa se mira por el archivo: tratar un `desde` raro como "infinitamente
  // viejo" le robaba el candado a un dueño vivo al instante.
  const edad =
    typeof dueño.desde === "number" && Number.isFinite(dueño.desde)
      ? Date.now() - dueño.desde
      : ((await edadPorArchivo(candado)) ?? 0);

  if (!muerto && edad < vencidoMs) return false;
  console.warn(
    muerto
      ? `[afeleia] el proceso que tenia el candado del snapshot (pid ${dueño.pid}) ya no existe: ` +
          "se lo saca y se sigue."
      : `[afeleia] candado del snapshot abandonado hace ${Math.round(edad / 1000)}s ` +
          `(pid ${dueño.pid} en ${dueño.host}): se lo saca y se sigue.`,
  );
  return sacarCandado(candado);
}

/**
 * Corre `tarea` con el par tomado, y lo suelta pase lo que pase.
 *
 * Lo que va adentro es TODO el protocolo —respaldar, escribir, sellar, verificar,
 * confirmar—: partirlo devuelve la carrera que este candado vino a cerrar.
 *
 * @throws {CandadoOcupado} si no se pudo tomar dentro de la espera
 */
export async function conElParTomado(tarea, opciones = {}) {
  const candado = opciones.candado ?? CANDADO;
  const esperaMs = opciones.esperaMs ?? ESPERA_MAXIMA_MS;
  const vencidoMs = opciones.vencidoMs ?? CANDADO_VENCIDO_MS;
  const limite = Date.now() + esperaMs;

  for (let intento = 0; ; intento += 1) {
    const dueño = await intentarTomar(candado);
    if (dueño !== null) {
      try {
        return await tarea();
      } finally {
        // Solo si sigue siendo nuestro: si se vencio y otro se lo llevo, borrarlo
        // le sacaria el candado a alguien que esta escribiendo ahora mismo.
        const actual = await leerSiExiste(candado);
        if (actual === dueño) await rm(candado, { force: true }).catch(() => {});
      }
    }

    const robado = await robarSiVencido(candado, vencidoMs);
    // El limite se mira en CADA vuelta, incluso despues de robar: si alguien
    // recreara el candado sin parar, saltearse esta comprobacion seria un bucle
    // infinito adentro de un build.
    const restante = limite - Date.now();
    if (restante <= 0) {
      throw new CandadoOcupado(
        `otro proceso tiene tomado el snapshot desde hace mas de ${Math.round(esperaMs / 1000)}s ` +
          `(${path.basename(candado)})`,
      );
    }
    // Si lo sacamos, se reintenta ya. Si no —incluido el caso en que el borrado
    // fallo—, espera corta, con tope y sin pasarse del limite: sin esto, un
    // candado que no se puede borrar convierte la espera en un bucle apretado que
    // quema un core entero.
    if (!robado) {
      const dormir = Math.min(50 * (intento + 1), 500, restante);
      await new Promise((listo) => setTimeout(listo, dormir));
    }
  }
}
/**
 * --- El par: snapshot + sello -------------------------------------------------
 *
 * Los dos archivos describen una sola cosa y el sistema de archivos no sabe
 * reemplazar dos de una vez: entre un `rename` y el otro hay una ventana, y morir
 * ahi deja un snapshot nuevo con un sello viejo. Cerrar la ventana no se puede;
 * lo que se puede es que un par a medias sea siempre DETECTABLE y REPARABLE.
 *
 * El protocolo, en cuatro pasos: respaldar los dos archivos, escribir, verificar
 * el par contra el disco, y recien entonces retirar el respaldo. Si algo falla en
 * el medio se vuelve al respaldo; y si el proceso muere sin llegar a retirarlo,
 * el respaldo queda en disco y la corrida siguiente lo encuentra y decide —por el
 * estado del par, no por adivinanza— si reparar o confirmar.
 *
 * El respaldo NO es un archivo mas que alguien tenga que limpiar: se retira solo
 * en la misma corrida, y si sobrevive es porque hubo una muerte. `data/*.bak`
 * esta ignorado por git para que un respaldo huerfano no termine commiteado.
 */

/** Ruta del respaldo de un archivo del par. */
export const rutaDeRespaldo = (ruta) => `${ruta}.bak`;

/** Contenido de un archivo, o `null` si no existe o no se puede leer. */
async function leerSiExiste(ruta) {
  try {
    return await readFile(ruta, "utf8");
  } catch {
    return null;
  }
}

/**
 * Si el sello que hay en disco describe al snapshot que hay en disco.
 *
 * Es la unica pregunta que importa despues de una escritura interrumpida, y la
 * responde el mismo hash que usa el test de integridad: si el par cierra, el
 * refresco termino; si no cierra, quedo a medias.
 *
 * @returns {Promise<{coherente: boolean, motivo: string | null}>}
 */
export async function estadoDelPar(snapshot = SNAPSHOT, sello = SELLO) {
  const [crudoSnapshot, crudoSello] = await Promise.all([
    leerSiExiste(snapshot),
    leerSiExiste(sello),
  ]);
  if (crudoSnapshot === null) return { coherente: false, motivo: "no hay snapshot" };
  if (crudoSello === null) return { coherente: false, motivo: "no hay sello" };

  let catalogo;
  let marca;
  try {
    catalogo = JSON.parse(crudoSnapshot);
  } catch {
    return { coherente: false, motivo: "el snapshot no es JSON legible" };
  }
  try {
    marca = JSON.parse(crudoSello);
  } catch {
    return { coherente: false, motivo: "el sello no es JSON legible" };
  }

  // `marca?.hash` y no `marca.hash`: un sello que contiene el literal `null` es
  // JSON valido y parsea a `null`, y leerle una propiedad tiraba un TypeError
  // que nadie captura — el prebuild moria con un stack trace en vez del mensaje
  // que esta funcion existe para dar.
  if (typeof marca !== "object" || marca === null || Array.isArray(marca)) {
    return { coherente: false, motivo: "el sello no es un objeto" };
  }
  if (typeof catalogo !== "object" || catalogo === null || Array.isArray(catalogo)) {
    return { coherente: false, motivo: "el snapshot no es un objeto" };
  }
  if (hashCatalogo(catalogo) !== marca.hash) {
    return { coherente: false, motivo: "el hash del sello no describe a este snapshot" };
  }
  if (marca.generado_en !== catalogo.generado_en) {
    return { coherente: false, motivo: "el sello y el snapshot declaran distinto generado_en" };
  }
  if (marca.productos !== catalogo.productos?.length) {
    return { coherente: false, motivo: "el sello cuenta otra cantidad de productos" };
  }
  return { coherente: true, motivo: null };
}

/** Deja una copia de los dos archivos antes de tocarlos. */
export async function respaldarPar(snapshot = SNAPSHOT, sello = SELLO) {
  for (const ruta of [snapshot, sello]) {
    const contenido = await leerSiExiste(ruta);
    if (contenido !== null) await escribirAtomico(rutaDeRespaldo(ruta), contenido);
  }
}

/** Retira el respaldo: el par nuevo quedo escrito y verificado. */
export async function confirmarPar(snapshot = SNAPSHOT, sello = SELLO) {
  await Promise.all(
    [snapshot, sello].map((ruta) =>
      rm(rutaDeRespaldo(ruta), { force: true }).catch(() => {}),
    ),
  );
}

/** Vuelve los dos archivos a su respaldo. Devuelve los que no se pudieron restaurar. */
export async function restaurarPar(snapshot = SNAPSHOT, sello = SELLO) {
  const fallos = [];
  for (const ruta of [snapshot, sello]) {
    const respaldo = await leerSiExiste(rutaDeRespaldo(ruta));
    if (respaldo === null) continue;
    try {
      await escribirAtomico(ruta, respaldo);
    } catch (error) {
      fallos.push(`${path.basename(ruta)} (${error instanceof Error ? error.message : error})`);
    }
  }
  return fallos;
}

/**
 * Como quedo el snapshot del disco FRENTE a su respaldo.
 *
 * Es lo unico que permite decir la verdad despues de que un generador se corta:
 * "sin-respaldo" es que nadie llego a tocar el par —sigue el committeado—,
 * "igual" es que se respaldo pero no se alcanzo a escribir, y "distinto" es que
 * el refresco nuevo SI quedo. El wrapper afirmaba siempre lo primero, y la
 * tercera ronda de review mostro que podia ser falso.
 *
 * @returns {Promise<"sin-respaldo" | "igual" | "distinto">}
 */
export async function frenteAlRespaldo(ruta = SNAPSHOT) {
  const [actual, respaldo] = await Promise.all([
    leerSiExiste(ruta),
    leerSiExiste(rutaDeRespaldo(ruta)),
  ]);
  if (respaldo === null) return "sin-respaldo";
  return actual === respaldo ? "igual" : "distinto";
}

/** Si quedo un respaldo de una corrida anterior sin retirar. */
export async function hayRespaldoPendiente(snapshot = SNAPSHOT, sello = SELLO) {
  const respaldos = await Promise.all(
    [snapshot, sello].map((ruta) => leerSiExiste(rutaDeRespaldo(ruta))),
  );
  return respaldos.some((contenido) => contenido !== null);
}

/**
 * Restaura el par desde el respaldo y lo retira **solo si la restauracion salio**.
 *
 * La tercera ronda de review encontro justo lo contrario: se convirtio el destino
 * en una carpeta para forzar un `EPERM`, `restaurarPar` devolvio el fallo... y el
 * respaldo se borraba igual. O sea que el unico camino de recuperacion que le
 * quedaba al sitio se consumia en el intento que fallo, y la corrida siguiente ya
 * no tenia de donde volver. Un respaldo se retira cuando sobra, nunca cuando
 * podria hacer falta: si la restauracion no cerro, el `.bak` se queda y el
 * proximo prebuild vuelve a intentar.
 *
 * @returns {Promise<{restaurado: boolean, fallos: string[], motivo: string | null}>}
 */
export async function repararDesdeRespaldo(snapshot = SNAPSHOT, sello = SELLO) {
  const fallos = await restaurarPar(snapshot, sello);
  // No alcanza con que las escrituras no hayan tirado: lo que importa es si el par
  // que quedo EN EL DISCO cierra.
  const estado = await estadoDelPar(snapshot, sello);
  const restaurado = fallos.length === 0 && estado.coherente;
  if (restaurado) await confirmarPar(snapshot, sello);
  return { restaurado, fallos, motivo: estado.motivo };
}

/**
 * Deja el par en un estado coherente antes de que nadie lo lea.
 *
 * Se llama al empezar el prebuild. Si hay respaldo pendiente, alguien murio en el
 * medio de un refresco, y hay dos escenarios que se distinguen mirando el par y
 * no adivinando:
 *
 *   - **el par NO cierra** → murio entre los dos renames: se vuelve al respaldo,
 *     que es el ultimo par que si cerraba;
 *   - **el par cierra** → murio despues de escribir los dos y antes de retirar el
 *     respaldo: reparar aca seria PERDER un refresco bueno, asi que solo se
 *     retira el respaldo.
 *
 * Si la reparacion NO sale, el respaldo se conserva: es el ultimo par que cerraba
 * y consumirlo en un intento fallido deja al sitio sin nada a lo que volver.
 *
 * @returns {Promise<{habiaRespaldo: boolean, reparado: boolean, motivo: string | null, fallos: string[], respaldoConservado: boolean}>}
 */
export async function recuperarPar(snapshot = SNAPSHOT, sello = SELLO) {
  if (!(await hayRespaldoPendiente(snapshot, sello))) {
    return {
      habiaRespaldo: false,
      reparado: false,
      motivo: null,
      fallos: [],
      respaldoConservado: false,
    };
  }

  const estado = await estadoDelPar(snapshot, sello);
  if (estado.coherente) {
    await confirmarPar(snapshot, sello);
    return {
      habiaRespaldo: true,
      reparado: false,
      motivo: null,
      fallos: [],
      respaldoConservado: false,
    };
  }

  const reparacion = await repararDesdeRespaldo(snapshot, sello);
  return {
    habiaRespaldo: true,
    reparado: reparacion.restaurado,
    motivo: estado.motivo,
    fallos: reparacion.fallos,
    respaldoConservado: !reparacion.restaurado,
  };
}

/**
 * Hash del CONTENIDO, no del archivo.
 *
 * Se reserializa lo parseado a propósito: el repo no tiene `.gitattributes`, así
 * que un checkout con conversión CRLF cambiaría los bytes sin cambiar un solo
 * dato — y un sello que se rompe solo por eso se desactiva a los dos días.
 */
export function hashCatalogo(payload) {
  return createHash("sha256").update(JSON.stringify(payload), "utf8").digest("hex");
}

/**
 * Escribe el sello del snapshot.
 *
 * `catalogo` es lo que el generador ACABA de escribir, y pasarlo no es un ahorro
 * de una lectura: sellar releyendo el disco es sellar lo que haya en el disco en
 * ese instante, que con dos escritores puede ser el snapshot del otro. Sellar el
 * contenido propio deja el par siempre describiendo una sola generacion. Sin
 * argumento se relee —es el modo `npm run catalogo:sellar`, que existe para
 * volver a sellar lo que ya esta committeado.
 */
export async function sellar(catalogo, rutas = {}) {
  const rutaSnapshot = rutas.snapshot ?? SNAPSHOT;
  const rutaSello = rutas.sello ?? SELLO;
  const snapshot = catalogo ?? JSON.parse(await readFile(rutaSnapshot, "utf8"));
  const sello = {
    algoritmo: "sha256",
    hash: hashCatalogo(snapshot),
    generado_en: snapshot.generado_en,
    sellado_en: new Date().toISOString(),
    productos: snapshot.productos.length,
  };
  await escribirAtomico(rutaSello, `${JSON.stringify(sello, null, 2)}\n`);
  return sello;
}

// Solo cuando se ejecuta directo: importarlo desde un test no debe escribir nada.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Con el candado tomado: sellar mientras un generador escribe produce
  // exactamente el par incoherente que el sello existe para detectar.
  try {
    const sello = await conElParTomado(() => sellar());
    console.info(
      `Sello escrito: ${sello.productos} productos, generado_en ${sello.generado_en}\n` +
        `  sha256 ${sello.hash}`,
    );
  } catch (error) {
    // Un stack trace no le dice a nadie que hay OTRO proceso escribiendo; el
    // mensaje si, y la accion que sigue es esperar y volver a intentar.
    if (!(error instanceof CandadoOcupado)) throw error;
    console.error(`${error.message}. El sello NO se toco.`);
    process.exitCode = 1;
  }
}
