// Simulación por turnos ("ticks").
//
// Los avatares no se mueven de forma continua en el estado: cada MOVE_TICK_MS
// milisegundos, quien tenga camino avanza UNA baldosa. El estado solo guarda
// posiciones enteras y el cliente se encarga de animar el paso suavemente.
// En la fase 2 el servidor ejecutará tick() con un setInterval.
import type { Direction, GameState, TilePoint } from './types';

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
  let avatars = state.avatars;

  for (const avatar of Object.values(state.avatars)) {
    if (avatar.path.length === 0) continue;
    const [next, ...rest] = avatar.path;
    // Copiamos el objeto de avatares solo la primera vez que hace falta.
    if (avatars === state.avatars) avatars = { ...avatars };
    avatars[avatar.id] = {
      ...avatar,
      x: next.x,
      y: next.y,
      direction: directionTo(avatar, next),
      path: rest,
    };
  }

  return avatars === state.avatars ? state : { ...state, avatars };
}
