// Traduce eventos del ratón a coordenadas del canvas y de baldosa, y detecta
// arrastres (para mover el mapa) y la rueda (para el zoom).

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
  /** Arrastre con el botón izquierdo: desplazamiento en píxeles del canvas. */
  onPan: (dx: number, dy: number) => void;
  /** Rueda del ratón: +1 acercar, -1 alejar. */
  onZoom: (direction: 1 | -1) => void;
}

/**
 * Píxeles de pantalla que hay que mover el ratón (con el botón pulsado) para
 * que cuente como arrastre y no como clic. Sin este margen, cualquier
 * temblor al hacer clic movería el mapa.
 */
const DRAG_THRESHOLD = 4;

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

  // --- Arrastrar para mover el mapa ---
  let pressedAt: Point | null = null;
  let last: Point = { x: 0, y: 0 };
  let dragging = false;
  /** Tras un arrastre, el navegador lanza un "click" al soltar: hay que ignorarlo. */
  let ignoreNextClick = false;

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    pressedAt = { x: e.clientX, y: e.clientY };
    last = pressedAt;
    dragging = false;
  });

  // Escuchamos en window para seguir el arrastre aunque el ratón salga del canvas.
  window.addEventListener('mousemove', (e) => {
    if (!pressedAt) return;
    if (!dragging && Math.hypot(e.clientX - pressedAt.x, e.clientY - pressedAt.y) > DRAG_THRESHOLD) {
      dragging = true;
      canvas.classList.add('dragging');
    }
    if (dragging) {
      // El desplazamiento del ratón está en píxeles de pantalla; la cámara
      // trabaja en píxeles del canvas (más pequeño), así que convertimos.
      const ratio = canvas.width / canvas.getBoundingClientRect().width;
      handlers.onPan((e.clientX - last.x) * ratio, (e.clientY - last.y) * ratio);
    }
    last = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mouseup', () => {
    if (dragging) ignoreNextClick = true;
    pressedAt = null;
    dragging = false;
    canvas.classList.remove('dragging');
  });

  canvas.addEventListener('mousemove', (e) => handlers.onHover(toPointer(e)));
  canvas.addEventListener('mouseleave', () => handlers.onHover(null));
  canvas.addEventListener('click', (e) => {
    if (ignoreNextClick) {
      ignoreNextClick = false;
      return;
    }
    handlers.onClick(toPointer(e));
  });
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // que no salga el menú del navegador
    handlers.onRightClick(toPointer(e));
  });

  // --- Rueda: zoom ---
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault(); // que no haga scroll en la página
      handlers.onZoom(e.deltaY < 0 ? 1 : -1);
    },
    { passive: false },
  );
}
