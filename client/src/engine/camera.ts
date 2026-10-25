// La cámara decide dónde cae el origen isométrico (esquina superior de la
// baldosa (0,0)) dentro del canvas. Así tileToScreen() no necesita saber nada
// del tamaño de la ventana.

import type { Scene } from '@juego/shared';
import { TILE_HEIGHT, TILE_WIDTH } from './iso';

export interface Camera {
  /** Posición en el canvas del origen isométrico. Siempre entera para no emborronar píxeles. */
  originX: number;
  originY: number;
}

/**
 * Centra la escena en el canvas.
 *
 * En pantalla, la escena ocupa:
 * - en horizontal, desde la esquina izquierda (0, depth) en x = -depth * W/2
 *   hasta la esquina derecha (width, 0) en x = width * W/2.
 * - en vertical, desde la esquina superior (y = 0) hasta la inferior
 *   (width, depth) en y = (width + depth) * H/2.
 * El centro de esa caja debe coincidir con el centro del canvas.
 * `extraTop` reserva sitio arriba para las paredes.
 */
/**
 * Cámara que sigue a un punto (el jugador), para escenas más grandes que la
 * pantalla como la calle.
 *
 * `focusX`, `focusY` son la posición del jugador relativa al origen
 * isométrico (lo que devuelve tileToScreen). Queremos que quede en el centro
 * del canvas, así que el origen debe estar en (centro del canvas - foco).
 *
 * Después limitamos el origen para no enseñar demasiado vacío más allá de los
 * bordes de la escena (sin esto, al llegar al final de la calle veríamos
 * media pantalla de cielo).
 */
export function followCamera(
  scene: Scene,
  focusX: number,
  focusY: number,
  canvasWidth: number,
  canvasHeight: number,
  extraTop: number,
): Camera {
  // Caja que ocupa la escena en pantalla, relativa al origen isométrico.
  const minX = (-scene.depth * TILE_WIDTH) / 2;
  const maxX = (scene.width * TILE_WIDTH) / 2;
  const minY = -extraTop;
  const maxY = ((scene.width + scene.depth) * TILE_HEIGHT) / 2;
  return {
    originX: clampAxis(canvasWidth / 2 - focusX, canvasWidth, minX, maxX),
    originY: clampAxis(canvasHeight / 2 - focusY, canvasHeight, minY, maxY),
  };
}

/**
 * Limita el origen en un eje. Si la escena cabe entera, la centramos. Si no,
 * el origen no puede dejar hueco: el borde mínimo (origin + min) no puede
 * pasar de 0 y el máximo (origin + max) no puede quedarse antes del final.
 */
function clampAxis(origin: number, size: number, min: number, max: number): number {
  const span = max - min;
  if (span <= size) return Math.round((size - span) / 2 - min);
  return Math.round(Math.min(-min, Math.max(size - max, origin)));
}

export function centerCamera(
  scene: Scene,
  canvasWidth: number,
  canvasHeight: number,
  extraTop: number,
): Camera {
  const sceneCenterX = ((scene.width - scene.depth) * TILE_WIDTH) / 4;
  const sceneCenterY = ((scene.width + scene.depth) * TILE_HEIGHT) / 4 - extraTop / 2;
  return {
    originX: Math.round(canvasWidth / 2 - sceneCenterX),
    originY: Math.round(canvasHeight / 2 - sceneCenterY),
  };
}
