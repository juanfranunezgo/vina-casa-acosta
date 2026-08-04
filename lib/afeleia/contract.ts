/** Version of the public Afeleia catalog contract supported by this site. */
export const CONTRACT_VERSION = 1;

export type AttributeValue = string | number | string[] | Record<string, string>;

export type ApiProduct = {
  slug: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  descripcion_corta: string | null;
  precio: number;
  moneda: string;
  imagenes: string[];
  destacado: boolean;
  categoria: string | null;
  agotado: boolean;
  atributos: Record<string, AttributeValue>;
};

export type ApiCatalog = {
  version: number;
  sitio: string;
  generado_en: string;
  categorias: Array<{ slug: string; nombre: string; orden: number }>;
  productos: ApiProduct[];
};

export function catalogEndpoint(): string | null {
  const base = process.env.NEXT_PUBLIC_AFELEIA_API_URL;
  const sitio = process.env.NEXT_PUBLIC_AFELEIA_SITIO;
  if (!base || !sitio) return null;
  return `${base.replace(/\/+$/, "")}/catalogo-publico?sitio=${encodeURIComponent(sitio)}`;
}

function isValidProduct(value: unknown): value is ApiProduct {
  if (typeof value !== "object" || value === null) return false;
  const product = value as Record<string, unknown>;
  return (
    typeof product.slug === "string" &&
    product.slug !== "" &&
    typeof product.nombre === "string" &&
    product.nombre !== "" &&
    typeof product.precio === "number" &&
    Number.isFinite(product.precio) &&
    Array.isArray(product.imagenes) &&
    typeof product.agotado === "boolean" &&
    typeof product.atributos === "object" &&
    product.atributos !== null
  );
}

export function isValidCatalog(value: unknown): value is ApiCatalog {
  if (typeof value !== "object" || value === null) return false;
  const catalog = value as Record<string, unknown>;
  if (catalog.version !== CONTRACT_VERSION) return false;
  if (!Array.isArray(catalog.productos)) return false;
  return catalog.productos.every(isValidProduct);
}
