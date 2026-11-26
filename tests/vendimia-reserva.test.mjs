import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const {
  MAX_CUERPO_BYTES,
  ajustarFichas,
  aperturaPendiente,
  debeRevisarApertura,
  edadesDeRango,
  enlaceLegal,
  estadoPopupVendimia,
  fichaVacia,
  formatoApertura,
  formatoFecha,
  formatoFechasEvento,
  iniciarReserva,
  leerApertura,
  leerEventoVendimia,
  precioAdultoDesde,
  revisarAcompanantes,
  totalAproximado,
  urlRespaldoWhatsApp,
  validarReserva,
} = await import("@/lib/vendimiaReserva");

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

/** El ejemplo del contrato de Afeleia (manual de conexión, clave `eventos`). */
const crudo = () => ({
  slug: "vendimia-2027",
  nombre: "Vendimia 2027",
  lugar: "Viña Casa Acosta, San Vicente de Tagua Tagua",
  moneda: "CLP",
  etapa: "preventa",
  preventa_hasta: "2027-03-25",
  tallas: ["S", "M", "L", "XL"],
  condiciones: { url: "https://www.casaacosta.cl/vendimia/condiciones.pdf", version: "2.0" },
  terminos: { url: "https://www.casaacosta.cl/terminos", version: "1.3" },
  rangos: [
    { nombre: "18 o más", edad_min: 18, edad_max: null, precio: 75000, lanzamiento: true },
    { nombre: "11 a 17", edad_min: 11, edad_max: 17, precio: 75000, lanzamiento: false },
    { nombre: "6 a 10", edad_min: 6, edad_max: 10, precio: 37500, lanzamiento: false },
    { nombre: "0 a 5", edad_min: 0, edad_max: 5, precio: 0, lanzamiento: false },
  ],
  lanzamiento: { precio: 69900, regalo: "copa" },
  fechas: [
    { clave: "2027-04-03", inicio: "2027-04-03T12:00:00+00:00", termino: "2027-04-03T20:00:00+00:00", disponible: true, queda_lanzamiento: true },
    { clave: "2027-04-17", inicio: "2027-04-17T13:00:00+00:00", termino: "2027-04-17T21:00:00+00:00", disponible: false, queda_lanzamiento: false },
  ],
});

const evento = leerEventoVendimia({ version: 1, productos: [], eventos: [crudo()] });
const CHECKOUT = "https://vina-casa-acosta.checkout.afeleia.cl/iniciar";

const adulto = (extra = {}) => ({
  ...fichaVacia("18 o más"),
  nombre: "Ana Pérez",
  edad: "34",
  email: "ana@ejemplo.cl",
  telefono: "+56 9 8765 4321",
  ...extra,
});

const datos = (extra = {}) => ({
  fecha: "2027-04-03",
  encargado: {
    nombre: "Juan Pérez",
    email: "juan@ejemplo.cl",
    telefono: "+56 9 1234 5678",
    comuna: "",
  },
  yoVoy: false,
  fichas: [adulto()],
  conMascotas: false,
  mascotas: "",
  permiso: false,
  ...extra,
});

const errores = (d) => {
  const r = validarReserva(evento, d);
  return r.ok ? {} : r.errores;
};

const respuesta = (status, cuerpo) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const conFetch = (fn) => ({ fetch: fn, timeoutMs: 50 });
const cuerpoValido = () => validarReserva(evento, datos()).cuerpo;

// --- Catálogo -------------------------------------------------------------------

test("sin la clave eventos no hay formulario y la página no se rompe", () => {
  assert.equal(leerEventoVendimia({ version: 1, productos: [] }), null);
  assert.equal(leerEventoVendimia({ eventos: [] }), null);
  assert.equal(leerEventoVendimia({ eventos: null }), null);
  assert.equal(leerEventoVendimia(null), null);
});

test("un evento roto se descarta entero y otro evento no se vende acá", () => {
  const sinPrecio = crudo();
  sinPrecio.rangos[0].precio = "75000";
  assert.equal(leerEventoVendimia({ eventos: [sinPrecio] }), null);
  const sinFechas = { ...crudo(), fechas: [] };
  assert.equal(leerEventoVendimia({ eventos: [sinFechas] }), null);
  const otro = { ...crudo(), slug: "yoga-2027" };
  assert.equal(leerEventoVendimia({ eventos: [otro] }), null);
});

test("con dos vendimias manda la más próxima", () => {
  const siguiente = crudo();
  siguiente.slug = "vendimia-2028";
  siguiente.fechas = siguiente.fechas.map((f) => ({
    ...f,
    inicio: f.inicio.replace("2027", "2028"),
    termino: f.termino.replace("2027", "2028"),
  }));
  assert.equal(leerEventoVendimia({ eventos: [siguiente, crudo()] }).slug, "vendimia-2027");
});

test("el total del ejemplo del brief, con y sin lanzamiento", () => {
  const conteos = { "18 o más": 2, "6 a 10": 1, "0 a 5": 1 };
  const [abierta, sinLanzamiento] = evento.fechas;
  assert.equal(totalAproximado(evento, abierta, conteos), 177300);
  assert.equal(totalAproximado(evento, sinLanzamiento, conteos), 187500);
  // A un rango sin `lanzamiento: true` nunca le toca ese precio.
  assert.equal(totalAproximado(evento, abierta, { "11 a 17": 1 }), 75000);
});

test("las horas salen en Chile a ambos lados del cambio de hora", () => {
  for (const fecha of evento.fechas) {
    const { inicio, termino } = formatoFecha(fecha, "es");
    assert.equal(inicio, "09:00", fecha.clave);
    assert.equal(termino, "17:00", fecha.clave);
  }
  assert.match(formatoFecha(evento.fechas[0], "es").dia, /sábado.*3 de abril/);
  assert.match(formatoFecha(evento.fechas[1], "es").dia, /sábado.*17 de abril/);
  assert.equal(formatoFechasEvento(evento, "es"), "3 de abril y 17 de abril de 2027");
});

test("los enlaces legales se validan por host, no por prefijo", () => {
  const api = "https://proyecto.supabase.co/functions/v1";
  assert.ok(enlaceLegal("https://www.casaacosta.cl/terminos", api));
  assert.ok(enlaceLegal("https://vinacasaacosta.cl/condiciones.pdf", api));
  assert.ok(enlaceLegal("https://proyecto.supabase.co/storage/v1/object/public/legal/c.pdf", api));
  for (const malo of [
    "https://www.casaacosta.cl@otro.com/x",
    "https://www.casaacosta.cl.otro.com/x",
    "https://otro.com/www.casaacosta.cl",
    "http://www.casaacosta.cl/terminos",
    "javascript:alert(1)",
    "https://usuario:clave@www.casaacosta.cl/x",
    "https://proyecto.supabase.co/functions/v1/otra",
    "no es una url",
  ]) {
    assert.equal(enlaceLegal(malo, api), null, malo);
  }
});

// --- Validación y cuerpo ----------------------------------------------------------

test("arma exactamente el cuerpo del contrato, con los opcionales omitidos", () => {
  const r = validarReserva(evento, datos());
  assert.equal(r.ok, true);
  assert.deepEqual(r.cuerpo, {
    reserva: {
      evento: "vendimia-2027",
      fecha: "2027-04-03",
      encargado: { nombre: "Juan Pérez", email: "juan@ejemplo.cl", telefono: "+56 9 1234 5678" },
      asistentes: [
        { nombre: "Ana Pérez", edad: 34, email: "ana@ejemplo.cl", telefono: "+56 9 8765 4321" },
      ],
      perros: 0,
    },
  });
  const texto = JSON.stringify(r.cuerpo);
  assert.doesNotMatch(texto, /null|precio|rango|tarifa/);
});

test("«Yo también voy» llena la primera ficha de adulto con el encargado", () => {
  const fichas = [fichaVacia("18 o más")];
  fichas[0].edad = "40";
  const r = validarReserva(evento, datos({ yoVoy: true, fichas }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.cuerpo.reserva.asistentes[0], {
    nombre: "Juan Pérez",
    edad: 40,
    email: "juan@ejemplo.cl",
    telefono: "+56 9 1234 5678",
  });
});

test("una ficha por persona, en orden de rango y conservando lo escrito", () => {
  const previas = [adulto()];
  const fichas = ajustarFichas(evento, { "18 o más": 2, "0 a 5": 1 }, previas);
  assert.deepEqual(fichas.map((f) => f.rango), ["18 o más", "18 o más", "0 a 5"]);
  assert.equal(fichas[0].nombre, "Ana Pérez");
  assert.equal(ajustarFichas(evento, { "0 a 5": 1 }, previas).length, 1);
});

test("la edad tiene que caer en el rango de su ficha", () => {
  assert.equal(errores(datos({ fichas: [adulto({ edad: "17" })] }))["asistentes.0.edad"], "edad_rango");
  const nino = { ...fichaVacia("6 a 10"), nombre: "Leo Pérez", edad: "11" };
  assert.equal(errores(datos({ fichas: [adulto(), nino] }))["asistentes.1.edad"], "edad_rango");
  for (const mala of ["34.5", "abc", "-1", "121", "1e2"]) {
    assert.ok(errores(datos({ fichas: [adulto({ edad: mala })] }))["asistentes.0.edad"], mala);
  }
});

test("desde los 18 el contacto es obligatorio; en menores es opcional, pero válido", () => {
  const sinContacto = errores(datos({ fichas: [adulto({ email: "", telefono: "" })] }));
  assert.equal(sinContacto["asistentes.0.email"], "requerido");
  assert.equal(sinContacto["asistentes.0.telefono"], "requerido");

  const menor = { ...fichaVacia("11 a 17"), nombre: "Sofía Pérez", edad: "15" };
  const ok = validarReserva(evento, datos({ fichas: [adulto(), menor] }));
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.cuerpo.reserva.asistentes[1], { nombre: "Sofía Pérez", edad: 15 });

  const conMalo = { ...menor, email: "no-es-correo" };
  assert.equal(errores(datos({ fichas: [adulto(), conMalo] }))["asistentes.1.email"], "email");
});

test("las reglas de texto son las del checkout", () => {
  const encargado = (cambios) => ({ ...datos().encargado, ...cambios });
  assert.ok(errores(datos({ encargado: encargado({ nombre: "J" }) }))["encargado.nombre"]);
  // Un invisible pegado desde otro programa: el checkout lo rechaza sin CORS.
  assert.ok(errores(datos({ encargado: encargado({ nombre: "Juan​ Pérez" }) }))["encargado.nombre"]);
  assert.ok(errores(datos({ encargado: encargado({ nombre: "Juan‮ Pérez" }) }))["encargado.nombre"]);
  // El unidor de los emoji de familia sí pasa.
  assert.equal(validarReserva(evento, datos({ encargado: encargado({ nombre: "Juan 👨‍👩‍👧" }) })).ok, true);
  // Los largos cuentan caracteres: 120 emoji son 240 unidades UTF-16 y valen.
  assert.equal(validarReserva(evento, datos({ encargado: encargado({ nombre: "🍇".repeat(120) }) })).ok, true);
  assert.ok(errores(datos({ encargado: encargado({ nombre: "🍇".repeat(121) }) }))["encargado.nombre"]);
  // El correo del encargado es más estricto que el de un asistente.
  assert.equal(errores(datos({ encargado: encargado({ email: "juan(x)@ejemplo.cl" }) }))["encargado.email"], "email");
  assert.equal(validarReserva(evento, datos({ fichas: [adulto({ email: "ana(x)@ejemplo.cl" })] })).ok, true);
});

test("el celular se normaliza y ocho espacios no son un celular", () => {
  const r = validarReserva(evento, datos({
    encargado: { ...datos().encargado, telefono: "+56 (9) 1234-5678" },
  }));
  assert.equal(r.cuerpo.reserva.encargado.telefono, "+56 9 1234 5678");
  for (const malo of ["        ", "1234", "fono 12345678", "+56 9 1234 5678 0000 0000"]) {
    const e = errores(datos({ encargado: { ...datos().encargado, telefono: malo } }));
    assert.ok(e["encargado.telefono"], malo);
  }
});

test("una restricción exige el permiso, y sin texto no viaja", () => {
  const conRestriccion = adulto({ conRestriccion: true, restriccion: "sin gluten" });
  assert.equal(
    errores(datos({ fichas: [conRestriccion] })).permiso_restricciones,
    "permiso",
  );
  const ok = validarReserva(evento, datos({ fichas: [conRestriccion], permiso: true }));
  assert.equal(ok.cuerpo.reserva.permiso_restricciones, true);
  assert.equal(ok.cuerpo.reserva.asistentes[0].restriccion, "sin gluten");

  // «Sí» sin escribir qué evitar se pide; no se manda vacío.
  const vacia = adulto({ conRestriccion: true, restriccion: "   " });
  assert.equal(errores(datos({ fichas: [vacia] }))["asistentes.0.restriccion"], "requerido");

  // Texto que quedó escrito antes de volver a «No»: no viaja ni pide permiso.
  const arrepentida = adulto({ conRestriccion: false, restriccion: "sin gluten" });
  const sin = validarReserva(evento, datos({ fichas: [arrepentida] }));
  assert.equal(sin.ok, true);
  assert.doesNotMatch(JSON.stringify(sin.cuerpo), /gluten|permiso_restricciones/);

  const larga = adulto({ conRestriccion: true, restriccion: "x".repeat(201) });
  assert.equal(errores(datos({ fichas: [larga], permiso: true }))["asistentes.0.restriccion"], "texto");
});

test("apertura: solo se acepta una hora con zona explícita", () => {
  assert.equal(leerApertura("2026-11-23T18:00:00-03:00"), Date.parse("2026-11-23T21:00:00Z"));
  for (const mala of [undefined, "", "mañana", "2026-11-23T18:00:00", "2026-13-40T18:00:00-03:00"]) {
    assert.equal(leerApertura(mala), null, String(mala));
  }
});

test("apertura: el aviso dura hasta una hora después y se va si una fecha abre", () => {
  const apertura = leerApertura("2026-11-23T18:00:00-03:00");
  const cerrado = { fechas: evento.fechas.map((f) => ({ ...f, disponible: false })) };
  assert.equal(aperturaPendiente(cerrado, apertura, apertura - 1), true);
  assert.equal(aperturaPendiente(cerrado, apertura, apertura + 59 * 60_000), true);
  assert.equal(aperturaPendiente(cerrado, apertura, apertura + 60 * 60_000), false);
  assert.equal(aperturaPendiente(evento, apertura, apertura - 1), false);
  assert.equal(aperturaPendiente(cerrado, null, apertura - 1), false);
});

test("apertura: se muestra en hora de Chile", () => {
  const apertura = leerApertura("2026-11-23T18:00:00-03:00");
  assert.deepEqual(formatoApertura(apertura, "es"), {
    corta: "lun 23",
    larga: "lunes 23 de noviembre",
    hora: "18:00",
  });
});

test("apertura: quien espera revisa el catálogo solo desde la hora y mientras siga cerrado", () => {
  const apertura = leerApertura("2026-11-23T18:00:00-03:00");
  const cerrado = { fechas: evento.fechas.map((f) => ({ ...f, disponible: false })) };
  assert.equal(debeRevisarApertura(cerrado, apertura, apertura - 1), false);
  assert.equal(debeRevisarApertura(cerrado, apertura, apertura), true);
  assert.equal(debeRevisarApertura(cerrado, apertura, apertura + 60 * 60_000), false);
  assert.equal(debeRevisarApertura(evento, apertura, apertura), false);
  assert.equal(debeRevisarApertura(cerrado, null, apertura), false);
});

test("fichas: quitar a alguien y agregar a otra persona parte con la ficha vacía", () => {
  const dos = ajustarFichas(evento, { "18 o más": 2 }, [
    adulto(),
    adulto({ nombre: "Persona Retirada", email: "retirada@ejemplo.cl" }),
  ]);
  const una = ajustarFichas(evento, { "18 o más": 1 }, dos);
  const otraVez = ajustarFichas(evento, { "18 o más": 2 }, una);
  assert.equal(otraVez[0].nombre, "Ana Pérez");
  assert.deepEqual(otraVez[1], { ...fichaVacia("18 o más"), edadPorRango: true });
});

test("popup: anuncia la apertura, invita a reservar y se apaga sin fechas", () => {
  const cerrado = { fechas: evento.fechas.map((f) => ({ ...f, disponible: false })) };
  assert.equal(estadoPopupVendimia(cerrado, true), "abre");
  assert.equal(estadoPopupVendimia(evento, true), "abierta");
  assert.equal(estadoPopupVendimia(evento, false), "abierta");
  assert.equal(estadoPopupVendimia(cerrado, false), null);
});

test("precio desde: con la venta cerrada se anuncia solo si se pide", () => {
  const cerrado = { ...evento, fechas: evento.fechas.map((f) => ({ ...f, disponible: false })) };
  assert.equal(precioAdultoDesde(cerrado), null);
  assert.equal(precioAdultoDesde(cerrado, true).precio, 69900);
});

test("edad por rango: viaja la mínima del rango y sigue pidiendo el contacto del adulto", () => {
  const conRango = adulto({ edad: "", edadPorRango: true });
  const ok = validarReserva(evento, datos({ fichas: [conRango] }));
  assert.equal(ok.ok, true);
  assert.equal(ok.cuerpo.reserva.asistentes[0].edad, 18);

  const sinCorreo = { ...conRango, email: "" };
  assert.equal(errores(datos({ fichas: [sinCorreo] }))["asistentes.0.email"], "requerido");

  const menor = { ...fichaVacia("11 a 17"), nombre: "Sofía Pérez", edadPorRango: true };
  const conMenor = validarReserva(evento, datos({ fichas: [adulto(), menor] }));
  assert.equal(conMenor.ok, true);
  assert.deepEqual(conMenor.cuerpo.reserva.asistentes[1], { nombre: "Sofía Pérez", edad: 11 });
});

test("el correo y el celular del encargado son obligatorios", async () => {
  for (const vacio of ["", "   "]) {
    const sinCorreo = validarReserva(evento, datos({ encargado: { ...datos().encargado, email: vacio } }));
    assert.equal(sinCorreo.ok, false);
    assert.equal(sinCorreo.errores["encargado.email"], "requerido");

    const sinCelular = validarReserva(evento, datos({ encargado: { ...datos().encargado, telefono: vacio } }));
    assert.equal(sinCelular.ok, false);
    assert.equal(sinCelular.errores["encargado.telefono"], "requerido");
  }

  // Sin ninguno de los dos, el foco cae primero en el celular, que va arriba en pantalla.
  const sinNinguno = errores(datos({ encargado: { ...datos().encargado, email: "", telefono: "" } }));
  assert.deepEqual(Object.keys(sinNinguno), ["encargado.telefono", "encargado.email"]);

  // Y se ve en pantalla: los dos campos llevan su marca.
  const formulario = (await source("components/VendimiaReserva.tsx")).replace(/\r\n/g, "\n");
  for (const campo of ["encargado.email", "encargado.telefono"]) {
    const inicio = formulario.indexOf(`campo="${campo}"`);
    assert.ok(inicio > 0, campo);
    assert.ok(formulario.slice(inicio, formulario.indexOf("/>", inicio)).includes("requerido\n"), campo);
  }
});

test("acompañantes: sin un adulto no se reserva, ni siquiera con un solo menor", () => {
  assert.equal(revisarAcompanantes(evento, { "11 a 17": 1 }).problema, "sin_adulto");
  assert.equal(revisarAcompanantes(evento, { "0 a 5": 1 }).problema, "sin_adulto");
  assert.equal(revisarAcompanantes(evento, { "18 o más": 1 }).problema, null);

  const menor = { ...fichaVacia("11 a 17"), nombre: "Leo Pérez", edad: "14" };
  assert.equal(errores(datos({ fichas: [menor] })).acompanantes, "acompanantes");
});

test("acompañantes: va un adulto por cada dos menores, también los de 0 a 5", async () => {
  const regla = revisarAcompanantes(evento, { "18 o más": 1, "11 a 17": 1, "0 a 5": 1 });
  assert.equal(regla.problema, null);
  assert.equal(regla.faltanAdultos, 0);
  assert.equal(regla.conMenores, true);

  const sobra = revisarAcompanantes(evento, { "18 o más": 1, "6 a 10": 2, "0 a 5": 1 });
  assert.equal(sobra.problema, "exceso");
  assert.equal(sobra.faltanAdultos, 1);
  assert.equal(revisarAcompanantes(evento, { "6 a 10": 5 }).faltanAdultos, 3);
  assert.equal(revisarAcompanantes(evento, { "18 o más": 2, "6 a 10": 2, "0 a 5": 2 }).problema, null);

  // Se pueden sumar menores antes que adultos: el + no se apaga por la regla, frena Continuar.
  const formulario = await source("components/VendimiaReserva.tsx");
  assert.ok(!formulario.includes("puedeSumar"), "volvió a apagarse el + de los menores");
  assert.ok(formulario.includes("acompanantes.problema === null"));

  const nino = (nombre) => ({ ...fichaVacia("6 a 10"), nombre, edad: "8" });
  const tres = datos({ fichas: [adulto(), nino("Leo Pérez"), nino("Sol Pérez"), nino("Mar Pérez")] });
  assert.equal(errores(tres).acompanantes, "acompanantes");
  const dos = datos({ fichas: [adulto(), nino("Leo Pérez"), nino("Sol Pérez")] });
  assert.equal(validarReserva(evento, dos).ok, true);
});

test("edad en lista: cada ficha ofrece solo las edades de su rango", () => {
  const [mayores, adolescentes, ninos, guaguas] = evento.rangos;
  const adultos = edadesDeRango(mayores);
  assert.equal(adultos[0], 18);
  assert.equal(adultos.at(-1), 99);
  assert.equal(adultos.length, 82);
  assert.ok(!adultos.includes(11));
  assert.deepEqual(edadesDeRango(adolescentes), [11, 12, 13, 14, 15, 16, 17]);
  assert.deepEqual(edadesDeRango(ninos), [6, 7, 8, 9, 10]);
  assert.deepEqual(edadesDeRango(guaguas), [0, 1, 2, 3, 4, 5]);
});

test("edad en lista: el adulto parte en «Prefiero no decirlo» y el menor elige", () => {
  const [adultoNuevo, menorNuevo] = ajustarFichas(evento, { "18 o más": 1, "6 a 10": 1 }, []);
  assert.equal(adultoNuevo.edadPorRango, true);
  assert.equal(menorNuevo.edadPorRango, false);

  const listo = { ...adultoNuevo, nombre: "Ana Pérez", email: "ana@ejemplo.cl", telefono: "912345678" };
  const r = validarReserva(evento, datos({ fichas: [listo] }));
  assert.equal(r.ok, true);
  assert.equal(r.cuerpo.reserva.asistentes[0].edad, 18);

  const sinElegir = { ...menorNuevo, nombre: "Leo Pérez" };
  assert.equal(errores(datos({ fichas: [listo, sinElegir] }))["asistentes.1.edad"], "requerido");
});

test("edad en lista: el formulario ya no tiene un campo libre de edad", async () => {
  const formulario = await source("components/VendimiaReserva.tsx");
  assert.ok(!formulario.includes("campo={`${ruta}.edad`}"), "volvió el campo libre");
  assert.ok(formulario.includes("edadesDeRango(rango)"));
  assert.ok(formulario.includes('t("edadNoDecir")'));
});

test("edad por rango: sin un rango conocido la edad se sigue pidiendo", () => {
  const huerfana = { ...adulto({ edad: "", edadPorRango: true }), rango: "No existe" };
  assert.equal(errores(datos({ fichas: [huerfana] }))["asistentes.0.edad"], "requerido");
});

test("mascotas: en la API el campo sigue siendo perros", () => {
  const r = validarReserva(evento, datos({ conMascotas: true, mascotas: "2" }));
  assert.equal(r.cuerpo.reserva.perros, 2);
  assert.ok(!("mascotas" in r.cuerpo.reserva));
  for (const malo of ["", "0", "11", "dos"]) {
    assert.ok(errores(datos({ conMascotas: true, mascotas: malo })).perros, malo);
  }
});

test("topes del contrato: fecha, grupo, total cero y tamaño del cuerpo", () => {
  assert.equal(errores(datos({ fecha: "2027-04-17" })).fecha, "fecha");
  assert.equal(errores(datos({ fichas: [] })).personas, "personas");
  assert.equal(errores(datos({ fichas: Array.from({ length: 21 }, () => adulto()) })).personas, "personas");

  const guagua = { ...fichaVacia("0 a 5"), nombre: "Mía Pérez", edad: "3" };
  assert.equal(errores(datos({ fichas: [guagua] })).total, "total_cero");

  const pesada = adulto({
    nombre: "ñ".repeat(120),
    email: `${"ñ".repeat(240)}@ejemplo.cl`,
    conRestriccion: true,
    restriccion: "🍇".repeat(200),
  });
  const r = errores(datos({ fichas: Array.from({ length: 20 }, () => pesada), permiso: true }));
  assert.equal(r.cuerpo, "muy_largo");
  assert.ok(MAX_CUERPO_BYTES === 16384);
});

// --- Envío ------------------------------------------------------------------------

test("200 con url del mismo origen redirige, con el dato solo en el cuerpo", async () => {
  let llamada;
  const destino = "https://vina-casa-acosta.checkout.afeleia.cl/c/abc/entrar?t=x";
  const r = await iniciarReserva(CHECKOUT, cuerpoValido(), conFetch(async (url, init) => {
    llamada = { url, init };
    return respuesta(200, { url: destino });
  }));
  assert.deepEqual(r, { ok: true, url: destino });
  assert.equal(llamada.url, CHECKOUT);
  assert.equal(llamada.init.method, "POST");
  assert.equal(llamada.init.credentials, "omit");
  assert.equal(llamada.init.headers.Accept, "application/json");
  assert.deepEqual(Object.keys(JSON.parse(llamada.init.body)), ["reserva"]);
});

test("una url de otro origen no se sigue", async () => {
  for (const url of ["https://otro.com/c/abc", "javascript:alert(1)", "/c/abc", 42]) {
    const r = await iniciarReserva(CHECKOUT, cuerpoValido(), conFetch(async () => respuesta(200, { url })));
    assert.deepEqual(r, { ok: false, tipo: "respaldo" }, String(url));
  }
});

test("los 400 y 409 se pueden corregir en la página", async () => {
  const casos = [
    [400, { error: "reserva_invalida", detalle: { campo: "asistentes.2.talla" } }, { ok: false, tipo: "campo", campo: "asistentes.2.talla" }],
    [400, { error: "reserva_invalida", detalle: { motivo: "total_cero" } }, { ok: false, tipo: "total_cero" }],
    [400, { error: "reserva_invalida", detalle: { motivo: "forma" } }, { ok: false, tipo: "revisar" }],
    [400, { error: "reserva_invalida" }, { ok: false, tipo: "revisar" }],
    [409, { error: "fecha_no_disponible" }, { ok: false, tipo: "fecha" }],
    [409, { error: "sin_cupo" }, { ok: false, tipo: "cupo" }],
    [409, { error: "edad_sin_tarifa", detalle: { asistente: 1 } }, { ok: false, tipo: "edad", asistente: 1 }],
    [409, { error: "edad_sin_tarifa" }, { ok: false, tipo: "edad", asistente: null }],
  ];
  for (const [status, cuerpo, esperado] of casos) {
    const r = await iniciarReserva(CHECKOUT, cuerpoValido(), conFetch(async () => respuesta(status, cuerpo)));
    assert.deepEqual(r, esperado, JSON.stringify(cuerpo));
  }
});

test("un 400 ilegible pide revisar, sin romper", async () => {
  const r = await iniciarReserva(CHECKOUT, cuerpoValido(), conFetch(async () => new Response("<html>", { status: 400 })));
  assert.deepEqual(r, { ok: false, tipo: "revisar" });
});

test("429, 503, 404, red, CORS y timeout van al respaldo, sin reintentar", async () => {
  for (const [status, error] of [[429, "demasiadas_solicitudes"], [503, "checkout_apagado"], [503, "no_disponible"], [404, "sitio_desconocido"], [500, "x"]]) {
    let intentos = 0;
    const r = await iniciarReserva(CHECKOUT, cuerpoValido(), conFetch(async () => {
      intentos += 1;
      return respuesta(status, { error });
    }));
    assert.deepEqual(r, { ok: false, tipo: "respaldo" }, `${status} ${error}`);
    assert.equal(intentos, 1);
  }
  const red = await iniciarReserva(CHECKOUT, cuerpoValido(), conFetch(async () => {
    throw new TypeError("Failed to fetch");
  }));
  assert.deepEqual(red, { ok: false, tipo: "respaldo" });

  const lento = await iniciarReserva(CHECKOUT, cuerpoValido(), conFetch((_url, init) =>
    new Promise((_ok, falla) => init.signal.addEventListener("abort", () => falla(init.signal.reason))),
  ));
  assert.deepEqual(lento, { ok: false, tipo: "respaldo" });
});

// --- Respaldo y datos de salud ------------------------------------------------------

test("el respaldo por WhatsApp nombra solo evento, fecha y personas", async () => {
  const messages = JSON.parse(await source("messages/es.json"));
  const plantilla = messages.activities.vendimia.reserva.whatsapp;
  const variables = [...plantilla.matchAll(/\{(\w+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(variables)], ["evento", "fecha", "personas"]);

  const url = urlRespaldoWhatsApp(
    "https://wa.me/56900000000",
    (v) => `${v.evento}|${v.fecha}|${v.personas}|${Object.keys(v).length}`,
    { evento: "Vendimia 2027", fecha: "sábado, 3 de abril", personas: 4, nombre: "Ana", restriccion: "sin gluten" },
  );
  const texto = decodeURIComponent(url);
  assert.match(texto, /Vendimia 2027\|sábado, 3 de abril\|4\|3$/);
  assert.doesNotMatch(texto, /Ana|gluten/);
});

test("el formulario no guarda ni registra datos personales", async () => {
  for (const archivo of ["components/VendimiaReserva.tsx", "lib/vendimiaReserva.ts", "lib/eventoVendimia.ts"]) {
    const texto = await source(archivo);
    assert.doesNotMatch(texto, /localStorage|sessionStorage|indexedDB|document\.cookie/, archivo);
    assert.doesNotMatch(texto, /console\.|sendBeacon|gtag|dataLayer/, archivo);
    assert.doesNotMatch(texto, /URLSearchParams|history\.(push|replace)State/, archivo);
  }
  const formulario = await source("components/VendimiaReserva.tsx");
  // Un `submit` que se escape nunca puede dejar los datos en la URL.
  assert.match(formulario, /method="post"/);
  assert.doesNotMatch(formulario, /method="get"/i);
  // El navegador no guarda en su autocompletado lo que se escribe como restricción.
  const campo = formulario.match(/campo=\{`\$\{ruta\}\.restriccion`\}[\s\S]*?\/>/)?.[0];
  assert.ok(campo, "falta el campo de la restricción");
  assert.match(campo, /autoComplete="off"/);
  // El respaldo recibe solo los tres datos.
  const respaldo = formulario.match(/urlRespaldoWhatsApp\([\s\S]*?\n {2}\);/)?.[0];
  assert.ok(respaldo, "falta el respaldo");
  assert.doesNotMatch(respaldo, /encargado|fichas|restriccion|nombre:/);
});

test("el short se abre sin cookies, y si YouTube no deja, lleva a YouTube", async () => {
  const { VENDIMIA_SHORT_ID, urlShortVendimia, urlVerEnYoutube } = await import("@/data/vendimiaVideo");
  const url = new URL(urlShortVendimia(VENDIMIA_SHORT_ID, true));
  assert.equal(url.origin, "https://www.youtube-nocookie.com");
  assert.equal(url.pathname, `/embed/${VENDIMIA_SHORT_ID}`);
  // Con restricción de edad no se monta un reproductor que YouTube va a bloquear.
  assert.equal(urlShortVendimia(VENDIMIA_SHORT_ID, false), null);
  assert.equal(urlVerEnYoutube(VENDIMIA_SHORT_ID), `https://www.youtube.com/shorts/${VENDIMIA_SHORT_ID}`);
  assert.equal(urlShortVendimia(null, true), null);
  assert.equal(urlVerEnYoutube(null), null);
  for (const malo of ["corto", "abc/../../x", "PpOdJgVFZpc?x=1", "<script>abc"]) {
    assert.equal(urlShortVendimia(malo, true), null, malo);
    assert.equal(urlVerEnYoutube(malo), null, malo);
  }
  // El reproductor no se monta hasta que la persona aprieta play.
  const componente = await source("components/VendimiaShort.tsx");
  assert.match(componente, /url && reproduciendo \? \(\s*<iframe/);
});

test("la venta está apagada salvo que el interruptor diga exactamente abierta", async () => {
  const { checkoutDeReservas } = await import("@/lib/vendimiaReserva");
  for (const valor of [undefined, "", "true", "1", "ABIERTA", "cerrada", " abierta"]) {
    assert.equal(checkoutDeReservas(valor, CHECKOUT), null, String(valor));
  }
  assert.equal(checkoutDeReservas("abierta", CHECKOUT), CHECKOUT);
  assert.equal(checkoutDeReservas("abierta", undefined), null);

  // Las tres puertas a reservar leen ese mismo valor, y nadie arma el suyo.
  assert.match(await source("lib/eventoVendimia.ts"), /checkoutDeReservas\(\s*process\.env\.NEXT_PUBLIC_VENDIMIA_RESERVAS/);
  for (const archivo of ["VendimiaReserva", "VendimiaHeroReserva", "VendimiaBarraReserva"]) {
    const componente = await source(`components/${archivo}.tsx`);
    assert.match(componente, /urlCheckoutVendimia/, archivo);
    assert.doesNotMatch(componente, /checkoutIniciarUrl|NEXT_PUBLIC_AFELEIA_CHECKOUT_URL/, archivo);
  }
});

test("el código no trae precios, fechas ni cupos escritos", async () => {
  for (const archivo of ["components/VendimiaReserva.tsx", "components/FechasVendimia.tsx", "lib/eventoVendimia.ts"]) {
    const texto = await source(archivo);
    assert.doesNotMatch(texto, /75000|69900|37500|2027-04|"2027/, archivo);
  }
});

test("quien compra ve una reserva, nunca un producto, carrito ni pedido", async () => {
  const prohibido = {
    es: /producto|carrito|pedido/i,
    en: /\bproduct|\bcart\b|\border\b/i,
    pt: /produto|carrinho|pedido/i,
  };
  for (const [locale, patron] of Object.entries(prohibido)) {
    const messages = JSON.parse(await source(`messages/${locale}.json`));
    assert.doesNotMatch(JSON.stringify(messages.activities.vendimia.reserva), patron, locale);
  }
});

test("todos los textos que usa el formulario existen en los tres idiomas", async () => {
  const formulario = await source("components/VendimiaReserva.tsx");
  const claves = [...formulario.matchAll(/\bt\("([\w.]+)"/g)].map((m) => m[1]);
  assert.ok(claves.length > 30);
  const codigos = (await source("lib/vendimiaReserva.ts"))
    .match(/export type CodigoError =([\s\S]*?);/)[1]
    .match(/"(\w+)"/g)
    .map((c) => `errores.${c.replaceAll('"', "")}`);
  const avisos = ["fecha", "cupo", "edad", "revisar", "total_cero", "campos", "muy_largo", "respaldo"].map(
    (a) => `avisos.${a}`,
  );
  for (const locale of ["es", "en", "pt"]) {
    const messages = JSON.parse(await source(`messages/${locale}.json`));
    const bloque = messages.activities.vendimia.reserva;
    for (const clave of [...claves, ...codigos, ...avisos]) {
      const valor = clave.split(".").reduce((nodo, parte) => nodo?.[parte], bloque);
      assert.equal(typeof valor, "string", `${locale}: falta reserva.${clave}`);
    }
  }
});
