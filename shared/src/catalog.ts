// Catálogo de muebles: qué muebles existen y cómo se comportan.
// Aquí NO hay nada de dibujo: el aspecto está en client/src/sprites/furniture.
import type { Direction } from './types';

export type FurniId = 'sofa' | 'chair' | 'table' | 'lamp' | 'plant' | 'bed' | 'rug' | 'shelf';

/**
 * Rotación de un mueble: 0, 1, 2 o 3 cuartos de vuelta.
 * En la rotación 0 el mueble mira hacia SE (+x): su parte de atrás (respaldo,
 * cabecero...) está en el lado de x pequeña.
 */
export type Rotation = 0 | 1 | 2 | 3;

/** Hacia dónde mira el mueble en cada rotación (y hacia dónde mira quien se sienta). */
export const ROTATION_DIRECTION: Record<Rotation, Direction> = {
  0: 'SE',
  1: 'SW',
  2: 'NW',
  3: 'NE',
};

export interface FurniDef {
  id: FurniId;
  name: string;
  /** Baldosas que ocupa en el eje X con rotación 0. */
  width: number;
  /** Baldosas que ocupa en el eje Y con rotación 0. */
  depth: number;
  /** ¿Se puede sentar un avatar en él? */
  sittable: boolean;
  /** ¿Se puede caminar por encima? (alfombras) */
  walkable: boolean;
}

export const CATALOG: Record<FurniId, FurniDef> = {
  sofa: { id: 'sofa', name: 'Sofá', width: 1, depth: 2, sittable: true, walkable: false },
  chair: { id: 'chair', name: 'Silla', width: 1, depth: 1, sittable: true, walkable: false },
  table: { id: 'table', name: 'Mesa', width: 1, depth: 1, sittable: false, walkable: false },
  lamp: { id: 'lamp', name: 'Lámpara', width: 1, depth: 1, sittable: false, walkable: false },
  plant: { id: 'plant', name: 'Planta', width: 1, depth: 1, sittable: false, walkable: false },
  bed: { id: 'bed', name: 'Cama', width: 2, depth: 1, sittable: false, walkable: false },
  rug: { id: 'rug', name: 'Alfombra', width: 2, depth: 2, sittable: false, walkable: true },
  shelf: { id: 'shelf', name: 'Estantería', width: 1, depth: 2, sittable: false, walkable: false },
};

export const FURNI_IDS = Object.keys(CATALOG) as FurniId[];
