// =============================================================================
//  PATHFINDING A* (A estrella)
// =============================================================================
//
// Objetivo: encontrar el camino más corto entre dos baldosas esquivando las
// que están bloqueadas. Nos movemos en 4 direcciones (sin diagonales), así que
// cada paso cuesta 1.
//
// La idea de A*: vamos explorando baldosas empezando por las más PROMETEDORAS.
// Para cada baldosa n calculamos:
//
//   g(n) = coste REAL desde el inicio hasta n (pasos ya dados).
//   h(n) = coste ESTIMADO desde n hasta el destino (heurística).
//   f(n) = g(n) + h(n) = estimación del coste total pasando por n.
//
// Siempre expandimos la baldosa con menor f. Como heurística usamos la
// distancia Manhattan |dx| + |dy|: es exactamente lo que costaría llegar si no
// hubiera obstáculos, y NUNCA sobreestima el coste real. Esa propiedad
// ("heurística admisible") garantiza que A* encuentra el camino más corto.
//
// Comparado con una búsqueda en anchura (BFS), A* explora muchas menos
// baldosas porque prioriza las que van "hacia" el destino.
//
// Estructuras:
// - openSet: baldosas descubiertas pendientes de expandir ("la frontera").
// - closed: baldosas ya expandidas; su g es definitiva.
// - cameFrom: para cada baldosa, desde cuál llegamos. Al llegar al destino,
//   lo seguimos hacia atrás para reconstruir el camino.
// =============================================================================

import type { TilePoint } from './types';

/** Los 4 vecinos de una baldosa: derecha, izquierda, abajo, arriba (en el mundo). */
const NEIGHBORS: readonly TilePoint[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

function manhattan(a: TilePoint, b: TilePoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Busca el camino más corto de `start` a `goal`.
 *
 * @param isWalkable indica si se puede pisar una baldosa (dentro de la sala y sin obstáculos).
 * @returns las baldosas a recorrer SIN incluir `start` e incluyendo `goal`,
 *          [] si ya estamos en el destino, o null si no hay camino posible.
 */
export function findPath(
  start: TilePoint,
  goal: TilePoint,
  width: number,
  depth: number,
  isWalkable: (x: number, y: number) => boolean,
): TilePoint[] | null {
  if (start.x === goal.x && start.y === goal.y) return [];
  if (!isWalkable(goal.x, goal.y)) return null;

  // Identificamos cada baldosa con un único número (su índice en un array
  // plano). Es más rápido y sencillo que usar objetos {x, y} como claves.
  const key = (x: number, y: number) => y * width + x;

  const g = new Map<number, number>([[key(start.x, start.y), 0]]);
  const cameFrom = new Map<number, number>();
  const closed = new Set<number>();
  const openSet: { x: number; y: number; f: number; h: number }[] = [
    { ...start, f: manhattan(start, goal), h: manhattan(start, goal) },
  ];

  while (openSet.length > 0) {
    // 1. Sacamos la baldosa con menor f. Si hay empate, la de menor h (la que
    //    parece más cerca del destino), que suele dar caminos más naturales.
    //    Recorrer la lista entera es O(n), suficiente para salas pequeñas; con
    //    mapas grandes se usaría una cola de prioridad (montículo binario).
    let best = 0;
    for (let i = 1; i < openSet.length; i++) {
      const a = openSet[i];
      const b = openSet[best];
      if (a.f < b.f || (a.f === b.f && a.h < b.h)) best = i;
    }
    const current = openSet.splice(best, 1)[0];
    const currentKey = key(current.x, current.y);

    // Una misma baldosa puede estar varias veces en openSet (si encontramos un
    // camino mejor hacia ella). Si ya la expandimos, ignoramos la copia vieja.
    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    // 2. ¿Hemos llegado? Reconstruimos el camino siguiendo cameFrom hacia atrás.
    if (current.x === goal.x && current.y === goal.y) {
      const path: TilePoint[] = [];
      let k: number | undefined = currentKey;
      while (k !== undefined && k !== key(start.x, start.y)) {
        path.push({ x: k % width, y: Math.floor(k / width) });
        k = cameFrom.get(k);
      }
      return path.reverse();
    }

    // 3. Revisamos los vecinos.
    const currentG = g.get(currentKey)!;
    for (const d of NEIGHBORS) {
      const nx = current.x + d.x;
      const ny = current.y + d.y;
      if (nx < 0 || ny < 0 || nx >= width || ny >= depth) continue;
      if (!isWalkable(nx, ny)) continue;

      const nKey = key(nx, ny);
      if (closed.has(nKey)) continue;

      // Coste de llegar al vecino pasando por la baldosa actual.
      const tentativeG = currentG + 1;
      // Si ya conocíamos un camino igual o mejor hasta él, no hacemos nada.
      if (tentativeG >= (g.get(nKey) ?? Infinity)) continue;

      g.set(nKey, tentativeG);
      cameFrom.set(nKey, currentKey);
      const h = manhattan({ x: nx, y: ny }, goal);
      openSet.push({ x: nx, y: ny, f: tentativeG + h, h });
    }
  }

  // La frontera se vació sin llegar al destino: no hay camino.
  return null;
}
