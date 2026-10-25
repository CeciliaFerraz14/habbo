// Lógica de muebles colocados en la sala: qué baldosas ocupan y cuáles bloquean.
import { CATALOG, type FurniId, type Rotation } from './catalog';
import { isInsideRoom } from './room';
import type { FurniItem, GameState } from './types';

/** Rectángulo de baldosas que ocupa un mueble: desde (x, y), `width` x `depth` baldosas. */
export interface Footprint {
  x: number;
  y: number;
  width: number;
  depth: number;
}

/** Lo mínimo para saber dónde está un mueble (sirve también para muebles aún sin colocar). */
export type FurniPlacement = Pick<FurniItem, 'defId' | 'x' | 'y' | 'rotation'>;

/**
 * Baldosas que ocupa un mueble teniendo en cuenta su rotación.
 * Al girar un cuarto de vuelta (rotación 1 o 3), ancho y fondo se intercambian:
 * un sofá de 1x2 pasa a ocupar 2x1.
 */
export function getFootprint(item: FurniPlacement): Footprint {
  const def = CATALOG[item.defId];
  const swapped = item.rotation % 2 === 1;
  return {
    x: item.x,
    y: item.y,
    width: swapped ? def.depth : def.width,
    depth: swapped ? def.width : def.depth,
  };
}

/** ¿La baldosa (x, y) está dentro del rectángulo? */
export function footprintContains(f: Footprint, x: number, y: number): boolean {
  return x >= f.x && y >= f.y && x < f.x + f.width && y < f.y + f.depth;
}

/** ¿Se solapan dos rectángulos? Se solapan si se solapan en X Y TAMBIÉN en Y. */
function footprintsOverlap(a: Footprint, b: Footprint): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.depth && b.y < a.y + a.depth;
}

/** Clave única de una baldosa, para guardarla en un Set. */
export function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Conjunto de baldosas bloqueadas por muebles (las alfombras no bloquean). */
export function getBlockedTiles(state: GameState): Set<string> {
  const blocked = new Set<string>();
  for (const item of Object.values(state.furniture)) {
    if (CATALOG[item.defId].walkable) continue;
    const f = getFootprint(item);
    for (let dy = 0; dy < f.depth; dy++) {
      for (let dx = 0; dx < f.width; dx++) {
        blocked.add(tileKey(f.x + dx, f.y + dy));
      }
    }
  }
  return blocked;
}

/**
 * Crea una función que dice si una baldosa se puede pisar. Calculamos las
 * baldosas bloqueadas UNA vez y no en cada consulta, porque el A* pregunta
 * muchas veces.
 */
export function createWalkableCheck(state: GameState): (x: number, y: number) => boolean {
  const blocked = getBlockedTiles(state);
  return (x, y) => isInsideRoom(state.room, x, y) && !blocked.has(tileKey(x, y));
}

/** Mueble sentable que ocupa la baldosa (x, y), si lo hay. */
export function getSeatAt(state: GameState, x: number, y: number): FurniItem | undefined {
  return Object.values(state.furniture).find(
    (item) => CATALOG[item.defId].sittable && footprintContains(getFootprint(item), x, y),
  );
}

/**
 * ¿Se puede poner un mueble `defId` en (x, y) con esa rotación?
 * - Todas sus baldosas deben estar dentro de la sala.
 * - No puede solaparse con otro mueble de su misma "capa": las alfombras
 *   chocan con alfombras y el resto con el resto (un sofá SÍ puede ir encima
 *   de una alfombra).
 * - Un mueble que bloquea no puede caer encima de un avatar.
 * `ignoreId` es el propio mueble cuando lo estamos moviendo.
 */
export function canPlaceFurni(
  state: GameState,
  defId: FurniId,
  x: number,
  y: number,
  rotation: Rotation,
  ignoreId?: string,
): boolean {
  const def = CATALOG[defId];
  const f = getFootprint({ defId, x, y, rotation });

  if (!isInsideRoom(state.room, f.x, f.y)) return false;
  if (!isInsideRoom(state.room, f.x + f.width - 1, f.y + f.depth - 1)) return false;

  for (const other of Object.values(state.furniture)) {
    if (other.id === ignoreId) continue;
    if (CATALOG[other.defId].walkable !== def.walkable) continue;
    if (footprintsOverlap(f, getFootprint(other))) return false;
  }

  if (!def.walkable) {
    for (const avatar of Object.values(state.avatars)) {
      if (footprintContains(f, avatar.x, avatar.y)) return false;
    }
  }
  return true;
}
