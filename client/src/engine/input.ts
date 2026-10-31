// Traduce eventos del ratón y del dedo a coordenadas del canvas y de baldosa, y
// detecta arrastres (para mover el mapa), la rueda y el pellizco (para el zoom).
//
// Se usan "pointer events", que unifican ratón y pantalla táctil: arrastrar con
// el dedo mueve el mapa igual que arrastrar con el ratón.

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
  /** Rueda del ratón o pellizco: +1 acercar, -1 alejar. */
  onZoom: (direction: 1 | -1) => void;
}

/**
 * Píxeles de pantalla que hay que mover el ratón (con el botón pulsado) para
 * que cuente como arrastre y no como clic. Sin este margen, cualquier
 * temblor al hacer clic movería el mapa. Con el dedo, más margen: al tocar
 * la pantalla siempre se mueve un poco.
 */
const DRAG_THRESHOLD = { mouse: 4, touch: 10 };
/** Cuánto hay que abrir (o cerrar) los dedos para subir (o bajar) un nivel de zoom. */
const PINCH_STEP = 1.3;

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

  // --- Arrastrar para mover el mapa y pellizcar para el zoom ---
  /** Punteros pulsados ahora mismo (un ratón, o uno o dos dedos), con su última posición. */
  const pointers = new Map<number, Point>();
  let pressedAt: Point | null = null;
  let last: Point = { x: 0, y: 0 };
  let dragging = false;
  /** Distancia entre los dos dedos en el último cambio de zoom (null si no hay pellizco). */
  let pinchFrom: number | null = null;
  /** Tras un arrastre, el navegador lanza un "click" al soltar: hay que ignorarlo. */
  let ignoreNextClick = false;

  const fingerDistance = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // Captura: seguimos recibiendo el movimiento aunque salga del canvas. Falla
    // si el puntero ya se ha soltado; entonces no hace falta.
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // nada que capturar
    }
    if (pointers.size === 1) {
      pressedAt = { x: e.clientX, y: e.clientY };
      last = pressedAt;
      dragging = false;
    } else if (pointers.size === 2) {
      // Segundo dedo: empieza un pellizco (y ya no será un toque).
      pinchFrom = fingerDistance();
      dragging = true;
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size >= 2 && pinchFrom !== null) {
      const distance = fingerDistance();
      if (distance / pinchFrom > PINCH_STEP) handlers.onZoom(1);
      else if (pinchFrom / distance > PINCH_STEP) handlers.onZoom(-1);
      else return;
      pinchFrom = distance;
      return;
    }
    if (!pressedAt) return;
    const threshold = e.pointerType === 'touch' ? DRAG_THRESHOLD.touch : DRAG_THRESHOLD.mouse;
    if (!dragging && Math.hypot(e.clientX - pressedAt.x, e.clientY - pressedAt.y) > threshold) {
      dragging = true;
      canvas.classList.add('dragging');
    }
    if (dragging) {
      // El desplazamiento está en píxeles de pantalla; la cámara trabaja en
      // píxeles del canvas (más pequeño), así que convertimos.
      const ratio = canvas.width / canvas.getBoundingClientRect().width;
      handlers.onPan((e.clientX - last.x) * ratio, (e.clientY - last.y) * ratio);
    }
    last = { x: e.clientX, y: e.clientY };
  });

  const release = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return;
    if (dragging) ignoreNextClick = true;
    pinchFrom = null;
    if (pointers.size === 1) {
      // Queda un dedo tras un pellizco: sigue arrastrando desde donde está,
      // sin saltos.
      last = [...pointers.values()][0];
      pressedAt = last;
      return;
    }
    if (pointers.size > 0) return;
    pressedAt = null;
    dragging = false;
    canvas.classList.remove('dragging');
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // El "hover" solo tiene sentido con ratón: con el dedo no hay nada encima.
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') handlers.onHover(toPointer(e));
  });
  canvas.addEventListener('pointerleave', () => handlers.onHover(null));
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
