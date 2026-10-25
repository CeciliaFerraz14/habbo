// Formato de los modelos de muebles.
//
// Un mueble se describe como una lista de CAJAS (prismas rectangulares) en el
// espacio de sus baldosas, con el mueble en rotación 0 (mirando a SE, +x).
// Luego bake.ts las proyecta en isométrico y las rasteriza píxel a píxel.
//
// Unidades:
// - x, y: en DIECISEISAVOS de baldosa (0..16 = una baldosa). Así las aristas
//   caen siempre en píxeles enteros, porque media baldosa son 16 px en pantalla.
// - z: altura en píxeles desde el suelo.

import type { Palette } from '../pixelArt';

export interface Box {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
  color: string;
}

/**
 * Dibujo plano (matriz de píxeles) pegado al modelo, por ejemplo las hojas de
 * una planta. Su punto de anclaje (x, y, z) es el centro de su fila inferior.
 */
export interface Decal {
  rows: string[];
  palette: Palette;
  x: number;
  y: number;
  z: number;
}

export interface FurniModel {
  boxes: Box[];
  decals?: Decal[];
}

/** Atajo para crear una caja. x e y en dieciseisavos de baldosa, z en píxeles. */
export function box(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  color: string,
): Box {
  return { x0: x0 / 16, y0: y0 / 16, z0, x1: x1 / 16, y1: y1 / 16, z1, color };
}
