/**
 * Qué respuesta puede convertirse en snapshot, y cuál no.
 *
 * Vive aparte del generador —y no adentro— por dos motivos: importar el
 * generador lo EJECUTA (tiene efectos al cargarse), y esta decisión es
 * exactamente la que hay que poder probar sin red.
 *
 * La regla de fondo: el snapshot es la ultima linea de defensa del sitio. Pisar
 * uno bueno con uno inservible no es "quedarse igual", es quedarse peor que
 * antes — y desde que el snapshot se refresca en cada build, esta funcion corre
 * en cada deploy en vez de cuando alguien se acuerda.
 *
 * Se reusa `isValidCatalog`, el MISMO guard que aplica el runtime a la respuesta
 * viva. Si el generador aceptara algo que el runtime rechaza, el sitio quedaria
 * con un fallback que no puede servir: el peor de los dos mundos, y sin aviso.
 */
import {
  CONTRACT_VERSION,
  catalogEndpointFor,
  isOwnCatalog,
  isValidCatalog,
} from "../lib/afeleia/contract.ts";

/**
 * Motivo por el que esta respuesta NO puede escribirse como snapshot, o `null`
 * si puede.
 *
 * @param {unknown} payload respuesta ya parseada de la API
 * @param {string} sitioEsperado slug que se pidió (`NEXT_PUBLIC_AFELEIA_SITIO`)
 * @returns {string | null}
 */
export function razonParaRechazar(payload, sitioEsperado) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return "la respuesta no es un objeto";
  }

  if (payload.version !== CONTRACT_VERSION) {
    return `se esperaba version ${CONTRACT_VERSION} y llego ${JSON.stringify(payload.version)}`;
  }

  // Un 200 con el catalogo de OTRO cliente es la falla mas peligrosa de todas:
  // el sitio publicaria nombres y precios ajenos, y ese catalogo quedaria
  // sellado como fallback legitimo. Un endpoint mal configurado, un slug mal
  // escrito o una API redirigida bastan para producirlo, sin que nada falle.
  if (!isOwnCatalog(payload, sitioEsperado)) {
    return `la respuesta es del sitio ${JSON.stringify(payload.sitio)} y se pidio ${JSON.stringify(sitioEsperado)}`;
  }

  // Un catalogo VACIO se acepta, y es una decision, no un descuido: el contrato
  // lo declara valido y el runtime lo sirve. Rechazarlo aca dejaba las tres capas
  // en desacuerdo, y ese desacuerdo tenia consecuencia: si el cliente despublica
  // todo, el snapshot se quedaba con el catalogo de ayer y en la proxima caida
  // REAPARECIA inventario retirado, con el build en verde. Se acepta y se grita
  // —el generador avisa cuando el catalogo pasa de N productos a cero—, que es la
  // combinacion correcta: el dato manda, el humano se entera.

  // El guard del runtime, al pie de la letra: un producto sin slug rompe
  // `generateStaticParams` y hace fallar el build entero — o sea, un 200
  // malformado impediria desplegar, que es justo lo que el fallback existe para
  // evitar.
  if (!isValidCatalog(payload)) {
    return `la respuesta no cumple el contrato v${CONTRACT_VERSION}: algun producto no trae slug, nombre, precio, imagenes, agotado o atributos`;
  }

  return null;
}

/**
 * Aviso cuando el catalogo nuevo se quedo sin productos y el anterior tenia.
 *
 * Acompana a la aceptacion del catalogo vacio: el dato manda —si el cliente
 * despublico todo, el snapshot tiene que reflejarlo— pero vaciar la tienda no
 * puede pasar en silencio. Nombra cuantos habia, que es lo que permite
 * distinguir "el cliente despublico todo" de "algo se rompio del otro lado".
 *
 * @param {number | null} productosPrevios cuantos tenia el snapshot anterior, o
 *   `null` si no habia snapshot legible
 * @param {number} productosNuevos cuantos trae la respuesta aceptada
 * @returns {string | null}
 */
export function avisoPorVaciado(productosPrevios, productosNuevos) {
  if (productosNuevos !== 0) return null;
  if (productosPrevios === null || productosPrevios === 0) return null;
  return (
    `El catalogo llego VACIO y el snapshot anterior tenia ${productosPrevios} producto(s): ` +
    "la tienda queda sin productos. Si el cliente despublico todo, es correcto; " +
    "si no, revisar el panel antes del proximo deploy."
  );
}

/**
 * Como contar un cuerpo que no se pudo leer.
 *
 * Una API que manda los headers y nunca termina el cuerpo agota el mismo reloj
 * que cubre la conexion, pero el error aparece al parsear: se informaba como "la
 * API respondio algo que no es JSON", que manda a buscar el problema al lugar
 * equivocado —a la forma de la respuesta en vez de a la API que dejo la conexion
 * abierta—. La accion que sigue es distinta en cada caso, asi que el mensaje
 * tiene que serlo.
 *
 * @param {unknown} error lo que lanzo `response.json()`
 * @param {number} timeoutMs reloj que se estaba aplicando
 * @returns {string}
 */
export function mensajeDeCuerpoIlegible(error, timeoutMs) {
  const nombre = error instanceof Error ? error.name : "";
  if (nombre === "TimeoutError" || nombre === "AbortError") {
    return `La API empezo a responder pero no termino de enviar el cuerpo en ${timeoutMs / 1000}s.`;
  }
  return "La API respondio algo que no es JSON.";
}

/**
 * Forma del slug publico de un sitio: minusculas, digitos y guiones simples.
 *
 * Es la forma que ya tiene el slug del lado de Afeleia. No se normaliza lo que
 * llegue —recortar espacios o bajar mayusculas escondería el error de
 * configuracion— sino que se exige, y se avisa.
 */
const SLUG_DE_SITIO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Motivo por el que la configuracion de conexion es invalida, o `null`.
 *
 * La distincion que faltaba: **una caida se tolera; una configuracion rota no.**
 * Con las dos variables ausentes no hay error —es un clon local sin `.env.local`,
 * y el sitio se construye con el snapshot committeado—, pero una variable vacia,
 * con espacios, a medias o con un slug de otra forma deja el sitio degradado para
 * siempre, en verde, y sin que nada lo diga. Eso se detecta al empezar el
 * prebuild y hace fallar el build, que es lo unico que obliga a mirarlo.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {string | null}
 */
export function razonDeConfiguracionInvalida(env) {
  const url = env.NEXT_PUBLIC_AFELEIA_API_URL;
  const sitio = env.NEXT_PUBLIC_AFELEIA_SITIO;

  if (url === undefined && sitio === undefined) return null;

  if (url === undefined) {
    return "falta NEXT_PUBLIC_AFELEIA_API_URL: esta definido el sitio pero no la API";
  }
  if (sitio === undefined) {
    return "falta NEXT_PUBLIC_AFELEIA_SITIO: esta definida la API pero no el sitio";
  }

  let endpoint;
  try {
    endpoint = new URL(url);
  } catch {
    return `NEXT_PUBLIC_AFELEIA_API_URL no es una URL: ${JSON.stringify(url)}`;
  }
  if (endpoint.protocol !== "https:" && endpoint.protocol !== "http:") {
    return `NEXT_PUBLIC_AFELEIA_API_URL tiene que ser http(s): ${JSON.stringify(url)}`;
  }

  // La BASE es una base: host y path, nada mas. Con query o fragmento el endpoint
  // sale mal armado —`/functions/v1?token=x` + `/catalogo-publico?sitio=...` deja
  // el path adentro del query— y el sitio queda degradado en verde, que es la
  // falla que esta funcion existe para atajar. Se rechaza en vez de recortarlo en
  // silencio: quien puso ese token queria que viajara, y tiene que enterarse de
  // que asi no viaja.
  if (endpoint.search !== "" || endpoint.hash !== "") {
    return (
      `NEXT_PUBLIC_AFELEIA_API_URL tiene que ser la base de la API, sin query ni fragmento: ` +
      `${JSON.stringify(url)}. Con ${JSON.stringify(endpoint.search || endpoint.hash)} el ` +
      "endpoint del catalogo se arma mal y el sitio se construye degradado."
    );
  }
  // Credenciales en la URL: viajarian en cada consulta del build y del runtime, y
  // `NEXT_PUBLIC_*` termina ademas en el bundle del navegador. El contrato v1 es
  // publico y no las necesita.
  if (endpoint.username !== "" || endpoint.password !== "") {
    return (
      "NEXT_PUBLIC_AFELEIA_API_URL no puede llevar credenciales: la variable es publica " +
      "y el contrato v1 no las usa"
    );
  }

  // En produccion, https y no es negociable: el catalogo lleva los precios y las
  // fotos del cliente, y en texto plano cualquier intermediario puede leerlo y,
  // peor, reescribirlo — un catalogo alterado en vuelo es un sitio publicando lo
  // que decida otro. En preview y en local sigue valiendo http, que es como corre
  // el Supabase de desarrollo en 127.0.0.1. Es el mismo criterio con el que
  // `lib/siteUrl.ts` rompe el build de produccion si el dominio publico quedo
  // provisional: en produccion los descuidos de configuracion no se avisan, se
  // frenan.
  if (env.CONTEXT === "production" && endpoint.protocol !== "https:") {
    return (
      `NEXT_PUBLIC_AFELEIA_API_URL tiene que ser https en produccion: ${JSON.stringify(url)}`
    );
  }

  if (!SLUG_DE_SITIO.test(sitio)) {
    return (
      `NEXT_PUBLIC_AFELEIA_SITIO no tiene forma de slug: ${JSON.stringify(sitio)}. ` +
      "Se compara literal contra el `sitio` que publica la API, asi que un espacio " +
      "o una mayuscula de mas mandan el sitio a modo degradado permanente."
    );
  }

  // Ultima puerta, y la unica que no puede quedar desalineada: se arma el endpoint
  // CON LA MISMA FUNCION que usa el runtime. Si el sitio no va a poder consultar,
  // se sabe acá y no en produccion.
  if (!catalogEndpointFor(url, sitio)) {
    return (
      `con NEXT_PUBLIC_AFELEIA_API_URL ${JSON.stringify(url)} no se puede armar el endpoint ` +
      "del catalogo"
    );
  }

  return null;
}

/**
 * Motivo por el que NO corresponde construir el sitio, o `null` si hay catalogo
 * servible.
 *
 * Se aplica sobre el snapshot que el build va a servir. Si la API no contesta y
 * ademas el snapshot esta corrupto, no queda nada que publicar: hasta esta tanda
 * el build seguia igual y publicaba una tienda VACIA, pisando la ultima version
 * buena del sitio. En un hosting de deploy atomico —Netlify— fallar el build es
 * la opcion segura: el deploy anterior sigue publicado, con sus productos.
 *
 * Ojo con la simetria que NO existe, y es deliberada: en el runtime un snapshot
 * corrupto sigue cayendo a `emptyCatalog`, porque ahi la alternativa es un 500 en
 * la cara del visitante. Fallar temprano donde hay red de contencion, degradar
 * donde no la hay.
 *
 * @param {string | null} crudoSnapshot contenido de `data/catalogo-fallback.json`
 * @param {string | undefined} sitioEsperado slug configurado
 *   (`NEXT_PUBLIC_AFELEIA_SITIO`); sin el no hay contra que comparar el tenant
 * @returns {string | null}
 */
export function razonParaNoDesplegar(crudoSnapshot, sitioEsperado) {
  const conservado =
    "No se construye: el deploy anterior sigue publicado con sus productos, que es " +
    "mejor que reemplazarlo por una tienda vacia.";

  if (typeof crudoSnapshot !== "string" || crudoSnapshot.trim() === "") {
    return `no hay snapshot de fallback legible. ${conservado}`;
  }

  let catalogo;
  try {
    catalogo = JSON.parse(crudoSnapshot);
  } catch {
    return `el snapshot de fallback no es JSON legible. ${conservado}`;
  }

  if (!isValidCatalog(catalogo)) {
    return (
      `el snapshot de fallback no cumple el contrato v${CONTRACT_VERSION}. ${conservado}`
    );
  }

  // Y tiene que ser DE ESTE SITIO. Esta era la puerta que faltaba: la tercera
  // ronda de review dejo un snapshot coherente y bien sellado con
  // `sitio: "bodega-ajena"`, y el build salio en verde con 77 paginas publicando
  // `/es/vinos/producto-ajeno`. El generador ya rechazaba una RESPUESTA ajena,
  // pero nadie miraba el ARCHIVO — y el archivo es lo que se despliega. Publicar
  // el catalogo de otro cliente es peor que no desplegar: se frena.
  if (!isOwnCatalog(catalogo, sitioEsperado)) {
    return (
      `el snapshot de fallback es del sitio ${JSON.stringify(catalogo.sitio)} y este sitio es ` +
      `${JSON.stringify(sitioEsperado)}: publicarlo seria publicar el catalogo de otro cliente. ` +
      `${conservado}`
    );
  }

  return null;
}
