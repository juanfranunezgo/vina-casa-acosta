import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

test("footer links its Facebook icon to the official profile", async () => {
  const [footerSource, contactSource, ...messages] = await Promise.all([
    readFile(new URL("../components/Footer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/contact.ts", import.meta.url), "utf8"),
    ...["es", "en", "pt"].map((locale) =>
      readFile(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"),
    ),
  ]);

  assert.match(contactSource, /FACEBOOK_URL\s*=\s*"https:\/\/www\.facebook\.com\/vinacasaacosta\/"/);
  assert.match(footerSource, /FACEBOOK_URL/);
  assert.match(footerSource, /key:\s*"facebook"/);
  assert.match(footerSource, /https:\/\/maps\.app\.goo\.gl\/oWWNuFKGuqojD86B9/);
  assert.match(footerSource, /https:\/\/ligts\.cl/);
  assert.match(footerSource, /developedBy/);
  assert.match(footerSource, /mt-1 text-\[0\.9375rem\] font-body text-on-surface/);
  assert.doesNotMatch(footerSource, /font-medium text-primary transition-colors hover:text-wine-accent/);
  assert.doesNotMatch(footerSource, /key:\s*"tripadvisor"/);
  for (const messageSource of messages) {
    assert.match(messageSource, /"facebook": "Facebook"/);
    assert.match(messageSource, /"developedBy":/);
  }
});

test("each wine detail offers its own optimized technical PDF", async () => {
  const sheets = [
    "ombu-carmenere",
    "ombu-tannat",
    "ombu-cabernet-sauvignon",
    "lajau-sam",
    "lajau-deti",
    "lajau-betum",
    "lajau-betum-yu",
    "estacion-francia-carmenere",
    "estacion-francia-tannat",
    "bera-rose",
    "guidai-espumante",
    "yaray-gua-carmenere",
    "yaray-gua-chardonnay-viognier",
  ];
  const [wineSource, detailSource, ...files] = await Promise.all([
    readFile(new URL("../data/wines.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/[locale]/vinos/[slug]/page.tsx", import.meta.url), "utf8"),
    ...sheets.map((sheet) => stat(fileURLToPath(new URL(`../public/documentos/fichas-tecnicas/${sheet}.pdf`, import.meta.url)))),
  ]);

  assert.match(detailSource, /FileText/);
  assert.match(detailSource, /wine\.technicalSheet/);
  assert.match(detailSource, /technicalSheet/);
  assert.match(detailSource, /target="_blank"/);
  for (const sheet of sheets) {
    assert.match(wineSource, new RegExp(`technicalSheet:\\s*"/documentos/fichas-tecnicas/${sheet}\\.pdf"`));
  }
  for (const file of files) {
    assert.ok(file.size > 100_000 && file.size < 1_000_000);
  }
});

test("wine details keep the technical sheet secondary and show four useful recommendations", async () => {
  const [detailSource, purchaseSource] = await Promise.all([
    readFile(new URL("../app/[locale]/vinos/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ProductPurchase.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(detailSource, /font-accent text-xl font-light italic text-primary/);
  assert.match(detailSource, /variant="link"/);
  // `catalog` y no `wines`: la ficha dejo de leer data/wines.ts y ahora recorre
  // el catalogo que sirve la API de Afeleia.
  assert.match(detailSource, /catalog\s*\.filter\(\(w\) => w\.line !== wine\.line/);
  assert.match(detailSource, /slice\(0, 4\)/);
  assert.match(detailSource, /lg:grid-cols-4/);
  assert.match(purchaseSource, /whitespace-nowrap/);
});

test("shop eyebrow and mobile activities navigation match the refined site pattern", async () => {
  // La vitrina de la tienda se partio en servidor (page.tsx, resuelve el catalogo)
  // y cliente (TiendaCatalogo.tsx, filtros y grilla). El markup que este test
  // protege vive desde entonces en el componente cliente.
  const [shopSource, navbarSource] = await Promise.all([
    readFile(new URL("../components/TiendaCatalogo.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/Navbar.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(shopSource, /font-accent text-xl font-light italic text-primary/);
  assert.match(navbarSource, /mobileActivitiesOpen/);
  assert.match(navbarSource, /setMobileActivitiesOpen/);
  assert.match(navbarSource, /aria-expanded=\{mobileActivitiesOpen\}/);
  assert.match(navbarSource, /tours\.map\(\(tour\)/);
});

test("deploy lint avoids synchronous state changes inside effects", async () => {
  // Mismo motivo que el test de arriba: el estado de los filtros vive en
  // TiendaCatalogo.tsx desde que la tienda se partio servidor/cliente.
  const [shopSource, cartButtonSource, navbarSource] = await Promise.all([
    readFile(new URL("../components/TiendaCatalogo.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/CartButton.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/Navbar.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(cartButtonSource, /useSyncExternalStore/);
  assert.doesNotMatch(cartButtonSource, /useEffect\(/);
  assert.match(shopSource, /const startFiltering/);
  assert.doesNotMatch(shopSource, /useEffect\(\(\) => \{\s*setIsFiltering\(true\)/);
  assert.match(navbarSource, /const closeMobileMenu/);
  assert.doesNotMatch(navbarSource, /useEffect\(\(\) => \{\s*setOpen\(false\)/);
  assert.doesNotMatch(navbarSource, /if \(!open\) setMobileActivitiesOpen\(false\)/);
});

test("CollectionBand shows every wine of its line without client state", async () => {
  const [source, photosSource] = await Promise.all([
    readFile(new URL("../components/CollectionBand.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/CollectionPhotos.tsx", import.meta.url), "utf8"),
  ]);
  // El "Ver más vinos" se eliminó: cada banda muestra todos los vinos de su
  // línea, y sin el estado del acordeón el componente volvió a ser de servidor.
  // Este test dejó de exigir `"use client"` y el slice(0, 2) por eso, no porque
  // se hayan roto: pedían lo contrario de lo que el cliente decidió.
  assert.doesNotMatch(source, /^"use client";/);
  assert.doesNotMatch(source, /wines\.slice\(0, 2\)/);
  assert.doesNotMatch(source, /aria-expanded/);
  assert.match(source, /flip\s*\?\s*"lg:grid-cols-\[minmax\(0,6fr\)_minmax\(0,4fr\)\]"\s*:\s*"lg:grid-cols-\[minmax\(0,4fr\)_minmax\(0,6fr\)\]"/);
  assert.doesNotMatch(source, /compact/);
  assert.doesNotMatch(source, /lg:min-h-\[680px\]/);
  // El marco 4:5 se mudó a CollectionPhotos cuando se extrajo el carrusel. Es
  // la proporción que fija el recorte de las 14 fotos: si alguien la cambia acá
  // sin regenerar los masters, las fotos se deforman.
  assert.match(photosSource, /aspect-\[4\/5\].*rounded-\[1\.25rem\]/s);
});

test("wine page uses the optimized cork image as a full-screen dark hero", async () => {
  const [pageSource, navbarSource] = await Promise.all([
    readFile(new URL("../app/[locale]/vinos/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/Navbar.tsx", import.meta.url), "utf8"),
  ]);

  // El hero pasó a <picture> con dos encuadres (ver scripts/optimize-heros.mjs):
  // el máster 2560 quedó como el tramo ancho del srcSet y el `src` de respaldo
  // es el 1920. La intención del test no cambió —corcho, oscuro, a pantalla
  // completa— solo el markup que la cumple.
  assert.match(pageSource, /\/images\/vinos\/hero-corchos\.webp 2560w/);
  assert.match(pageSource, /src="\/images\/vinos\/hero-corchos-1920\.webp"/);
  assert.match(pageSource, /fetchPriority="high"/);
  assert.match(pageSource, /min-h-\[100svh\]/);
  assert.match(pageSource, /from-black\/70 via-black\/35 to-black\/5/);
  assert.match(navbarSource, /pathname === `\$\{homePath\}\/vinos`/);
});

test("WineCard uses the full card format for the initial two-wine presentation", async () => {
  const source = await readFile(new URL("../components/WineCard.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /description:\s*string/);
  assert.doesNotMatch(source, /line-clamp-2/);
  assert.doesNotMatch(source, /compact/);
  assert.match(source, /aspect-\[4\/5\]/);
  assert.match(source, /object-contain p-5/);
  assert.match(source, /border-t border-on-surface-variant\/10/);
});

test("sold-out source guard keeps stock wired to cards and purchase actions", async () => {
  // Este test es un guard de cableado, no cobertura del DOM: el repo todavía no
  // tiene renderer. La Task 8 debe comprobar el atributo disabled renderizado.
  const [cardSource, bandSource, winesSource, cartButtonSource, shopSource, purchaseSource, detailSource] =
    await Promise.all([
      readFile(new URL("../components/WineCard.tsx", import.meta.url), "utf8"),
      readFile(new URL("../components/CollectionBand.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/[locale]/vinos/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../components/AddToCartButton.tsx", import.meta.url), "utf8"),
      readFile(new URL("../components/TiendaCatalogo.tsx", import.meta.url), "utf8"),
      readFile(new URL("../components/ProductPurchase.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/[locale]/vinos/[slug]/page.tsx", import.meta.url), "utf8"),
    ]);

  assert.match(cardSource, /\{agotado && \(/);
  assert.match(cardSource, /\{soldOutLabel\}/);
  assert.match(cardSource, /bg-surface-container-highest/);
  assert.match(bandSource, /agotado=\{wine\.agotado\}/);
  assert.match(winesSource, /agotado:\s*wine\.agotado/);

  assert.match(cartButtonSource, /disabled=\{agotado\}/);
  assert.match(cartButtonSource, /aria-disabled=\{agotado\}/);
  assert.match(cartButtonSource, /t\("soldOut"\)/);
  assert.match(shopSource, /agotado=\{wine\.agotado\}/);

  assert.match(purchaseSource, /disabled=\{agotado\}/);
  assert.match(purchaseSource, /aria-disabled=\{agotado\}/);
  assert.match(purchaseSource, /t\("soldOut"\)/);
  assert.match(detailSource, /agotado=\{wine\.agotado\}/);
});

test("the sold-out badge stays outside the dimmed container so it keeps AA contrast", async () => {
  // Guard de contraste, no de estilo. `text-on-surface-variant` (#544341) sobre
  // `bg-surface-container-highest` (#e4e2e1) da 7.21:1; adentro del contenedor
  // con `opacity-70` compone sobre la tarjeta blanca y cae a 3.41:1, bajo el
  // 4.5:1 que AA pide para 12px/600. Atenuar la foto es intencional; atenuar el
  // aviso de agotado es perder la señal que la feature existe para dar.
  //
  // Es source-level y por lo tanto frágil: si alguien reordena el JSX sin romper
  // la propiedad, este test miente. El chequeo real —contraste sobre el DOM
  // renderizado— depende de la decisión de renderer de la Task 8.
  const cardSource = await readFile(new URL("../components/WineCard.tsx", import.meta.url), "utf8");

  // El badge se posiciona contra el <Link>, que por eso tiene que ser `relative`.
  assert.match(cardSource, /className="group relative flex/);
  // Y aparece recién después de cerrar el div atenuado, sin que se abra otro
  // <div> en el medio: eso último es lo que volvería a meterlo en un contenedor.
  assert.match(cardSource, /agotado \? "opacity-70" : ""[\s\S]*?<\/div>(?:(?!<div)[\s\S])*?\{agotado && \(/);
});

test("cart sold-out source guard refreshes stock once per session and fails open", async () => {
  // También es un guard de cableado: sin renderer no demuestra el resultado
  // visual, pero evita volver a persistir un dato de stock que nace obsoleto.
  const [drawerSource, cartSource, contractSource] = await Promise.all([
    readFile(new URL("../components/CartDrawer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/cart.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/afeleia/contract.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(cartSource, /export type CartItem = \{[\s\S]*?\bagotado\b[\s\S]*?\};/);
  // El store no expone un total: el del pedido depende del stock y lo calcula
  // el CartDrawer. Se mira la declaración (`totalCLP:`) y no la palabra suelta,
  // porque el comentario de lib/cart.ts la nombra justamente para prohibirla.
  assert.doesNotMatch(cartSource, /totalCLP\s*:/);
  // `contract.ts` existe para que el browser lea el contrato sin arrastrar el
  // snapshot de fallback. Un solo import puede meter ese JSON en el bundle.
  assert.doesNotMatch(contractSource, /^\s*import\s/m);
  assert.match(drawerSource, /if \(!isOpen \|\| soldOutSlugs !== null\) return/);
  assert.match(drawerSource, /catalogRequest \?\?= fetchSoldOutSlugs\(\)/);
  assert.match(drawerSource, /if \(slugs === null\) catalogRequest = null/);
  assert.match(drawerSource, /signal: AbortSignal\.timeout\(5_000\)/);
  assert.match(drawerSource, /if \(!response\.ok\) return null/);
  assert.match(drawerSource, /if \(!isValidCatalog\(payload\)\) return null/);
  assert.match(drawerSource, /soldOutSlugs\?\.has\(item\.slug\) \?\? false/);
  assert.match(drawerSource, /\{t\("soldOut"\)\}/);
  assert.match(drawerSource, /disabled=\{isSoldOut\}/);
  assert.match(drawerSource, /aria-disabled=\{isSoldOut\}/);
  assert.match(drawerSource, /const orderLines = cartLines\.filter\(\(\{ isSoldOut \}\) => !isSoldOut\)/);
  assert.match(drawerSource, /orderLines\.reduce/);
  assert.match(drawerSource, /\.\.\.orderLines\.map/);
  assert.match(drawerSource, /\{t\("soldOutNotice"\)\}/);
  assert.match(drawerSource, /disabled\s+aria-disabled="true"/);
  assert.match(drawerSource, /\{t\("allSoldOut"\)\}/);
});

test("wine collection cards use their line hierarchy instead of the generic wine type", async () => {
  const source = await readFile(new URL("../app/[locale]/vinos/page.tsx", import.meta.url), "utf8");
  assert.match(source, /const cardEyebrowOf/);
  assert.match(source, /wine\.line === "Ombú"/);
  assert.match(source, /wine\.line === "Lajau"/);
  assert.match(source, /eyebrow: cardEyebrowOf\(wine\)/);
});

test("collection showcase starts with Estación Francia and then Ombú", async () => {
  const source = await readFile(new URL("../app/[locale]/vinos/page.tsx", import.meta.url), "utf8");
  assert.match(source, /const collectionLines = \[\s*"Estación Francia",\s*"Ombú"/s);
  assert.match(source, /collectionLines\.map/);
});

test("Spanish catalog copy calls Berá a Rosé", async () => {
  const source = await readFile(new URL("../messages/es.json", import.meta.url), "utf8");
  assert.match(source, /"Rosado": "Rosé"/);
});

test("collection images are optimized as uniform 4:5 WebP assets", async () => {
  // Antes la lista era fija y con el nombre base de cada línea. Se rompió dos
  // veces: cuando llegaron las 14 fotos nuevas (Ombú 3, Lajau 3, Estación
  // Francia 4…) y cuando la portada de Guidaí tuvo que renombrarse a `-v2` para
  // saltear la caché del optimizador. Ahora barre el directorio: una foto nueva
  // entra al test sola, y ninguna puede colarse sin cumplir el 4:5.
  const dir = fileURLToPath(new URL("../public/images/vinos/", import.meta.url));
  const files = (await readdir(dir)).filter(
    (name) => name.startsWith("coleccion-") && name.endsWith(".webp"),
  );
  assert.ok(files.length >= 14, `esperaba al menos 14 fotos de colección, hay ${files.length}`);

  for (const file of files) {
    const filePath = join(dir, file);
    const [metadata, fileStat] = await Promise.all([sharp(filePath).metadata(), stat(filePath)]);
    assert.equal(metadata.width, 1200, `${file} debería medir 1200 de ancho`);
    assert.equal(metadata.height, 1500, `${file} debería medir 1500 de alto`);
    assert.equal(metadata.format, "webp");
    assert.ok(fileStat.size < 700_000, `${file} should remain below 700 KB`);
  }
});

test("cork hero is optimized as a responsive WebP master", async () => {
  const path = new URL("../public/images/vinos/hero-corchos.webp", import.meta.url);
  const filePath = fileURLToPath(path);
  const [metadata, fileStat] = await Promise.all([sharp(filePath).metadata(), stat(filePath)]);

  assert.equal(metadata.width, 2560);
  assert.equal(metadata.height, 1707);
  assert.equal(metadata.format, "webp");
  assert.ok(fileStat.size < 1_000_000, "hero should remain below 1 MB");
});

test("activities keeps mobile navigation clear and sends EFE visitors to ticket sales", async () => {
  const [activitiesSource, tabsSource, navbarSource, detailSource, dataSource] = await Promise.all([
    readFile(new URL("../app/[locale]/actividades/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ActivitiesTabs.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/Navbar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[locale]/actividades/[categoria]/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../data/activities.ts", import.meta.url), "utf8"),
  ]);

  assert.match(activitiesSource, /fontSize: "clamp\(2\.25rem, 6\.4vw, 4\.5rem\)"/);
  assert.match(activitiesSource, /target="_blank"/);
  // La sub-nav volvió a ser sticky, pero solo en desktop: en móvil tapaba la
  // sección que la persona acababa de elegir. El test pedía que no fuera sticky
  // nunca — ahora exige exactamente el acuerdo al que se llegó.
  assert.match(tabsSource, /md:sticky md:top-24/);
  assert.doesNotMatch(tabsSource, /(?<!md:)\bsticky top-/);
  assert.match(tabsSource, /grid-cols-3/);
  assert.match(navbarSource, /activitiesMenuOpen/);
  assert.match(dataSource, /https:\/\/pasajes\.efe\.cl\/turistico\/casa-acosta/);
  assert.match(detailSource, /order-first lg:order-none/);
  assert.match(detailSource, /Array\.from\(\{ length: 6 \}\)/);
});

test("contact page keeps the exact address and submits to Netlify Forms", async () => {
  const [pageSource, formSource, esMessages] = await Promise.all([
    readFile(new URL("../app/[locale]/contacto/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ContactForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../messages/es.json", import.meta.url), "utf8"),
  ]);

  assert.match(pageSource, /font-accent text-xl font-light italic text-primary md:text-2xl/);
  assert.match(pageSource, /Fundo\+El\+Llano\+lote\+6/);
  assert.match(pageSource, /rounded-2xl/);
  // El formulario dejó de derivar a WhatsApp: ahora llega a Netlify Forms, que
  // guarda el envío aunque falle la notificación por correo. El handoff a
  // `window.open` se retiró a propósito y no debe volver sin decisión.
  assert.match(formSource, /submitToNetlifyForms/);
  assert.doesNotMatch(formSource, /window\.open/);
  // El único temporizador que queda devuelve el formulario a reposo después del
  // acuse de recibo. El `doesNotMatch(/setTimeout/)` de antes cuidaba el handoff
  // a WhatsApp, que ya no existe: prohibirlo hoy solo prohibiría esto.
  assert.match(formSource, /setStatus\("success"\)/);
  assert.match(formSource, /window\.setTimeout\(\(\) => setStatus\("idle"\), 6000\)/);
  // La dirección es NAP: este string tiene que ser idéntico al del schema
  // LocalBusiness y al del footer. Si alguien lo edita en un solo lugar, acá se
  // ve.
  assert.match(esMessages, /Fundo El Llano, lote 6, San Vicente de Tagua Tagua, O'Higgins, Chile/);
});

test("contact replaces oversized cards with a two-column visit gallery", async () => {
  const [pageSource, galleryStats] = await Promise.all([
    readFile(new URL("../app/[locale]/contacto/page.tsx", import.meta.url), "utf8"),
    Promise.all(
      ["plato-cena", "cena", "asado", "letrero"].map(async (name) => {
        const path = new URL(`../public/images/contacto/${name}.webp`, import.meta.url);
        const [metadata, fileStat] = await Promise.all([sharp(fileURLToPath(path)).metadata(), stat(fileURLToPath(path))]);
        return { metadata, fileStat };
      }),
    ),
  ]);

  assert.match(pageSource, /grid-cols-2/);
  assert.match(pageSource, /images\/contacto\/plato-cena\.webp/);
  assert.match(pageSource, /images\/contacto\/letrero\.webp/);
  assert.doesNotMatch(pageSource, /min-h-\[236px\]/);
  for (const { metadata, fileStat } of galleryStats) {
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 1500);
    assert.equal(metadata.format, "webp");
    assert.ok(fileStat.size < 700_000);
  }
});

test("home keeps the LCP image lightweight and does not preload below-the-fold photos", async () => {
  const [homeSource, stackedPhotosSource] = await Promise.all([
    readFile(new URL("../app/[locale]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/StackedPhotos.tsx", import.meta.url), "utf8"),
  ]);

  // El hero dejó de ser un next/image único: son dos encuadres en <picture>
  // (3:2 para desktop, 9:16 para pantallas verticales) porque hace art
  // direction, no solo escalado. Lo que el test cuida sigue siendo lo mismo —
  // que el LCP baje una sola foto y del tamaño correcto— así que ahora exige
  // los dos srcSet y la prioridad explícita, en vez del nombre de archivo viejo.
  assert.match(homeSource, /const heroSources = \{/);
  assert.match(homeSource, /\/images\/home\/hero-\$\{w\}\.webp \$\{w\}w/);
  assert.match(homeSource, /\/images\/home\/hero-movil-\$\{w\}\.webp \$\{w\}w/);
  assert.match(homeSource, /fetchPriority="high"/);
  assert.doesNotMatch(stackedPhotosSource, /priority=\{i === 0\}/);
});

test("featured homepage lines communicate their French oak ageing", async () => {
  const [homeSource, spanishMessages] = await Promise.all([
    readFile(new URL("../app/[locale]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../messages/es.json", import.meta.url), "utf8"),
  ]);

  assert.match(homeSource, /detailLabels\.crianza/);
  assert.match(spanishMessages, /"estilo": "Reservas con carácter"/);
  assert.match(spanishMessages, /"crianza": "Barricas de roble francés"/);
  assert.match(spanishMessages, /"lajau": \{[\s\S]*?"crianza": "Barricas de roble francés"/);
  assert.match(spanishMessages, /"estacion-francia": \{[\s\S]*?"crianza": "Barricas de roble francés"/);
  assert.doesNotMatch(spanishMessages, /"estilo": "Frutal y accesible"/);
});

test("accessibility fixes preserve usable carousel controls and valid dialog semantics", async () => {
  const [carouselSource, drawerSource, footerSource, activitiesSource] = await Promise.all([
    readFile(new URL("../components/FeaturedLinesCarousel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/CartDrawer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/Footer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/HomeActivitiesShowcase.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(carouselSource, /h-11 w-11/);
  assert.doesNotMatch(drawerSource, /<aside[\s\S]*?role="dialog"/);
  assert.doesNotMatch(footerSource, /<h4/);
  assert.match(activitiesSource, /\{labels\.more\} \{card\.name\}/);
});
