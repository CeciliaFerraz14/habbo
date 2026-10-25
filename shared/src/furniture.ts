// Lógica de muebles colocados en la sala: qué baldosas ocupan y cuáles bloquean.
import { CATALOG } from './catalog';
import { isInsideRoom } from './room';
import type { FurniItem, GameState } from './types';

/** Rectángulo de baldosas que ocupa un mueble: desde (x, y), `width` x `depth` baldosas. */
export interface Footprint {
  x: number;
  y: number;
  width: number;
  depth: number;
}

/**
 * Baldosas que ocupa un mueble teniendo en cuenta su rotación.
 * Al girar un cuarto de vuelta (rotación 1 o 3), ancho y fondo se intercambian:
 * un sofá de 1x2 pasa a ocupar 2x1.
 */
export function getFootprint(item: FurniItem): Footprint {
  const def = CATALOG[item.defId];
  const swapped = item.rotation % 2 === 1;
  return {
    x: item.x,
    y: item.y,
    width: swapped ? def.depth : def.width,
    depth: swapped ? def.width : def.depth,
  };
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
