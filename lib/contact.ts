/**
 * Datos de contacto reales de Viña Casa Acosta.
 * Centralizar acá evita que el número viva como string suelto en varios componentes.
 */

export const CONTACT_PHONE_DISPLAY = "+56 9 6674 0633";

/** Formato para wa.me/ y tel:: sin "+", sin espacios. */
export const CONTACT_PHONE_E164 = "56966740633";

export const CONTACT_WHATSAPP_URL = `https://wa.me/${CONTACT_PHONE_E164}`;
export const CONTACT_TEL_URL = `tel:+${CONTACT_PHONE_E164}`;

/** Casilla oficial: recibe los mensajes del formulario de contacto. */
export const CONTACT_EMAIL = "contacto@vinacasaacosta.cl";
export const CONTACT_MAILTO_URL = `mailto:${CONTACT_EMAIL}`;

/** Perfil oficial de Instagram — canal donde se anuncian fechas y eventos. */
export const INSTAGRAM_URL = "https://www.instagram.com/vinacasaacosta/";

/** Página oficial de Facebook de Viña Casa Acosta. */
export const FACEBOOK_URL = "https://www.facebook.com/vinacasaacosta/";
