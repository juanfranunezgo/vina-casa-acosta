# Reglas de Frontend — Next.js

Estas son las reglas fijas para todo el desarrollo frontend en este proyecto. Aplican a componentes nuevos y a revisión de código existente.

## 0. Regla maestra

Genera código con calidad de producción. Prioriza mantenibilidad, SEO, accesibilidad (WCAG AA), rendimiento (Core Web Vitals), HTML semántico y una estructura clara antes que escribir la menor cantidad de código posible. No generes "div soup" ni soluciones rápidas que comprometan la calidad.

Pregúntate siempre: *¿Existe una etiqueta HTML que describa el significado de este elemento? Si la respuesta es sí, úsala. Usa `<div>` solo cuando sea estrictamente necesario para el layout.*

## 1. HTML semántico obligatorio

- No usar `<div>` si existe una etiqueta semántica adecuada.
- Usar: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`, `<figure>` + `<figcaption>`.
- `<div>` solo para layout cuando no exista otra etiqueta apropiada.

## 2. Jerarquía correcta de títulos

- Un solo `<h1>` por página.
- Luego `<h2>`, `<h3>`, etc., sin saltar niveles (nunca de `<h1>` a `<h4>`).
- No usar headings solo para cambiar el tamaño del texto; eso se resuelve con CSS.

## 3. Accesibilidad (WCAG AA)

- Todas las imágenes deben tener `alt` descriptivo.
- Los botones deben ser `<button>`, nunca `<div onClick>`.
- Los enlaces deben ser `<a>` (usar `next/link` cuando sea navegación interna).
- Todos los inputs deben tener `<label>` asociado.
- `aria-label` solo cuando sea necesario (no hay texto visible suficiente).
- Contraste de color y navegación por teclado deben funcionar correctamente.

## 4. Componentes

- Un componente = una responsabilidad.
- Como guía, si un componente supera ~200 líneas, evaluar si conviene dividirlo en subcomponentes o extraer lógica a hooks. No es un límite duro, es una señal de alerta.

## 5. Código limpio

- Nada de funciones gigantes.
- Nombres descriptivos (variables, funciones, componentes).
- Evitar código duplicado (DRY).
- Mantener la lógica separada de la UI (hooks, funciones utilitarias).
- TypeScript estricto: nada de `any`, tipar props con interfaces/types explícitos.

## 6. SEO

- Metadata completa por página (title, description).
- Títulos descriptivos y únicos.
- Meta description por página.
- Open Graph configurado.
- URLs limpias y semánticas.
- Breadcrumbs cuando corresponda.
- Schema.org (JSON-LD) para negocios, productos o artículos cuando aplique.

## 7. Next.js

- Server Components por defecto; `"use client"` solo cuando realmente haga falta (interactividad, hooks de estado, APIs del navegador).
- Optimizar imágenes con `next/image`.
- Usar `next/link` para navegación interna.
- Usar `next/font` para fuentes (evita layout shift por carga de fuentes).
- Usar `loading.tsx` y `error.tsx` para estados de carga y error a nivel de ruta.
- Cargar solo el JavaScript necesario en el cliente.

## 8. Rendimiento (Core Web Vitals)

- LCP < 2.5s: optimizar imágenes, priorizar recursos above-the-fold, usar SSR/SSG.
- INP < 200ms: evitar tareas de JS que bloqueen el hilo principal por más de 50ms; minimizar JS enviado al cliente siendo quirúrgico con `use client`.
- CLS < 0.1: siempre especificar dimensiones en imágenes/videos/iframes; reservar espacio para contenido dinámico.
- Lazy loading para contenido fuera de la vista inicial.
- Evitar renders innecesarios (memoización cuando corresponda, no por defecto).

## 9. Tailwind CSS

- Mantener clases ordenadas y consistentes.
- Evitar clases repetidas entre componentes: extraer a componentes reutilizables.
- No escribir clases enormes de 30-40 utilidades en una sola línea; dividir o extraer.

## 10. Responsive

- Mobile first.
- Debe funcionar desde 320px hasta pantallas 4K.
- Usar unidades fluidas en lugar de tamaños fijos cuando sea posible.

## 11. Animaciones

- Suaves, entre 150–300ms.
- No deben afectar el rendimiento (evitar animar propiedades costosas como `width`/`height`; preferir `transform`/`opacity`).
- Respetar `prefers-reduced-motion`.

## 12. Organización del proyecto

```
components/
app/
lib/
hooks/
types/
utils/
```

Cada carpeta con una única responsabilidad clara.

## 13. Checklist antes de dar por terminado un componente

- [ ] HTML semántico
- [ ] Accesibilidad (WCAG AA)
- [ ] SEO (metadata, alt, headings)
- [ ] Responsive (320px → 4K)
- [ ] Rendimiento (Core Web Vitals)
- [ ] Código reutilizable, sin duplicación
- [ ] Tipado correcto con TypeScript
- [ ] Estados de error/carga contemplados

## 14. Revisión de código existente

Si al trabajar en el proyecto detectas código ya hecho que no cumple con estas reglas (div soup, falta de semántica, problemas de accesibilidad, SEO incompleto, problemas de rendimiento, componentes mal estructurados, etc.), **avísame explícitamente**: qué archivo/componente es, qué problema encontraste y qué solución propones. No lo corrijas automáticamente sin avisar, salvo que te lo pida directamente.
