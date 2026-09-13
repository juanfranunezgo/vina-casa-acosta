import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const fuente = await readFile(new URL("../components/CartDrawer.tsx", import.meta.url), "utf8");

test("el cajón manda al checkout con un formulario POST que funciona sin JavaScript", () => {
  assert.match(fuente, /<form[^>]*method="POST"[^>]*action=\{checkoutUrl\}/);
  assert.match(fuente, /<input type="hidden" name="carrito" value=\{carritoJson\}/);
});

test("el cajón conserva WhatsApp como respaldo y no sondea", () => {
  assert.match(fuente, /CONTACT_WHATSAPP_URL/);
  assert.doesNotMatch(fuente, /setInterval|\/salud/);
});

test("el mínimo de botellas sale del catálogo con MIN_BOTTLES de respaldo", () => {
  assert.match(fuente, /minBottlesFrom\(payload, MIN_BOTTLES\)/);
  assert.doesNotMatch(fuente, /orderBottles < MIN_BOTTLES/);
});

test("un carrito que el Worker rechaza vuelve a pedir el catálogo, no la copia en memoria", () => {
  // `getCartCatalog` comparte la promesa ya resuelta: sin olvidarla, `setCartCatalog(null)` vuelve
  // a leer el mismo catálogo viejo y los agotados nuevos no aparecen.
  assert.match(fuente, /function forgetCartCatalog\(\): void \{\s*catalogRequest = null;\s*\}/);
  assert.match(fuente, /forgetCartCatalog\(\);\s*setCartCatalog\(null\);/);
});

test("en el respaldo, el pie deja de prometer el pago en línea", () => {
  // El respaldo es el estado de la prueba de cierre de la etapa E: el pie ofrece WhatsApp, así
  // que el botón bloqueado y el aviso de abajo no pueden seguir hablando de pagar en línea.
  assert.match(fuente, /const payOnline = checkoutUrl !== null && checkoutState !== "fallback";/);
  assert.match(fuente, /\{payOnline \? t\("checkoutPay"\) : t\("checkout"\)\}/);
  assert.match(fuente, /\{payOnline \? t\("checkoutDisclaimerOnline"\) : t\("checkoutDisclaimer"\)\}/);
});

test("el envío se tipa con SubmitEvent, no con FormEvent", () => {
  // En @types/react 19.2 el `@deprecated` está en la interfaz `FormEvent` misma, así que importarla
  // de "react" en vez de escribir `React.FormEvent` no lo quita. `onSubmit` recibe un
  // `SubmitEventHandler`: su evento es `SubmitEvent`.
  assert.match(fuente, /import \{[^}]*\btype SubmitEvent\b[^}]*\} from "react";/);
  assert.match(fuente, /handleCheckoutSubmit\(event: SubmitEvent<HTMLFormElement>\)/);
  assert.doesNotMatch(fuente, /FormEvent/);
});

test("cambiar el carrito suelta el aviso y el respaldo del intento anterior", () => {
  // Antes, "revisa tu carrito" y el modo respaldo quedaban pegados hasta recargar. El intento
  // recuerda el carrito que mandó y el estado se deriva en el render: un efecto sobre `items` que
  // volviera a "idle" lo rechaza `react-hooks/set-state-in-effect`. El envío en vuelo no se
  // suelta, para que cambiar el carrito mientras espera no habilite un segundo POST.
  assert.match(fuente, /setCheckoutAttempt\(\{ items, state: "sending" \}\)/);
  assert.match(
    fuente,
    /setCheckoutAttempt\(\{ items, state: resultado\.motivo === "carrito" \? "cart" : "fallback" \}\)/,
  );
  assert.match(
    fuente,
    /checkoutAttempt !== null &&\s*\(checkoutAttempt\.state === "sending" \|\| checkoutAttempt\.items === items\)\s*\?\s*checkoutAttempt\.state\s*:\s*"idle"/,
  );
  assert.doesNotMatch(fuente, /setCheckoutState/);
});

test("volver con Atrás desde el checkout suelta el envío en vuelo", () => {
  // Tras «Pagar» la página navega con el intento en "sending", que no se suelta al cambiar el
  // carrito. Si el navegador la restaura desde su caché de historial, el estado vuelve tal cual:
  // sin el reset en `pageshow` el botón quedaba en «Abriendo el pago…» hasta recargar.
  assert.match(fuente, /window\.addEventListener\("pageshow", onPageShow\)/);
  assert.match(fuente, /if \(event\.persisted\) setCheckoutAttempt\(null\);/);
  assert.match(fuente, /window\.removeEventListener\("pageshow", onPageShow\)/);
});

test("los avisos del pie leen el estado derivado, no el intento crudo", () => {
  // Un aviso que mirara `checkoutAttempt.state` volvería a quedar pegado al cambiar el carrito, con
  // el resto de los tests en verde: el estado derivado es el que lo suelta.
  assert.match(fuente, /\{checkoutState === "fallback" && \(/);
  assert.match(fuente, /\{checkoutState === "cart" && \(/);
  assert.doesNotMatch(fuente, /checkoutAttempt\??\.state\s*[!=]==\s*"(cart|fallback)"/);
});
