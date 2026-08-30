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
  // Sin sitio pedido no hay dueño contra que comparar, y aceptar "cualquiera"
  // seria escribir como snapshot una respuesta que nadie verifico. El generador
  // ya corta antes por falta de configuracion; esto es que la regla no se
  // ensanche sola al compartirla con las otras capas.
  if (typeof sitioEsperado !== "string" || sitioEsperado === "") {
    return "no se pidio ningun sitio: no se puede verificar de quien es la respuesta";
  }
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
  // Netlify define `CONTEXT` (production / deploy-preview / branch-deploy) y
  // `NETLIFY` en todos sus builds. Sirven para distinguir "clon local" de
  // "despliegue", que es la unica distincion que importa acá abajo.
  const enDespliegue = env.CONTEXT !== undefined || env.NETLIFY === "true";

  if (url === undefined && sitio === undefined) {
    // Sin ninguna de las dos: en local es un clon sin `.env.local` y se
    // construye con el snapshot committeado. En un DESPLIEGUE es otra cosa: el
    // sitio queda sirviendo la copia para siempre y en verde, y ademas ninguna
    // de las cuatro capas puede comprobar de quien es ese catalogo —`isOwnCatalog`
    // sin sitio configurado no tiene contra que comparar—. O sea que la falla que
    // esta rama vino a cerrar reaparece justo en la configuracion mas facil de
    // equivocar: la que todavia no se cargo.
    if (!enDespliegue) return null;
    return (
      "faltan NEXT_PUBLIC_AFELEIA_API_URL y NEXT_PUBLIC_AFELEIA_SITIO en un build de " +
      `despliegue (CONTEXT=${JSON.stringify(env.CONTEXT)}): el sitio quedaria sirviendo el ` +
      "snapshot committeado para siempre, y sin sitio configurado tampoco se puede verificar " +
      "de que cliente es ese catalogo. Cargarlas en Netlify -> Project configuration -> " +
      "Environment variables."
    );
  }

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
  // El `#` vacio no se ve en `.hash` pero SI sobrevive a `toString()`, asi que
  // se mira tambien el texto crudo: un control que no cubre lo que dice cubrir
  // es peor que no tenerlo.
  if (endpoint.search !== "" || endpoint.hash !== "" || url.includes("#")) {
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
  if (env.CONTEXT?.toLowerCase() === "production" && endpoint.protocol !== "https:") {
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
    // "No declara dueño" y "declara OTRO dueño" son dos hechos distintos, y el
    // mensaje tiene que decir cual es: con `JSON.stringify(undefined)` el aviso
    // salia como "del sitio undefined", que parece un bug del script y no del
    // archivo. Los dos frenan igual —lo que no se puede verificar no se publica—
    // pero la salida de cada uno es otra.
    const sinDueño = typeof catalogo.sitio !== "string" || catalogo.sitio === "";
    if (sinDueño) {
      return (
        "el snapshot de fallback no declara de que sitio es, asi que no se puede verificar " +
        `que sea de ${JSON.stringify(sitioEsperado)}. Regeneralo con ` +
        "`npm run catalogo:snapshot`. " +
        `${conservado}`
      );
    }
    return (
      `el snapshot de fallback es del sitio ${JSON.stringify(catalogo.sitio)} y este sitio es ` +
      `${JSON.stringify(sitioEsperado)}: publicarlo seria publicar el catalogo de otro cliente. ` +
      `${conservado}`
    );
  }

  return null;
}

/**
 * Que hace el prebuild al cerrar, dado lo que quedo en el disco.
 *
 * Es pura —no lee disco, no imprime, no sale del proceso— y eso es todo el
 * punto: hasta esta tanda, las dos puertas que pueden FRENAR UN DEPLOY, sus dos
 * escotillas y sus codigos de salida no los ejercitaba ningun test. Un typo en
 * el nombre de una escotilla no lo detectaba nadie hasta que alguien la
 * necesitara en medio de un incidente.
 *
 * Las reglas, en orden:
 *
 *   1. **No hay catalogo servible, o es de otro sitio** (`razon`): no se
 *      construye. Escotilla `AFELEIA_PERMITIR_SIN_CATALOGO=1`.
 *   2. **El par no se pudo juzgar** —otro proceso estaba escribiendo—: se
 *      construye. La lectura habria sido de un refresco en vuelo, y frenar un
 *      deploy por eso es frenar un build inocente.
 *   3. **Falta el sello**: se construye, y se grita. El sello es un control de
 *      PROCEDENCIA, no de servibilidad: el snapshot ya paso el contrato y el
 *      dueño en el paso 1. Frenar acá convertiria una caida de Afeleia —o un
 *      archivo borrado— en un deploy imposible, que es justo la regla que ordena
 *      todo este archivo.
 *   4. **El sello CONTRADICE al snapshot**: no se construye. Eso no es un
 *      archivo que falta: es alguien que toco la ultima linea de defensa del
 *      sitio por fuera del protocolo, y no se sabe que catalogo se estaria
 *      desplegando. Escotilla `AFELEIA_PERMITIR_PAR_A_MEDIAS=1`.
 *
 * @param {{razon: string|null, parCoherente: boolean, motivoDelPar: string|null,
 *          parJuzgable?: boolean, env?: Record<string, string|undefined>}} estado
 * @returns {{salida: 0|1, nivel: "info"|"warn"|"error", mensaje: string|null}}
 */
export function decisionDeCierre({
  razon,
  parCoherente,
  motivoDelPar,
  parJuzgable = true,
  env = {},
}) {
  const seguir = { salida: 0, nivel: "info", mensaje: null };

  if (razon) {
    if (env.AFELEIA_PERMITIR_SIN_CATALOGO === "1") {
      return {
        salida: 0,
        nivel: "warn",
        mensaje:
          `[afeleia] ${razon}\n` +
          "[afeleia] AFELEIA_PERMITIR_SIN_CATALOGO=1: se construye igual. Si el motivo es un " +
          "snapshot de otro sitio, lo que se publica es la tienda VACIA —el runtime tampoco " +
          "sirve un catalogo ajeno—, no el catalogo del otro cliente. Es una decision " +
          "operativa deliberada; sacar la variable despues.",
      };
    }
    return {
      salida: 1,
      nivel: "error",
      mensaje:
        `[afeleia] ${razon}\n` +
        "[afeleia] Como salir: regenerar el snapshot con `npm run catalogo:snapshot` contra " +
        "una API sana y commitearlo, o —si hace falta publicar YA con la tienda vacia— " +
        "volver a desplegar con AFELEIA_PERMITIR_SIN_CATALOGO=1.",
    };
  }

  if (!parJuzgable || parCoherente) return seguir;

  if (motivoDelPar === "no hay sello") {
    return {
      salida: 0,
      nivel: "warn",
      mensaje:
        "[afeleia] falta data/catalogo-fallback.integrity.json: el snapshot es servible y de " +
        "este sitio, asi que el build sigue, pero su procedencia deja de estar sellada. " +
        "Correr `npm run catalogo:sellar` y commitear el sello.",
    };
  }

  const detalle =
    `el snapshot y su sello no cierran (${motivoDelPar}): no se sabe que catalogo se ` +
    "estaria desplegando.";

  if (env.AFELEIA_PERMITIR_PAR_A_MEDIAS === "1") {
    return {
      salida: 0,
      nivel: "warn",
      mensaje:
        `[afeleia] ${detalle}\n` +
        "[afeleia] AFELEIA_PERMITIR_PAR_A_MEDIAS=1: se construye igual. Es una decision " +
        "operativa deliberada; sacar la variable despues.",
    };
  }

  return {
    salida: 1,
    nivel: "error",
    mensaje:
      `[afeleia] ${detalle}\n` +
      "[afeleia] Como salir: `npm run catalogo:snapshot` contra una API sana (regenera y " +
      "sella el par), o `npm run catalogo:sellar` si el snapshot es el bueno y lo unico " +
      "desactualizado es el sello. Para publicar YA con lo que hay: " +
      "AFELEIA_PERMITIR_PAR_A_MEDIAS=1.",
  };
}
