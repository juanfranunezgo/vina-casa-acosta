import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
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

test("CollectionBand presents two large wines first and expands the rest on demand", async () => {
  const source = await readFile(new URL("../components/CollectionBand.tsx", import.meta.url), "utf8");
  assert.match(source, /^"use client";/);
  assert.match(source, /flip\s*\?\s*"lg:grid-cols-\[minmax\(0,6fr\)_minmax\(0,4fr\)\]"\s*:\s*"lg:grid-cols-\[minmax\(0,4fr\)_minmax\(0,6fr\)\]"/);
  assert.match(source, /wines\.slice\(0, 2\)/);
  assert.match(source, /aria-expanded=\{isExpanded\}/);
  assert.match(source, /variant="link"/);
  assert.match(source, /moreLabel/);
  assert.match(source, /lessLabel/);
  assert.match(source, /justify-center/);
  assert.doesNotMatch(source, /sm:justify-start/);
  assert.match(source, /sm:col-start-2/);
  assert.match(source, /aspect-\[4\/5\].*rounded-\[1\.25rem\]/s);
  assert.doesNotMatch(source, /compact/);
  assert.doesNotMatch(source, /badge/);
  assert.doesNotMatch(source, /lg:min-h-\[680px\]/);
});

test("wine page uses the optimized cork image as a full-screen dark hero", async () => {
  const [pageSource, navbarSource] = await Promise.all([
    readFile(new URL("../app/[locale]/vinos/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/Navbar.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(pageSource, /src="\/images\/vinos\/hero-corchos\.webp"/);
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

test("cart sold-out source guard refreshes stock once per session and fails open", async () => {
  // También es un guard de cableado: sin renderer no demuestra el resultado
  // visual, pero evita volver a persistir un dato de stock que nace obsoleto.
  const [drawerSource, cartSource] = await Promise.all([
    readFile(new URL("../components/CartDrawer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/cart.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(cartSource, /export type CartItem = \{[\s\S]*?\bagotado\b[\s\S]*?\};/);
  assert.match(drawerSource, /if \(!isOpen \|\| soldOutSlugs !== null\) return/);
  assert.match(drawerSource, /catalogRequest \?\?= fetchSoldOutSlugs\(\)/);
  assert.match(drawerSource, /if \(!response\.ok\) return null/);
  assert.match(drawerSource, /if \(!isPublicCatalog\(payload\)\) return null/);
  assert.match(drawerSource, /soldOutSlugs\?\.has\(item\.slug\) \?\? false/);
  assert.match(drawerSource, /\{t\("soldOut"\)\}/);
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
  const files = ["ombu", "lajau", "estacion-francia", "bera", "guidai"];

  for (const file of files) {
    const path = new URL(`../public/images/vinos/coleccion-${file}.webp`, import.meta.url);
    const filePath = fileURLToPath(path);
    const [metadata, fileStat] = await Promise.all([sharp(filePath).metadata(), stat(filePath)]);
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 1500);
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
    readFile(new URL("../app/[locale]/actividades/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../data/activities.ts", import.meta.url), "utf8"),
  ]);

  assert.match(activitiesSource, /fontSize: "clamp\(2\.25rem, 6\.4vw, 4\.5rem\)"/);
  assert.match(activitiesSource, /target="_blank"/);
  assert.doesNotMatch(tabsSource, /\bsticky\b/);
  assert.match(tabsSource, /grid-cols-3/);
  assert.match(navbarSource, /activitiesMenuOpen/);
  assert.match(dataSource, /https:\/\/pasajes\.efe\.cl\/turistico\/casa-acosta/);
  assert.match(detailSource, /order-first lg:order-none/);
  assert.match(detailSource, /Array\.from\(\{ length: 6 \}\)/);
});

test("contact page uses the refined eyebrow, exact location, and WhatsApp form handoff", async () => {
  const [pageSource, formSource, esMessages] = await Promise.all([
    readFile(new URL("../app/[locale]/contacto/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ContactForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../messages/es.json", import.meta.url), "utf8"),
  ]);

  assert.match(pageSource, /font-accent text-xl font-light italic text-primary md:text-2xl/);
  assert.match(pageSource, /Fundo\+El\+Llano\+lote\+6/);
  assert.match(pageSource, /rounded-2xl/);
  assert.match(formSource, /CONTACT_WHATSAPP_URL/);
  assert.match(formSource, /window\.open/);
  assert.doesNotMatch(formSource, /setTimeout/);
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

  assert.match(homeSource, /const heroImage = "\/images\/home\/hero\.webp"/);
  assert.match(homeSource, /quality=\{85\}/);
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
