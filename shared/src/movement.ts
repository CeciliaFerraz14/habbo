// Movimiento de avatares: calcular rutas y decidir quién está sentado.
import { ROTATION_DIRECTION } from './catalog';
import { createWalkableCheck, getSeatAt } from './furniture';
import { findPath } from './pathfinding';
import type { Avatar, GameState, TilePoint } from './types';

/**
 * Calcula la ruta de un avatar hasta `goal`.
 *
 * Las baldosas con muebles están bloqueadas, pero hay una excepción: si el
 * DESTINO es un mueble sentable, dejamos pisarlo (solo como última baldosa).
 * Así el avatar no puede atravesar sillas, pero sí acabar sentado en ellas.
 */
export function planPath(state: GameState, from: TilePoint, goal: TilePoint): TilePoint[] | null {
  const walkable = createWalkableCheck(state);
  const goalIsSeat = getSeatAt(state, goal.x, goal.y) !== undefined;
  return findPath(from, goal, state.room.width, state.room.depth, (x, y) =>
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
    const seat = avatar.path.length === 0 ? getSeatAt(state, avatar.x, avatar.y) : undefined;
    const sitting = seat !== undefined;
    const direction = seat ? ROTATION_DIRECTION[seat.rotation] : avatar.direction;
    if (sitting === avatar.sitting && direction === avatar.direction) continue;

    if (avatars === state.avatars) avatars = { ...avatars };
    avatars[avatar.id] = { ...avatar, sitting, direction } satisfies Avatar;
  }
  return avatars === state.avatars ? state : { ...state, avatars };
}
