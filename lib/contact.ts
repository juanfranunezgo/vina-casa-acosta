/**
 * Datos de contacto reales de Viña Casa Acosta.
 * Centralizar acá evita que el número viva como string suelto en varios componentes.
 */

export const CONTACT_PHONE_DISPLAY = "+56 9 6674 0633";

/** Formato para wa.me/ y tel:: sin "+", sin espacios. */
export const CONTACT_PHONE_E164 = "56966740633";

export const CONTACT_WHATSAPP_URL = `https://wa.me/${CONTACT_PHONE_E164}`;
export const CONTACT_TEL_URL = `tel:+${CONTACT_PHONE_E164}`;
