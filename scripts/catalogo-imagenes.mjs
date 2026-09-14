/**
 * Las imágenes del snapshot apuntan a `public/` y no al Storage de Afeleia.
 *
 * El snapshot se sirve justo cuando NO hay API, y una URL de Storage la resuelve
 * un host que en ese escenario puede ser el que se cayó — además de que la URL
 * generada en local (`http://127.0.0.1:54321/...`) no existe en producción y
 * `next/image` la rechazaría por no estar en `remotePatterns`. Las fotos de
 * botella ya viajan committeadas en `public/vinos/`, así que el modo degradado
 * usa esas: es lo que garantiza que el fallback se vea igual que el `wines.ts`
 * de siempre.
 *
 * Vive fuera de `catalogo-snapshot.mjs` para poder probarla: el generador consulta
 * la API apenas se importa.
 */

import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Carpeta de `public/` con las fotos de botella. `SNAPSHOT_IMAGE_PREFIX`, en
 * `lib/afeleia/contract.ts`, es la misma con la barra final.
 */
export const LOCAL_IMAGE_DIR = "/vinos";

const EXTENSIONES_LOCALES = [".png", ".webp", ".jpg", ".jpeg"];

/**
 * Reapunta, en el lugar, las `imagenes` de cada producto a su copia en `public/vinos/`.
 *
 * Primero por el nombre del archivo remoto. Si no hay copia con ese nombre, a la del
 * producto (`<slug>.png`): las fotos subidas desde el panel llegan con nombre de marca
 * de tiempo, y la copia committeada se llama como el producto. Esa copia puede ser una
 * foto anterior, pero se dibuja; la URL remota no se dibuja sin API configurada, y ahí
 * el producto quedaba «sin foto» (review de Codex de la etapa E del checkout). La copia
 * del producto se usa una sola vez por producto. Si tampoco la hay, se conserva la URL
 * remota y se avisa.
 *
 * @param {Array<{ slug: string, imagenes: string[] }>} productos
 * @param {{ publicDir: string, existe?: (ruta: string) => boolean }} opciones
 * @returns {{ sinFotoLocal: string[], porSlug: string[], colisiones: string[] }}
 */
export function localizarImagenes(productos, { publicDir, existe = existsSync }) {
  const sinFotoLocal = [];
  const porSlug = [];
  const colisiones = [];
  const duenoDe = new Map();
  const hayCopia = (archivo) => existe(path.join(publicDir, LOCAL_IMAGE_DIR, archivo));

  // El mapeo es por nombre de archivo: dos productos cuyas fotos remotas
  // terminan con el mismo basename quedan apuntando a la misma imagen local
  // y en modo degradado se ven iguales, sin que nada lo diga. Con 13
  // productos no pasa; es un bug de crecimiento.
  const registrar = (rutaPublica, slug) => {
    const previo = duenoDe.get(rutaPublica);
    if (previo !== undefined && previo !== slug) {
      colisiones.push(`${rutaPublica} ← ${previo} y ${slug}`);
    } else {
      duenoDe.set(rutaPublica, slug);
    }
  };

  for (const producto of productos) {
    const porNombre = producto.imagenes.map((url) => {
      const archivo = path.posix.basename(new URL(url, "http://local").pathname);
      return hayCopia(archivo) ? `${LOCAL_IMAGE_DIR}/${archivo}` : null;
    });
    const copiaDelProducto = EXTENSIONES_LOCALES.map((ext) => `${producto.slug}${ext}`).find(
      hayCopia,
    );
    const rutaDelProducto = copiaDelProducto && `${LOCAL_IMAGE_DIR}/${copiaDelProducto}`;
    let copiaDelProductoUsada = porNombre.includes(rutaDelProducto);

    producto.imagenes = producto.imagenes.map((url, indice) => {
      const directa = porNombre[indice];
      if (directa !== null) {
        registrar(directa, producto.slug);
        return directa;
      }
      if (rutaDelProducto && !copiaDelProductoUsada) {
        copiaDelProductoUsada = true;
        registrar(rutaDelProducto, producto.slug);
        porSlug.push(`${producto.slug} → ${rutaDelProducto} (en vez de ${url})`);
        return rutaDelProducto;
      }
      sinFotoLocal.push(`${producto.slug} → ${url}`);
      return url;
    });
  }

  return { sinFotoLocal, porSlug, colisiones };
}
