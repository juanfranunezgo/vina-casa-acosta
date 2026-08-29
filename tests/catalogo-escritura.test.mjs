import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { escribirAtomico } from "../scripts/catalogo-integridad.mjs";
import { mensajeDeCuerpoIlegible } from "../scripts/catalogo-validacion.mjs";

/**
 * Como se escribe el fallback cuando hay mas de un escritor, y como se cuenta lo
 * que fallo.
 *
 * Los dos casos salen de la segunda ronda de review:
 *
 *   - diez generadores concurrentes sobre el mismo checkout daban ocho exitos y
 *     dos `ENOENT` al renombrar, porque todos usaban el MISMO temporal
 *     (`<destino>.tmp`): el primero que renombraba se llevaba el archivo que los
 *     otros estaban por renombrar;
 *   - una API que manda los headers y nunca termina el cuerpo se informaba como
 *     "respondio algo que no es JSON", que manda a buscar el problema al lugar
 *     equivocado.
 */

const carpeta = await mkdtemp(path.join(tmpdir(), "catalogo-escritura-"));

test("varios escritores a la vez no se pisan el temporal", async () => {
  const destino = path.join(carpeta, "concurrente.json");
  const escrituras = Array.from({ length: 10 }, (_, i) =>
    escribirAtomico(destino, `contenido ${i}\n`),
  );

  const resultados = await Promise.allSettled(escrituras);
  const fallidas = resultados.filter((r) => r.status === "rejected");
  assert.deepEqual(
    fallidas.map((r) => String(r.reason)),
    [],
    "ningun escritor puede fallar por culpa del temporal de otro",
  );

  // El ganador es cualquiera de los diez, pero el archivo tiene que estar entero.
  const final = await readFile(destino, "utf8");
  assert.match(final, /^contenido \d\n$/);

  // Y no puede quedar basura: un temporal olvidado en `data/` termina commiteado.
  const sobrantes = (await readdir(carpeta)).filter((f) => f.includes(".tmp"));
  assert.deepEqual(sobrantes, []);
});

test("un temporal viejo que quedo como carpeta no bloquea la escritura", async () => {
  // Caso P3 de la review: la ruta temporal existente como directorio hacia fallar
  // al generador sin que nada lo limpiara.
  const destino = path.join(carpeta, "con-carpeta.json");
  await mkdir(`${destino}.tmp`, { recursive: true });

  await escribirAtomico(destino, "sano\n");
  assert.equal(await readFile(destino, "utf8"), "sano\n");
});

test("una API que no termina el cuerpo se informa como timeout, no como JSON invalido", () => {
  const timeout = Object.assign(new Error("The operation was aborted"), {
    name: "TimeoutError",
  });
  assert.match(mensajeDeCuerpoIlegible(timeout, 15_000), /15s/);
  assert.match(mensajeDeCuerpoIlegible(timeout, 15_000), /cuerpo/i);

  const roto = new SyntaxError("Unexpected token < in JSON at position 0");
  assert.match(mensajeDeCuerpoIlegible(roto, 15_000), /no es JSON/i);
});
