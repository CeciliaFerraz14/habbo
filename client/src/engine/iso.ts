// =============================================================================
//  MATEMÁTICAS ISOMÉTRICAS
// =============================================================================
//
// El mundo es una cuadrícula normal (como un tablero de ajedrez visto desde
// arriba), con coordenadas de baldosa (x, y). Para que parezca 3D lo "giramos"
// 45º y lo "aplastamos" a la mitad de alto. Cada baldosa cuadrada se convierte
// en un rombo de TILE_WIDTH x TILE_HEIGHT píxeles (proporción 2:1, la clásica
// del pixel art isométrico).
//
// Vista desde arriba (mundo)        Vista isométrica (pantalla)
//
//     x →                                    (0,0)
//   y ┌───┬───┐                             /    \
//   ↓ │0,0│1,0│                        (0,1)      (1,0)
//     ├───┼───┤                            \      /
//     │0,1│1,1│                             (1,1)
//     └───┴───┘
//
// - Al aumentar x, la baldosa se mueve ABAJO A LA DERECHA en pantalla.
// - Al aumentar y, la baldosa se mueve ABAJO A LA IZQUIERDA en pantalla.
//
// Por eso, moverse +1 en x equivale en pantalla a (+TILE_WIDTH/2, +TILE_HEIGHT/2)
// y moverse +1 en y equivale a (-TILE_WIDTH/2, +TILE_HEIGHT/2).
// Sumando ambas contribuciones salen las fórmulas de tileToScreen().
// =============================================================================

/** Ancho del rombo de una baldosa en píxeles. */
export const TILE_WIDTH = 32;
/** Alto del rombo de una baldosa en píxeles (la mitad del ancho: proporción 2:1). */
export const TILE_HEIGHT = 16;

const HALF_W = TILE_WIDTH / 2; // 16
const HALF_H = TILE_HEIGHT / 2; // 8

export interface Point {
  x: number;
  y: number;
}

/**
 * Convierte coordenadas de baldosa (mundo) a píxeles de pantalla.
 *
 * Devuelve la ESQUINA SUPERIOR del rombo de la baldosa, relativa al origen
 * (la esquina superior de la baldosa (0,0)). Admite decimales: (2.5, 3) es
 * un punto a medio camino entre dos baldosas, útil para animar el movimiento.
 *
 *   screenX = (x - y) * TILE_WIDTH / 2
 *   screenY = (x + y) * TILE_HEIGHT / 2
 */
export function tileToScreen(x: number, y: number): Point {
  return {
    x: (x - y) * HALF_W,
    y: (x + y) * HALF_H,
  };
}

/**
 * Convierte píxeles de pantalla (relativos al origen) a coordenadas de baldosa.
 * Es la operación INVERSA de tileToScreen(): sirve para saber qué baldosa hay
 * bajo el ratón.
 *
 * Partimos de las dos ecuaciones anteriores:
 *   sx = (x - y) * HALF_W   →   sx / HALF_W = x - y      (1)
 *   sy = (x + y) * HALF_H   →   sy / HALF_H = x + y      (2)
 *
 * Es un sistema de 2 ecuaciones con 2 incógnitas:
 *   (1) + (2):  2x = sx/HALF_W + sy/HALF_H   →   x = (sx/HALF_W + sy/HALF_H) / 2
 *   (2) - (1):  2y = sy/HALF_H - sx/HALF_W   →   y = (sy/HALF_H - sx/HALF_W) / 2
 *
 * El resultado tiene decimales (dónde estás DENTRO de la baldosa). Con
 * Math.floor nos quedamos con la baldosa entera que contiene el punto.
 */
export function screenToTile(sx: number, sy: number): Point {
  const x = (sx / HALF_W + sy / HALF_H) / 2;
  const y = (sy / HALF_H - sx / HALF_W) / 2;
  return { x: Math.floor(x), y: Math.floor(y) };
}
