import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

/**
 * Deja que un test importe un componente `.tsx` y lo dibuje de verdad.
 *
 * Node borra los tipos de un `.ts`, pero no sabe qué hacer con JSX: hasta acá un
 * componente solo se podía cubrir leyendo su texto. Un guard de texto afirma cómo
 * está escrito; lo que hay que afirmar de un precio es qué HTML sale con rebaja y
 * cuál sin ella, y eso solo se prueba dibujándolo.
 *
 * Se transpila con el `typescript` que el proyecto ya tiene instalado, al mismo
 * JSX automático que usa Next (`react/jsx-runtime`). No comprueba tipos: de eso
 * se ocupa `npm run typecheck`.
 *
 * Sirve para componentes sin dependencias de Next (un `next/link` o un
 * `next/image` no cargan en Node pelado). Si el componente importa `@/...`,
 * importar también `./alias-hook.mjs`.
 */
registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith(".tsx")) return nextLoad(url, context);
    const archivo = fileURLToPath(url);
    const { outputText } = ts.transpileModule(readFileSync(archivo, "utf8"), {
      fileName: archivo,
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    });
    return { format: "module", source: outputText, shortCircuit: true };
  },
});
