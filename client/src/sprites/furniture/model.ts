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
  /**
   * Marca el respaldo de un asiento. Si el asiento mira hacia el fondo
   * (rotaciones 2 y 3), el respaldo queda entre la cámara y el avatar sentado,
   * así que el renderer lo vuelve a dibujar ENCIMA del avatar.
   */
  backrest?: boolean;
  /**
   * Marca las piezas que emiten luz (neones, bombillas). En el ciclo día/noche
   * se dibujan encima de la oscuridad para que brillen.
   */
  emissive?: boolean;
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
  /** Solo muebles sentables: altura en píxeles del asiento, donde se apoya el avatar. */
  seatHeight?: number;
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

/** Como box(), pero marcada como respaldo. */
export function backrest(...args: Parameters<typeof box>): Box {
  return { ...box(...args), backrest: true };
}

/** Como box(), pero marcada como pieza que da luz. */
export function glow(...args: Parameters<typeof box>): Box {
  return { ...box(...args), emissive: true };
}

/**
 * Un modelo puede ser fijo o depender de la variante del mueble (por ejemplo
 * un local 'closed' con tablones o abierto con su neón encendido).
 */
export type ModelSource = FurniModel | ((variant: string | undefined) => FurniModel);
