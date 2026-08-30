import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import { spawn } from "node:child_process";
import path from "node:path";
import {
  CandadoOcupado,
  conElParTomado,
  confirmarPar,
  escribirAtomico,
  estadoDelPar,
  frenteAlRespaldo,
  hashCatalogo,
  recuperarPar,
  repararDesdeRespaldo,
  respaldarPar,
  sellar,
} from "../scripts/catalogo-integridad.mjs";

/**
 * El snapshot y su sello son DOS archivos que describen una sola cosa, y el
 * sistema de archivos no sabe reemplazar dos archivos de una vez: entre un
 * `rename` y el otro hay una ventana. La review la abrio a proposito —mato el
 * generador justo ahi— y quedo un snapshot nuevo con un sello viejo, con el
 * wrapper anunciando que «el snapshot committeado quedo intacto», que era falso.
 *
 * Cerrar la ventana no se puede. Lo que si se puede, y es lo que estos tests
 * fijan, es que un par a medias sea SIEMPRE detectable y reparable:
 *
 *   1. antes de tocar nada se deja un respaldo de los dos archivos;
 *   2. despues de escribir se verifica el par contra el disco;
 *   3. si no cierra, se vuelve al respaldo;
 *   4. y si el proceso muere en el medio, el respaldo sigue ahi: la corrida
 *      siguiente lo encuentra y repara antes de que el build lea nada.
 */

const CATALOGO = {
  version: 1,
  sitio: "vina-casa-acosta",
  generado_en: "2026-08-28T12:00:00.000Z",
  categorias: [],
  productos: [
    { slug: "bera", nombre: "Bera", precio: 23000, imagenes: [], agotado: false, atributos: {} },
  ],
};

const OTRO_CATALOGO = {
  ...CATALOGO,
  generado_en: "2026-08-28T18:00:00.000Z",
  productos: [
    { slug: "guidai", nombre: "Guidai", precio: 25000, imagenes: [], agotado: false, atributos: {} },
  ],
};

const selloDe = (catalogo) => ({
  algoritmo: "sha256",
  hash: hashCatalogo(catalogo),
  generado_en: catalogo.generado_en,
  sellado_en: "2026-08-28T12:00:01.000Z",
  productos: catalogo.productos.length,
});

const existe = async (ruta) => {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
};

/** Un par committeado y coherente, en una carpeta propia. */
async function parSano(catalogo = CATALOGO) {
  const carpeta = await mkdtemp(path.join(tmpdir(), "catalogo-par-"));
  const snapshot = path.join(carpeta, "catalogo-fallback.json");
  const sello = path.join(carpeta, "catalogo-fallback.integrity.json");
  await writeFile(snapshot, `${JSON.stringify(catalogo, null, 2)}\n`, "utf8");
  await writeFile(sello, `${JSON.stringify(selloDe(catalogo), null, 2)}\n`, "utf8");
  return { carpeta, snapshot, sello };
}

test("un par coherente se reconoce como coherente", async () => {
  const { snapshot, sello } = await parSano();
  const estado = await estadoDelPar(snapshot, sello);
  assert.equal(estado.coherente, true, estado.motivo ?? "");
});

test("un snapshot nuevo con el sello viejo NO pasa por coherente", async () => {
  // Exactamente el estado que dejo la muerte entre los dos renames.
  const { snapshot, sello } = await parSano();
  await writeFile(snapshot, `${JSON.stringify(OTRO_CATALOGO, null, 2)}\n`, "utf8");

  const estado = await estadoDelPar(snapshot, sello);
  assert.equal(estado.coherente, false);
  assert.match(estado.motivo ?? "", /hash|sello/i);
});

test("morir entre los dos renames se repara en la corrida siguiente", async () => {
  const { snapshot, sello } = await parSano();
  await respaldarPar(snapshot, sello);
  // El generador alcanzo a reemplazar el snapshot y murio antes del sello.
  await writeFile(snapshot, `${JSON.stringify(OTRO_CATALOGO, null, 2)}\n`, "utf8");
  assert.equal((await estadoDelPar(snapshot, sello)).coherente, false);

  const reparacion = await recuperarPar(snapshot, sello);

  assert.equal(reparacion.reparado, true);
  assert.equal((await estadoDelPar(snapshot, sello)).coherente, true);
  assert.deepEqual(
    JSON.parse(await readFile(snapshot, "utf8")),
    CATALOGO,
    "tiene que volver el par anterior entero, no el snapshot a medias",
  );
  assert.equal(await existe(`${snapshot}.bak`), false, "el respaldo se consume al reparar");
});

test("morir despues de escribir el par completo conserva lo nuevo", async () => {
  // El otro lado de la ventana: los dos renames salieron y el proceso murio
  // antes de borrar el respaldo. Reparar aca seria PERDER el refresco bueno.
  const { snapshot, sello } = await parSano();
  await respaldarPar(snapshot, sello);
  await writeFile(snapshot, `${JSON.stringify(OTRO_CATALOGO, null, 2)}\n`, "utf8");
  await writeFile(sello, `${JSON.stringify(selloDe(OTRO_CATALOGO), null, 2)}\n`, "utf8");

  const reparacion = await recuperarPar(snapshot, sello);

  assert.equal(reparacion.reparado, false);
  assert.deepEqual(JSON.parse(await readFile(snapshot, "utf8")), OTRO_CATALOGO);
  assert.equal(await existe(`${snapshot}.bak`), false);
});

test("sin respaldo pendiente no hay nada que reparar", async () => {
  const { snapshot, sello } = await parSano();
  const reparacion = await recuperarPar(snapshot, sello);
  assert.equal(reparacion.reparado, false);
  assert.equal(reparacion.habiaRespaldo, false);
});

test("confirmar el par retira el respaldo", async () => {
  const { snapshot, sello } = await parSano();
  await respaldarPar(snapshot, sello);
  assert.equal(await existe(`${snapshot}.bak`), true);
  assert.equal(await existe(`${sello}.bak`), true);

  await confirmarPar(snapshot, sello);

  assert.equal(await existe(`${snapshot}.bak`), false);
  assert.equal(await existe(`${sello}.bak`), false);
});

// --- Que una reparacion fallida NO consuma el respaldo ------------------------

test("si la reparacion NO sale, el respaldo se conserva", async () => {
  // Hallazgo de la tercera ronda: se convirtio el destino del snapshot en una
  // carpeta para forzar el fallo de escritura; `restaurarPar` devolvia el error
  // y `confirmarPar` borraba los dos `.bak` igual. O sea que el unico camino de
  // vuelta se consumia en el intento que fallo, y la corrida siguiente ya no
  // tenia de donde recuperar. Un respaldo se retira cuando sobra, nunca cuando
  // puede hacer falta.
  const { snapshot, sello } = await parSano();
  await respaldarPar(snapshot, sello);
  // El destino deja de ser un archivo: cualquier escritura sobre el falla
  // (EPERM/EACCES en Windows, EISDIR en Linux).
  await rm(snapshot);
  await mkdir(snapshot);

  const reparacion = await recuperarPar(snapshot, sello);

  assert.equal(reparacion.reparado, false);
  assert.equal(reparacion.respaldoConservado, true);
  assert.ok(reparacion.fallos.length > 0, "el fallo tiene que quedar dicho");
  assert.equal(await existe(`${snapshot}.bak`), true, "el respaldo del snapshot se conserva");
  assert.equal(await existe(`${sello}.bak`), true, "y el del sello tambien");
});

// --- Frente al respaldo: que el wrapper no afirme lo que no sabe --------------

test("se puede distinguir el par committeado del refresco nuevo", async () => {
  // El wrapper decia siempre «el build sigue con el snapshot committeado». Con
  // el generador muerto despues de escribir y sellar, eso era falso: lo que
  // quedaba era el refresco NUEVO, coherente. Son tres estados distintos y hay
  // que poder nombrarlos.
  const { snapshot, sello } = await parSano();
  assert.equal(await frenteAlRespaldo(snapshot), "sin-respaldo", "nadie toco el par");

  await respaldarPar(snapshot, sello);
  assert.equal(await frenteAlRespaldo(snapshot), "igual", "se respaldo pero no se escribio");

  await writeFile(snapshot, `${JSON.stringify(OTRO_CATALOGO, null, 2)}\n`, "utf8");
  assert.equal(await frenteAlRespaldo(snapshot), "distinto", "el refresco nuevo si quedo");
});

// --- El candado: un solo escritor por checkout --------------------------------
// El protocolo del par sobrevive a que el proceso MUERA. Lo que no sobrevivia
// era que hubiera DOS: la tercera ronda de review intercalo dos generadores
// —uno leyo el snapshot para sellar, el otro escribio y confirmo entero, y
// recien entonces el primero escribio su sello— y quedo snapshot de uno con
// sello del otro, sin respaldos y con el build en verde.

/** Un refresco completo, con la ventana que la review exploto. */
async function refrescar({ carpeta, snapshot, sello }, catalogo, pausaMs = 0) {
  return conElParTomado(
    async () => {
      await respaldarPar(snapshot, sello);
      await escribirAtomico(snapshot, `${JSON.stringify(catalogo, null, 2)}\n`);
      // Acá es donde la review dejo pausado al primer generador.
      if (pausaMs > 0) await new Promise((listo) => setTimeout(listo, pausaMs));
      await escribirAtomico(sello, `${JSON.stringify(selloDe(catalogo), null, 2)}\n`);
      const estado = await estadoDelPar(snapshot, sello);
      assert.equal(estado.coherente, true, `el par quedo a medias: ${estado.motivo}`);
      await confirmarPar(snapshot, sello);
    },
    { candado: path.join(carpeta, "candado.lock") },
  );
}

test("dos refrescos simultaneos dejan un par coherente, no uno mezclado", async () => {
  const carpeta = await parSano();
  await Promise.all([
    refrescar(carpeta, CATALOGO, 60),
    refrescar(carpeta, OTRO_CATALOGO),
  ]);

  const estado = await estadoDelPar(carpeta.snapshot, carpeta.sello);
  assert.equal(estado.coherente, true, estado.motivo ?? "");
  const quedo = JSON.parse(await readFile(carpeta.snapshot, "utf8"));
  assert.ok(
    quedo.generado_en === CATALOGO.generado_en || quedo.generado_en === OTRO_CATALOGO.generado_en,
    "tiene que quedar UNA de las dos generaciones entera, no una mezcla",
  );
  assert.equal(await existe(`${carpeta.snapshot}.bak`), false, "no quedan respaldos huerfanos");
});

test("el que no puede tomar el candado se rinde, no se cuelga", async () => {
  // Rendirse es correcto dentro de un build: el que tiene el candado esta
  // escribiendo un snapshot igual de bueno. Colgarse esperando es convertir una
  // molestia en un despliegue perdido.
  const { carpeta } = await parSano();
  const candado = path.join(carpeta, "candado.lock");
  await writeFile(candado, JSON.stringify({ pid: 1, host: "otro", desde: Date.now() }), "utf8");

  await assert.rejects(
    () => conElParTomado(async () => "no deberia correr", { candado, esperaMs: 150 }),
    (error) => error instanceof CandadoOcupado,
  );
});

test("un candado abandonado no bloquea el par para siempre", async () => {
  // Un proceso muerto con SIGKILL no suelta nada. Sin esta regla, cambiar una
  // falla rara (dos escritores) por una peor (nadie puede volver a escribir).
  const { carpeta } = await parSano();
  const candado = path.join(carpeta, "candado.lock");
  await writeFile(
    candado,
    JSON.stringify({ pid: 999999, host: "muerto", desde: Date.now() - 120_000 }),
    "utf8",
  );

  const avisos = [];
  const original = console.warn;
  console.warn = (...args) => avisos.push(args.join(" "));
  let corrio = false;
  try {
    await conElParTomado(
      async () => {
        corrio = true;
      },
      { candado, esperaMs: 500, vencidoMs: 60_000 },
    );
  } finally {
    console.warn = original;
  }

  assert.equal(corrio, true, "el candado vencido se roba y se sigue");
  assert.equal(await existe(candado), false, "y se suelta al terminar");
  assert.ok(
    avisos.some((linea) => linea.includes("abandonado")),
    "robar un candado no puede pasar en silencio",
  );
});

test("un candado de un proceso que ya no existe se saca al instante", async () => {
  // Medido: un generador muerto con SIGKILL deja el candado tomado, y sin esto el
  // prebuild que viene a reparar el par tiene que esperar el minuto entero
  // ADENTRO del build. `kill(pid, 0)` no manda ninguna señal: pregunta si el
  // proceso existe.
  const { carpeta } = await parSano();
  const candado = path.join(carpeta, "candado.lock");
  await writeFile(
    candado,
    // Recien tomado —la edad no lo salva— pero su dueño no existe.
    JSON.stringify({ pid: 999999, host: hostname(), desde: Date.now() }),
    "utf8",
  );

  const avisos = [];
  const original = console.warn;
  console.warn = (...args) => avisos.push(args.join(" "));
  let corrio = false;
  try {
    await conElParTomado(
      async () => {
        corrio = true;
      },
      { candado, esperaMs: 200 },
    );
  } finally {
    console.warn = original;
  }

  assert.equal(corrio, true, "el candado de un muerto no puede frenar la reparacion");
  assert.ok(avisos.some((linea) => linea.includes("ya no existe")));
});

test("el candado de OTRA maquina se respeta hasta que vence", async () => {
  // Un pid de otra maquina no dice nada sobre esta: ahi manda la edad, y sacarlo
  // por un pid que no existe localmente seria pisar a un escritor vivo.
  const { carpeta } = await parSano();
  const candado = path.join(carpeta, "candado.lock");
  await writeFile(
    candado,
    JSON.stringify({ pid: 999999, host: "otra-maquina", desde: Date.now() }),
    "utf8",
  );

  await assert.rejects(
    () => conElParTomado(async () => "no deberia correr", { candado, esperaMs: 150 }),
    (error) => error instanceof CandadoOcupado,
  );
});

test("el candado se suelta aunque la tarea falle", async () => {
  const { carpeta } = await parSano();
  const candado = path.join(carpeta, "candado.lock");

  await assert.rejects(() =>
    conElParTomado(
      async () => {
        throw new Error("la escritura fallo");
      },
      { candado },
    ),
  );

  assert.equal(await existe(candado), false, "un candado que no se suelta bloquea el proximo build");
});

// --- El candado, atacado como lo ataco la revision ---------------------------
// La primera version de este candado tenia adentro el bug que venia a cerrar:
// `open(wx)` creaba el archivo VACIO y escribia el dueño despues, y el que
// llegaba segundo lo leia vacio, no lo podia parsear y se lo robaba a un dueño
// vivo. La suite quedo verde igual, porque estos tests fabricaban el candado a
// mano —con el contenido ya completo— y corrian los dos refrescos en el MISMO
// proceso, donde la creacion exclusiva serializa siempre. Los de abajo son los
// que faltaban.

test("un candado VACIO no se roba: es el instante en que otro lo esta publicando", async () => {
  const { carpeta } = await parSano();
  const candado = path.join(carpeta, "candado.lock");
  await writeFile(candado, "", "utf8");

  await assert.rejects(
    () =>
      conElParTomado(async () => "no deberia correr", {
        candado,
        esperaMs: 200,
        vencidoMs: 3_600_000,
      }),
    (error) => error instanceof CandadoOcupado,
    "un candado ilegible y RECIEN tocado es un escritor publicando, no un abandonado",
  );
});

test("un candado ilegible pero viejo si se saca", async () => {
  // La otra mitad: si de verdad quedo basura vieja —un disco lleno a mitad de
  // escritura—, el par no puede quedar bloqueado para siempre.
  const { carpeta } = await parSano();
  const candado = path.join(carpeta, "candado.lock");
  await writeFile(candado, "{ esto no es json", "utf8");

  const avisos = [];
  const original = console.warn;
  console.warn = (...args) => avisos.push(args.join(" "));
  let corrio = false;
  try {
    await conElParTomado(
      async () => {
        corrio = true;
      },
      { candado, esperaMs: 500, vencidoMs: 0 },
    );
  } finally {
    console.warn = original;
  }

  assert.equal(corrio, true);
  assert.ok(avisos.some((linea) => linea.includes("ilegible")));
});

test("un candado que no se puede borrar no quema la espera", async () => {
  // Medido en la primera version: el `rm` sin `recursive` fallaba sobre una
  // carpeta, `robarSiVencido` devolvia "lo saque" igual, y como decia que si, no
  // se dormia nunca: un core al 100% durante los 20 segundos de espera, con el
  // par bloqueado para siempre. La espera tiene que ser espera, no bucle.
  const { carpeta } = await parSano();
  const candado = path.join(carpeta, "candado.lock");
  await mkdir(candado);

  const cpuAntes = process.cpuUsage();
  const desde = Date.now();
  await assert.rejects(
    () => conElParTomado(async () => "no deberia correr", { candado, esperaMs: 400 }),
    (error) => error instanceof CandadoOcupado,
  );
  const cpu = process.cpuUsage(cpuAntes);
  const pared = Date.now() - desde;
  const cpuMs = (cpu.user + cpu.system) / 1000;

  assert.ok(pared >= 350, `esperó ${pared}ms: tiene que agotar la espera`);
  assert.ok(cpuMs < pared / 2, `quemó ${Math.round(cpuMs)}ms de CPU en ${pared}ms de espera`);
});

test("un `desde` que no es un numero no vence el candado", async () => {
  // `Date.now() - 0` da 55.000 años: cualquier `desde` no numerico hacia pasar
  // por abandonado el candado de un dueño vivo. Un dato que no se puede juzgar
  // se respeta.
  const { carpeta } = await parSano();
  const candado = path.join(carpeta, "candado.lock");
  await writeFile(
    candado,
    JSON.stringify({ pid: process.pid, host: hostname(), desde: "2026-08-30T12:00:00.000Z" }),
    "utf8",
  );

  await assert.rejects(
    () => conElParTomado(async () => "no deberia correr", { candado, esperaMs: 200 }),
    (error) => error instanceof CandadoOcupado,
  );
});

test("al que se le paso el tiempo no le saca el candado al que se lo robo", async () => {
  // Es la regla que impide que el lento vuelva a meter dos escritores adentro.
  const { carpeta } = await parSano();
  const candado = path.join(carpeta, "candado.lock");

  await conElParTomado(
    async () => {
      // Mientras trabajamos, otro se lo lleva y pone el suyo.
      await writeFile(candado, JSON.stringify({ pid: 1, host: "otro", desde: Date.now() }), "utf8");
    },
    { candado },
  );

  assert.equal(await existe(candado), true, "el candado del otro tiene que seguir ahi");
  const dueño = JSON.parse(await readFile(candado, "utf8"));
  assert.equal(dueño.host, "otro");
});

test("procesos de VERDAD compitiendo por el candado no se pisan", async () => {
  // Prueba de humo del candado ENTRE PROCESOS: separados de verdad, con el
  // candado creado por el codigo real —no fabricado a mano— y arrancando todos
  // juntos. Medido: con el bug adentro este test pasaba igual (la carrera pide
  // mas procesos y mas vueltas para asomar), asi que el guard determinista del
  // bug es el de arriba —"un candado VACIO no se roba"—, no este. Este cubre lo
  // que aquel no puede: que el protocolo real, con procesos reales, no se pise.
  const { carpeta } = await parSano();
  const candado = path.join(carpeta, "candado.lock");
  const registro = path.join(carpeta, "registro.txt");
  const obrero = path.join(carpeta, "obrero.mjs");
  const modulo = new URL("../scripts/catalogo-integridad.mjs", import.meta.url).href;

  const fuenteDelObrero = [
    'import { appendFile } from "node:fs/promises";',
    "const [modulo, candado, registro, vueltas] = process.argv.slice(2);",
    "const { conElParTomado } = await import(modulo);",
    "for (let i = 0; i < Number(vueltas); i += 1) {",
    "  await conElParTomado(async () => {",
    "    await appendFile(registro, `E ${process.pid}` + String.fromCharCode(10), \"utf8\");",
    "    await new Promise((listo) => setTimeout(listo, 3));",
    "    await appendFile(registro, `S ${process.pid}` + String.fromCharCode(10), \"utf8\");",
    "  }, { candado, esperaMs: 30_000 });",
    "}",
  ].join("\n");
  await writeFile(obrero, fuenteDelObrero, "utf8");
  await writeFile(registro, "", "utf8");

  const PROCESOS = 4;
  const VUELTAS = 5;
  const salidas = await Promise.all(
    Array.from(
      { length: PROCESOS },
      () =>
        new Promise((listo, fallo) => {
          const hijo = spawn(
            process.execPath,
            [obrero, modulo, candado, registro, String(VUELTAS)],
            { stdio: "ignore" },
          );
          hijo.on("error", fallo);
          hijo.on("exit", (codigo) => listo(codigo));
        }),
    ),
  );
  assert.deepEqual(salidas, Array(PROCESOS).fill(0), "algun obrero no termino bien");

  const lineas = (await readFile(registro, "utf8")).split("\n").filter((linea) => linea !== "");
  assert.equal(lineas.length, PROCESOS * VUELTAS * 2, "el registro quedo a medias");

  const adentro = new Set();
  const solapes = [];
  for (const linea of lineas) {
    const [marca, pid] = linea.split(" ");
    if (marca === "E") {
      if (adentro.size > 0) solapes.push(`${pid} entro con ${[...adentro].join(",")} adentro`);
      adentro.add(pid);
    } else {
      adentro.delete(pid);
    }
  }
  assert.deepEqual(solapes, [], "dos escritores adentro de la seccion critica");
  assert.equal(await existe(candado), false, "el candado quedo tomado despues de terminar");
});

// --- Reparar: la mitad fina --------------------------------------------------

test("no se confirma si el par restaurado tampoco cierra", async () => {
  // El test anterior forzaba el fallo por ESCRITURA, asi que `fallos.length > 0`
  // ya decidia solo. Este cubre la otra mitad, que es la que el comentario
  // promete: las escrituras salen bien y el par igual no cierra.
  const { snapshot, sello } = await parSano();
  await respaldarPar(snapshot, sello);
  await rm(`${sello}.bak`); // solo queda respaldo del snapshot
  // Y el disco queda con el sello de OTRO catalogo: restaurar el snapshot viejo
  // no alcanza para que el par cierre.
  await writeFile(sello, `${JSON.stringify(selloDe(OTRO_CATALOGO), null, 2)}\n`, "utf8");

  const reparacion = await repararDesdeRespaldo(snapshot, sello);

  assert.equal(reparacion.restaurado, false, "el par restaurado no cierra: no se confirma");
  assert.deepEqual(reparacion.fallos, [], "las escrituras salieron bien; el problema es el par");
  assert.ok(reparacion.motivo, "tiene que decir por que no cierra");
  assert.equal(await existe(`${snapshot}.bak`), true, "el respaldo se conserva");
});

// --- El sello ----------------------------------------------------------------

test("sellar escribe el sello del catalogo que recibe, no el del disco", async () => {
  // Releer el disco para sellar era la mitad de la carrera entre dos
  // generadores. Y hasta ahora `sellar` no la ejercitaba ningun test, siendo la
  // unica funcion que escribe el sello en produccion.
  const { snapshot, sello } = await parSano();
  const escrito = await sellar(OTRO_CATALOGO, { snapshot, sello });

  assert.equal(escrito.hash, hashCatalogo(OTRO_CATALOGO));
  assert.equal(escrito.productos, OTRO_CATALOGO.productos.length);
  assert.equal(escrito.generado_en, OTRO_CATALOGO.generado_en);
  const enDisco = JSON.parse(await readFile(sello, "utf8"));
  assert.equal(enDisco.hash, escrito.hash);
});

test("un sello con el literal null no tira: dice que no es un objeto", async () => {
  // `marca.hash` sobre `null` tiraba un TypeError que nadie capturaba, y el
  // prebuild moria con un stack trace en vez del mensaje diseñado.
  const { snapshot, sello } = await parSano();
  await writeFile(sello, "null", "utf8");

  const estado = await estadoDelPar(snapshot, sello);

  assert.equal(estado.coherente, false);
  assert.match(estado.motivo ?? "", /objeto/);
});
