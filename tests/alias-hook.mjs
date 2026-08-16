import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

/**
 * Resuelve el alias `@/` de tsconfig cuando los tests corren en Node pelado.
 *
 * Sin esto, cualquier modulo que importe `@/lib/...` solo se puede cubrir con
 * un guard que lee su texto, porque `node --test` no sabe resolver el alias.
 * Un guard de texto afirma como esta escrito el codigo; lo que hay que afirmar
 * de un generador de JSON-LD es que dado un precio ausente NO emite una oferta,
 * y eso solo se prueba ejecutandolo.
 *
 * `registerHooks` es sincrono y corre en el mismo hilo (Node >= 22.15), asi que
 * no necesita worker ni flag extra. Importar este archivo alcanza.
 *
 * El mapeo replica el de `tsconfig.json`: "@/*" -> "./*" desde la raiz del
 * proyecto. Si alla cambia, este archivo tiene que cambiar con el.
 */
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** TypeScript infiere la extension; Node exige el archivo exacto. */
const CANDIDATAS = [".ts", ".tsx", ".mjs", ".js", "/index.ts", "/index.tsx"];

function resolverAlias(specifier) {
  const base = join(ROOT, specifier.slice(2));
  if (existsSync(base)) return base;
  for (const sufijo of CANDIDATAS) {
    const intento = base + sufijo;
    if (existsSync(intento)) return intento;
  }
  throw new Error(`el alias ${specifier} no resuelve a ningun archivo`);
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: pathToFileURL(resolverAlias(specifier)).href,
      };
    }
    return nextResolve(specifier, context);
  },
});
