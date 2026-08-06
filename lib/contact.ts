/**
 * Datos de contacto reales de Viña Casa Acosta.
 * Centralizar acá evita que el número viva como string suelto en varios componentes.
 */

export const CONTACT_PHONE_DISPLAY = "+56 9 6674 0633";

/** Formato para wa.me/ y tel:: sin "+", sin espacios. */
export const CONTACT_PHONE_E164 = "56966740633";

export const CONTACT_WHATSAPP_URL = `https://wa.me/${CONTACT_PHONE_E164}`;
export const CONTACT_TEL_URL = `tel:+${CONTACT_PHONE_E164}`;

/**
 * Casilla oficial de la viña. El dominio del correo (`casaacosta.cl`) no es el
 * mismo que el del sitio, y **queda así por decisión del cliente**: el correo
 * se sigue atendiendo en `casaacosta.cl`. No es un pendiente.
 *
 * Consecuencia para la infraestructura: `casaacosta.cl` no se puede soltar ni
 * dejar sin MX. Su correo vive en Google Workspace, aparte del hosting web, así
 * que redirigir el sitio viejo con un 301 no lo toca — pero mover los NS del
 * dominio sí, porque los MX tendrían que viajar con ellos.
 *
 * Las notificaciones de los formularios se configuran aparte, en Netlify →
 * Notifications → Form submission notifications. Cambiar esta constante NO
 * cambia a dónde llegan los envíos.
 */
export const CONTACT_EMAIL = "contacto@casaacosta.cl";
export const CONTACT_MAILTO_URL = `mailto:${CONTACT_EMAIL}`;

/** Perfil oficial de Instagram — canal donde se anuncian fechas y eventos. */
export const INSTAGRAM_URL = "https://www.instagram.com/vinacasaacosta/";

/** Página oficial de Facebook de Viña Casa Acosta. */
export const FACEBOOK_URL = "https://www.facebook.com/vinacasaacosta/";
