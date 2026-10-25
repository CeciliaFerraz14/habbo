// Catálogo de muebles: qué muebles existen y cómo se comportan.
// Aquí NO hay nada de dibujo: el aspecto está en client/src/sprites/furniture.
import type { Direction } from './types';

/** Muebles que los jugadores pueden tener, colocar y vender. */
export type DecorId = 'sofa' | 'chair' | 'table' | 'lamp' | 'plant' | 'bed' | 'rug' | 'shelf';

/**
 * Estructuras FIJAS del escenario (edificios, farolas...). Se dibujan, ordenan
 * y bloquean el paso exactamente igual que los muebles, pero nadie puede
 * moverlas, recogerlas ni comprarlas.
 */
export type StructureId =
  | 'shop'
  | 'trailer'
  | 'gas_station'
  | 'street_lamp'
  | 'saguaro'
  | 'welcome_sign';

export type FurniId = DecorId | StructureId;

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
  /** Estructura fija del escenario: no se puede mover, recoger ni comprar. */
  fixed?: true;
}

/** Atajo para definir estructuras fijas (no sentables ni pisables). */
function structure(id: StructureId, name: string, width: number, depth: number): FurniDef {
  return { id, name, width, depth, sittable: false, walkable: false, fixed: true };
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

  // Estructuras de la calle. Como todo mueble, en rotación 0 miran a +x; en la
  // calle se colocan con rotación 1 para que su fachada mire a la carretera (+y).
  shop: structure('shop', 'Local', 4, 4),
  trailer: structure('trailer', 'Caravana', 3, 5),
  gas_station: structure('gas_station', 'Gasolinera', 4, 5),
  street_lamp: structure('street_lamp', 'Farola', 1, 1),
  saguaro: structure('saguaro', 'Cactus', 1, 1),
  welcome_sign: structure('welcome_sign', 'Cartel de bienvenida', 1, 2),
};

/** Muebles que se pueden conseguir (excluye las estructuras fijas). */
export const FURNI_IDS = (Object.keys(CATALOG) as FurniId[]).filter((id) => !CATALOG[id].fixed);
