/** El popup se cierra por visita: la próxima vez que la persona entre, vuelve a aparecer. */
const CLAVE = "vca:popup-vendimia";

export function popupCerradoEnEstaVisita(): boolean {
  try {
    return sessionStorage.getItem(CLAVE) === "1";
  } catch {
    return false;
  }
}

export function marcarPopupCerrado(): void {
  try {
    sessionStorage.setItem(CLAVE, "1");
  } catch {
    // Sin almacenamiento el popup solo vuelve a aparecer al recargar.
  }
}
