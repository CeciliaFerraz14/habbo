// Simulación por turnos ("ticks").
//
// Los avatares no se mueven de forma continua en el estado: cada MOVE_TICK_MS
// milisegundos, quien tenga camino avanza UNA baldosa. El estado solo guarda
// posiciones enteras y el cliente se encarga de animar el paso suavemente.
// En la fase 2 el servidor ejecutará tick() con un setInterval.
import { createWalkableCheck, getSeatAt } from './furniture';
import { planPath, updateSitting } from './movement';
import type { Avatar, Direction, GameState, TilePoint } from './types';

/** Milisegundos que tarda un avatar en avanzar una baldosa. */
export const MOVE_TICK_MS = 400;

/** Dirección a la que hay que mirar para ir de `from` a una baldosa vecina `to`. */
export function directionTo(from: TilePoint, to: TilePoint): Direction {
  if (to.x > from.x) return 'SE';
  if (to.x < from.x) return 'NW';
  if (to.y > from.y) return 'SW';
  return 'NE';
}

/** Avanza la simulación un turno. Si nada cambia, devuelve el mismo objeto. */
export function tick(state: GameState): GameState {
  const walkable = createWalkableCheck(state);
  let avatars = state.avatars;
  const update = (avatar: Avatar) => {
    // Copiamos el objeto de avatares solo la primera vez que hace falta.
    if (avatars === state.avatars) avatars = { ...avatars };
    avatars[avatar.id] = avatar;
  };

  for (const avatar of Object.values(state.avatars)) {
    if (avatar.path.length === 0) continue;
    const [next, ...rest] = avatar.path;

    // Alguien puede haber puesto un mueble en mitad del camino después de
    // calcularlo. Si la siguiente baldosa ya no se puede pisar (y no es la
    // silla de destino), recalculamos la ruta hasta el mismo destino.
    const isSeatGoal = rest.length === 0 && getSeatAt(state, next.x, next.y) !== undefined;
    if (!walkable(next.x, next.y) && !isSeatGoal) {
      const goal = avatar.path[avatar.path.length - 1];
      update({ ...avatar, path: planPath(state, avatar, goal) ?? [] });
      continue;
    }

    update({
      ...avatar,
      x: next.x,
      y: next.y,
      direction: directionTo(avatar, next),
      path: rest,
      sitting: false,
    });
  }

  const moved = avatars === state.avatars ? state : { ...state, avatars };
  return updateSitting(moved);
}
