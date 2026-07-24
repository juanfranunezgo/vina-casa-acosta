# Diseño — estructura editorial de Nuestros Vinos

## Objetivo

Corregir la proporción de C2 (`/vinos`) para que cada colección se lea como
una franja editorial horizontal: imagen de ambiente a un lado y, al otro,
identidad de la línea más sus tarjetas de producto. La página debe priorizar
las botellas y no convertir la foto de ambiente en un panel de altura
desproporcionada.

## Contexto y problema actual

`CollectionBand` divide cada colección en dos columnas, pero deja la imagen
con una altura mínima de 560 px y coloca las tarjetas en una columna estrecha.
En líneas con varias botellas (por ejemplo, Lajau), la columna de tarjetas
crece mucho más que la imagen y el resultado pierde el equilibrio buscado.

## Alternativas evaluadas

1. **Franja horizontal con imagen lateral y grilla de tarjetas** — elegida.
   Conserva la intención del croquis, permite comparar botellas y escala según
   el número de vinos de cada línea.
2. Imagen como fondo de toda la colección. Se descarta: reduciría el contraste
   de las tarjetas y mezclaría la función atmosférica de la foto con la de
   navegación del catálogo.
3. Imagen lateral fija de alto completo. Se descarta: repite el problema
   actual, especialmente para líneas con tres o cuatro referencias.

## Diseño aprobado

### Desktop (a partir de `lg`)

- Cada línea será una franja de dos columnas dentro del ancho máximo existente:
  imagen de ambiente de aproximadamente 38 % y contenido de aproximadamente
  62 %.
- La imagen ocupará la altura natural del bloque de contenido y tendrá una
  altura mínima moderada, no una altura fija que fuerce espacio vacío. Usará
  `next/image` con `fill`, encuadre `object-cover` y un contenedor con ratio
  estable para evitar CLS.
- En la columna de contenido, el antetítulo, nombre de la línea y descripción
  quedan alineados arriba. Las tarjetas empiezan inmediatamente debajo.
- Las tarjetas existentes se conservan como unidades navegables. Su contenido
  será: botella, badge si existe, tipo · variedad y nombre. La descripción
  corta deja de ocupar espacio dentro de la tarjeta de catálogo; la ficha del
  vino conserva el detalle completo.
- La grilla se adapta a la colección: hasta tres tarjetas en una fila para
  Ombú; dos columnas para Lajau; y tarjetas de ancho contenido para colecciones
  con una o dos botellas. No se estirarán tarjetas individuales para rellenar
  un espacio artificial.
- Las colecciones alternan foto izquierda / foto derecha, manteniendo el
  fondo alternado existente para crear ritmo vertical.

### Mobile y tablet

- La imagen se apila primero, seguida por identidad y grilla.
- La grilla conserva dos columnas cuando el ancho permite una tarjeta legible;
  en teléfonos angostos pasa a una columna.
- Los márgenes, áreas táctiles, foco visible y reduced motion actuales se
  preservan.

## Arquitectura

- `components/CollectionBand.tsx` seguirá siendo el único responsable de la
  composición de cada línea. Se eliminarán props y estilos que solo soporten
  el layout vertical anterior.
- `components/WineCard.tsx` seguirá siendo responsable de una tarjeta. Su API
  se reducirá si deja de usar la descripción, para no conservar datos o props
  muertos.
- `app/[locale]/vinos/page.tsx` prepara las tarjetas traducidas y conserva las
  secciones C1/C2 y los enlaces a cada detalle. Solo se eliminará del mapeo la
  información que ya no consuma `WineCard`.
- No se modifican los datos de vinos, rutas de detalle, tienda ni el contrato
  de nomenclatura.

## Validación

- Verificar visualmente C2 en escritorio y móvil: ninguna imagen de ambiente
  domina una colección ni deja grandes zonas vacías; todas las tarjetas son
  fácilmente comparables.
- Confirmar navegación de cada tarjeta, orden semántico (`section`, `h2`,
  `ul`/`li`, `article`) y foco por teclado.
- Ejecutar lint y build. Comprobar que no haya imports, props, clases o
  componentes sin uso tras el reemplazo.
