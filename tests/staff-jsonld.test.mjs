import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";

const { buildStaffJsonLd } = await import("@/lib/siteJsonLd");

/**
 * La regla que este test cuida: en el marcado del equipo hay exactamente las
 * personas que la pagina muestra, y de cada una solo lo que se ve.
 *
 * El riesgo de esta pagina no es marcar de menos: es que a alguien le resulte
 * comodo enriquecer los perfiles con un LinkedIn, un correo o un titulo que la
 * ficha no dice. Eso deja de ser structured data y pasa a ser una afirmacion
 * inventada sobre una persona real.
 */

const MIEMBROS = [
  {
    key: "damian",
    name: "Damian Acosta",
    role: "Cofundador",
    bio: "Impulsa un espacio donde tradicion e innovacion se unen.",
    image: "/images/staff/damian.webp",
  },
  {
    key: "enrique",
    name: "Enrique Pizarro",
    role: "Agronomo",
    bio: "Cuida cada parra como un legado vivo.",
    image: "/images/staff/enrique.webp",
  },
];

const COPY = { name: "Staff", description: "El equipo de la vina." };

function nodos(graph, tipo) {
  return graph["@graph"].filter((n) =>
    Array.isArray(n["@type"]) ? n["@type"].includes(tipo) : n["@type"] === tipo,
  );
}

test("hay una Person por cada persona que la pagina dibuja", () => {
  const personas = nodos(buildStaffJsonLd("es", COPY, MIEMBROS), "Person");
  assert.equal(personas.length, MIEMBROS.length);
  assert.deepEqual(
    personas.map((p) => p.name),
    MIEMBROS.map((m) => m.name),
  );
});

test("cada persona declara cargo, resena y retrato absoluto", () => {
  const [damian] = nodos(buildStaffJsonLd("es", COPY, MIEMBROS), "Person");
  assert.equal(damian.jobTitle, "Cofundador");
  assert.equal(damian.description, MIEMBROS[0].bio);
  assert.match(damian.image, /^https?:\/\/.+\/images\/staff\/damian\.webp$/);
});

test("ninguna persona declara datos de contacto ni perfiles propios", () => {
  for (const persona of nodos(buildStaffJsonLd("es", COPY, MIEMBROS), "Person")) {
    for (const campo of ["sameAs", "email", "telephone", "address"]) {
      assert.ok(
        !(campo in persona),
        `${persona.name} declara ${campo}, que la pagina no publica`,
      );
    }
  }
});

test("el vinculo con la vina esta declarado desde los dos lados", () => {
  const graph = buildStaffJsonLd("es", COPY, MIEMBROS);
  const [vina] = nodos(graph, "Winery");
  const personas = nodos(graph, "Person");

  for (const persona of personas) {
    assert.equal(persona.worksFor["@id"], vina["@id"]);
  }
  assert.deepEqual(
    vina.employee.map((e) => e["@id"]),
    personas.map((p) => p["@id"]),
  );
});

test("el @id de cada persona cuelga de la URL de staff de su idioma", () => {
  for (const locale of ["es", "en", "pt"]) {
    const [damian] = nodos(buildStaffJsonLd(locale, COPY, MIEMBROS), "Person");
    assert.ok(
      damian["@id"].endsWith(`/${locale}/staff#damian`),
      `en ${locale} el @id es ${damian["@id"]}`,
    );
  }
});
