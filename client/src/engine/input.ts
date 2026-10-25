// Traduce eventos del ratón a coordenadas del canvas y de baldosa.

import type { Camera } from './camera';
import { screenToTile, type Point } from './iso';

/** Posición del ratón: en píxeles del canvas y como baldosa. */
export interface PointerInfo {
  canvas: Point;
  tile: Point;
}

export interface InputHandlers {
  onHover: (pointer: PointerInfo | null) => void;
  onClick: (pointer: PointerInfo) => void;
  onRightClick: (pointer: PointerInfo) => void;
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
  const toPointer = (e: MouseEvent): PointerInfo => {
    const rect = canvas.getBoundingClientRect();
    const canvasX = ((e.clientX - rect.left) * canvas.width) / rect.width;
    const canvasY = ((e.clientY - rect.top) * canvas.height) / rect.height;
    const camera = getCamera();
    return {
      canvas: { x: canvasX, y: canvasY },
      tile: screenToTile(canvasX - camera.originX, canvasY - camera.originY),
    };
  };

  canvas.addEventListener('mousemove', (e) => handlers.onHover(toPointer(e)));
  canvas.addEventListener('mouseleave', () => handlers.onHover(null));
  canvas.addEventListener('click', (e) => handlers.onClick(toPointer(e)));
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // que no salga el menú del navegador
    handlers.onRightClick(toPointer(e));
  });
}
