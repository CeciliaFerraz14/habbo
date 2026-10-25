// La cámara decide dónde cae el origen isométrico (esquina superior de la
// baldosa (0,0)) dentro del canvas. Así tileToScreen() no necesita saber nada
// del tamaño de la ventana.

import type { Room } from '@juego/shared';
import { TILE_HEIGHT, TILE_WIDTH } from './iso';

export interface Camera {
  /** Posición en el canvas del origen isométrico. Siempre entera para no emborronar píxeles. */
  originX: number;
  originY: number;
}

/**
 * Centra la sala en el canvas.
 *
 * En pantalla, la sala ocupa:
 * - en horizontal, desde la esquina izquierda (0, depth) en x = -depth * W/2
 *   hasta la esquina derecha (width, 0) en x = width * W/2.
 * - en vertical, desde la esquina superior (y = 0) hasta la inferior
 *   (width, depth) en y = (width + depth) * H/2.
 * El centro de esa caja debe coincidir con el centro del canvas.
 * `extraTop` reserva sitio arriba para las paredes.
 */
export function centerCamera(
  room: Room,
  canvasWidth: number,
  canvasHeight: number,
  extraTop: number,
): Camera {
  const roomCenterX = ((room.width - room.depth) * TILE_WIDTH) / 4;
  const roomCenterY = ((room.width + room.depth) * TILE_HEIGHT) / 4 - extraTop / 2;
  return {
    originX: Math.round(canvasWidth / 2 - roomCenterX),
    originY: Math.round(canvasHeight / 2 - roomCenterY),
  };
}
