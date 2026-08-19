import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Netlify Forms detecta los formularios parseando el HTML estático del deploy, y
 * **descarta en silencio todo campo que no figure en `public/__forms.html`**. No
 * hay error, no hay aviso: el envío llega al panel con ese campo vacío.
 *
 * Es el modo de falla más caro del sitio —una reserva sin teléfono, un
 * consentimiento que no queda registrado— y hasta hoy la única defensa era un
 * comentario pidiendo que no se olvidara. Estos tests leen los dos componentes
 * que envían y comparan campo por campo contra la declaración.
 */

const raiz = new URL("../", import.meta.url);
const declaracion = await readFile(new URL("public/__forms.html", raiz), "utf8");

/** Campos declarados para un formulario de `__forms.html`. */
function camposDeclarados(nombre) {
  const bloque = declaracion.match(
    new RegExp(`<form name="${nombre}"[\\s\\S]*?</form>`),
  );
  assert.ok(bloque, `__forms.html no declara el formulario "${nombre}"`);
  // Sólo los campos: el `name` del propio <form> es el nombre del formulario, y
  // `form-name` es el oculto que Netlify usa para enrutar el POST.
  return new Set(
    [...bloque[0].matchAll(/<(?:input|textarea)[^>]*\bname="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((n) => n !== "form-name"),
  );
}

/** Campos que el componente le pasa a `submitToNetlifyForms`. */
function camposEnviados(fuente, nombre) {
  const llamada = fuente.match(
    new RegExp(`submitToNetlifyForms\\("${nombre}",\\s*\\{([\\s\\S]*?)\\n\\s*\\}\\);`),
  );
  assert.ok(llamada, `no se encontro el envio de "${nombre}" en su componente`);
  // `nombre: name` y la forma corta `email` cuentan igual: las dos mandan un
  // campo con ese nombre. Las líneas de comentario empiezan con `//` y no matchean.
  return new Set(
    [...llamada[1].matchAll(/^\s*"?([\w-]+)"?\s*[:,]/gm)].map((m) => m[1]),
  );
}

const CASOS = [
  { formulario: "contacto", componente: "components/ContactForm.tsx" },
  { formulario: "reserva-actividad", componente: "components/ActivityReservationForm.tsx" },
];

for (const { formulario, componente } of CASOS) {
  test(`todo campo que envia ${formulario} esta declarado en __forms.html`, async () => {
    const fuente = await readFile(new URL(componente, raiz), "utf8");
    const enviados = camposEnviados(fuente, formulario);
    const declarados = camposDeclarados(formulario);

    assert.ok(enviados.size > 0, `${componente} no envia ningun campo`);
    for (const campo of enviados) {
      assert.ok(
        declarados.has(campo),
        `${componente} envia "${campo}" y __forms.html no lo declara: Netlify lo descarta en silencio`,
      );
    }
  });

  test(`${formulario} no declara campos que nadie envia`, async () => {
    const fuente = await readFile(new URL(componente, raiz), "utf8");
    const enviados = camposEnviados(fuente, formulario);
    const declarados = camposDeclarados(formulario);

    for (const campo of declarados) {
      assert.ok(
        enviados.has(campo),
        `__forms.html declara "${campo}" en ${formulario} y el componente no lo envia`,
      );
    }
  });
}

test("los dos formularios piden el consentimiento de privacidad", async () => {
  // El consentimiento se pierde de dos maneras: sacando la casilla del
  // formulario, o dejandola sin mandar el campo. Las dos tienen que doler.
  for (const { formulario, componente } of CASOS) {
    const fuente = await readFile(new URL(componente, raiz), "utf8");
    assert.match(
      fuente,
      /<PrivacyConsent/,
      `${componente} deberia montar <PrivacyConsent /> antes del boton de envio`,
    );
    assert.ok(
      camposEnviados(fuente, formulario).has("privacidad"),
      `${componente} deberia enviar el campo "privacidad" con la version aceptada`,
    );
  }

  const consent = await readFile(new URL("components/PrivacyConsent.tsx", raiz), "utf8");
  assert.match(
    consent,
    /required/,
    "la casilla deberia ser `required`: es lo que impide enviar sin aceptar",
  );
  assert.match(
    consent,
    /PRIVACIDAD_PDF/,
    "el enlace deberia salir de lib/legal.ts y no de una ruta escrita a mano",
  );
});
