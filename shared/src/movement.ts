// Movimiento de avatares: calcular rutas, sentarse y cruzar puertas.
import { ROTATION_DIRECTION } from './catalog';
import { createWalkableCheck, getSeatAt } from './furniture';
import { findPath } from './pathfinding';
import { getDoorAt, type Door } from './scene';
import type { Avatar, Direction, GameState, TilePoint } from './types';

/** Dirección a la que hay que mirar para ir de `from` a una baldosa vecina `to`. */
export function directionTo(from: TilePoint, to: TilePoint): Direction {
  if (to.x > from.x) return 'SE';
  if (to.x < from.x) return 'NW';
  if (to.y > from.y) return 'SW';
  return 'NE';
}

/**
 * Calcula la ruta de un avatar hasta `goal` dentro de su escena.
 *
 * Las baldosas con muebles están bloqueadas, pero hay una excepción: si el
 * DESTINO es un mueble sentable, dejamos pisarlo (solo como última baldosa).
 * Así el avatar no puede atravesar sillas, pero sí acabar sentado en ellas.
 */
export function planPath(state: GameState, avatar: Avatar, goal: TilePoint): TilePoint[] | null {
  const scene = state.scenes[avatar.sceneId];
  if (!scene) return null;
  const walkable = createWalkableCheck(state, scene.id);
  const goalIsSeat = getSeatAt(state, scene.id, goal.x, goal.y) !== undefined;
  return findPath(avatar, goal, scene.width, scene.depth, (x, y) =>
    walkable(x, y) || (goalIsSeat && x === goal.x && y === goal.y),
  );
}

/**
 * Actualiza quién está sentado: un avatar está sentado si ya no tiene camino
 * y está sobre un mueble sentable. Al sentarse mira hacia donde mira el mueble.
 * Se llama tras cada tick y tras cada cambio de muebles (por si quitan la silla
 * de debajo de alguien). Si nada cambia, devuelve el mismo objeto.
 */
export function updateSitting(state: GameState): GameState {
  let avatars = state.avatars;
  for (const avatar of Object.values(state.avatars)) {
    const seat =
      avatar.path.length === 0 ? getSeatAt(state, avatar.sceneId, avatar.x, avatar.y) : undefined;
    const sitting = seat !== undefined;
    const direction = seat ? ROTATION_DIRECTION[seat.rotation] : avatar.direction;
    if (sitting === avatar.sitting && direction === avatar.direction) continue;

    if (avatars === state.avatars) avatars = { ...avatars };
    avatars[avatar.id] = { ...avatar, sitting, direction };
  }
  return avatars === state.avatars ? state : { ...state, avatars };
}

/**
 * ¿Está cerrada esta puerta? Las puertas de los locales están cerradas
 * mientras el local no esté alquilado. (Los alquileres llegan en el paso de
 * negocios; hasta entonces, todo local está cerrado.)
 */
export function isDoorLocked(_state: GameState, door: Door): boolean {
  return door.lotId !== undefined;
}

/**
 * Cruza las puertas: todo avatar que haya TERMINADO su camino encima de una
 * puerta pasa a la escena destino y aparece en el spawn de la puerta enlazada,
 * mirando hacia fuera de ella.
 *
 * Solo cuenta si el camino ha terminado: pasar por encima de una puerta de
 * camino a otro sitio no te cambia de escena.
 */
export function updateDoors(state: GameState): GameState {
  let avatars = state.avatars;
  for (const avatar of Object.values(state.avatars)) {
    if (avatar.path.length > 0) continue;
    const scene = state.scenes[avatar.sceneId];
    const door = scene && getDoorAt(scene, avatar.x, avatar.y);
    if (!door || isDoorLocked(state, door)) continue;

    const target = state.scenes[door.to.sceneId]?.doors.find((d) => d.id === door.to.doorId);
    if (!target) continue;

    if (avatars === state.avatars) avatars = { ...avatars };
    avatars[avatar.id] = {
      ...avatar,
      sceneId: door.to.sceneId,
      x: target.spawn.x,
      y: target.spawn.y,
      direction: directionTo(target, target.spawn),
      path: [],
      sitting: false,
    };
  }
  return avatars === state.avatars ? state : { ...state, avatars };
}
