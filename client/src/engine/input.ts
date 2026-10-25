// Traduce eventos del ratón a coordenadas de baldosa.

import type { Camera } from './camera';
import { screenToTile, type Point } from './iso';

export interface InputHandlers {
  onHover: (tile: Point | null) => void;
  onClick: (tile: Point) => void;
}

export function attachInput(
  canvas: HTMLCanvasElement,
  getCamera: () => Camera,
  handlers: InputHandlers,
): void {
  /**
   * Pasa de la posición del ratón en la ventana a la baldosa que hay debajo:
   * 1. Ventana → píxeles del canvas: el canvas tiene menos resolución que la
   *    pantalla (está escalado), así que dividimos por la proporción.
   * 2. Canvas → relativo al origen isométrico: restamos la posición de la cámara.
   * 3. Relativo al origen → baldosa: screenToTile().
   */
  const eventToTile = (e: MouseEvent): Point => {
    const rect = canvas.getBoundingClientRect();
    const canvasX = ((e.clientX - rect.left) * canvas.width) / rect.width;
    const canvasY = ((e.clientY - rect.top) * canvas.height) / rect.height;
    const camera = getCamera();
    return screenToTile(canvasX - camera.originX, canvasY - camera.originY);
  };

  canvas.addEventListener('mousemove', (e) => handlers.onHover(eventToTile(e)));
  canvas.addEventListener('mouseleave', () => handlers.onHover(null));
  canvas.addEventListener('click', (e) => handlers.onClick(eventToTile(e)));
}
