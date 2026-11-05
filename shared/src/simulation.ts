// Simulación por turnos ("ticks").
//
// Los avatares no se mueven de forma continua en el estado: cada MOVE_TICK_MS
// milisegundos, quien tenga camino avanza WALK_STEPS_PER_TICK baldosas. El
// estado solo guarda posiciones enteras y el cliente se encarga de animar los
// pasos suavemente, baldosa a baldosa.
// En la fase 2 el servidor ejecutará tick() con un setInterval.
//
// El tick simula TODAS las escenas a la vez, no solo la que se ve.
import { MOVE_TICK_MS, WALK_STEPS_PER_TICK } from './constants';
import { economyTick } from './economy';
import { gasStationTick } from './gasStation';
import { createWalkableCheck, getSeatAt } from './furniture';
import { directionTo, planPath, updateDoors, updateSitting } from './movement';
import { npcTick } from './npcs';
import { travelerTick } from './travelers';
import type { Avatar, GameState } from './types';

// Se reexporta aquí por comodidad (antes vivía en este archivo).
export { MOVE_TICK_MS };

/**
 * Avanza la simulación un turno: el contador de ticks, la economía y el
 * movimiento de los avatares.
 */
export function tick(previous: GameState): GameState {
  // 1. La economía (también la de la gasolinera) y las decisiones de los NPC.
  // 2. Las puertas: quien terminó su camino sobre una puerta en el tick
  //    ANTERIOR la cruza ahora. Ese tick de espera deja ver al avatar llegar
  //    hasta el umbral (con la puerta abierta) antes de cambiar de escena.
  // 3. El movimiento de los avatares.
  const state = updateDoors(
    travelerTick(npcTick(gasStationTick(economyTick({ ...previous, tick: previous.tick + 1 })))),
  );
  // Una comprobación de "se puede pisar" por escena, creada solo si hace falta.
  const walkableByScene = new Map<string, (x: number, y: number) => boolean>();
  const walkableIn = (sceneId: string) => {
    let check = walkableByScene.get(sceneId);
    if (!check) {
      check = createWalkableCheck(state, sceneId);
      walkableByScene.set(sceneId, check);
    }
    return check;
  };

  let avatars = state.avatars;
  const update = (avatar: Avatar) => {
    // Copiamos el objeto de avatares solo la primera vez que hace falta.
    if (avatars === state.avatars) avatars = { ...avatars };
    avatars[avatar.id] = avatar;
  };

  for (let step = 0; step < WALK_STEPS_PER_TICK; step++) {
    for (const avatar of Object.values(avatars)) walk(avatar);
  }

  const moved = avatars === state.avatars ? state : { ...state, avatars };
  return updateSitting(moved);

  /** Un paso de un avatar: avanza una baldosa de su camino. */
  function walk(avatar: Avatar): void {
    if (avatar.path.length === 0) return;
    const [next, ...rest] = avatar.path;

    // Alguien puede haber puesto un mueble en mitad del camino después de
    // calcularlo. Si la siguiente baldosa ya no se puede pisar (y no es la
    // silla de destino), recalculamos la ruta hasta el mismo destino.
    const isSeatGoal =
      rest.length === 0 && getSeatAt(state, avatar.sceneId, next.x, next.y) !== undefined;
    if (!walkableIn(avatar.sceneId)(next.x, next.y) && !isSeatGoal) {
      const goal = avatar.path[avatar.path.length - 1];
      update({ ...avatar, path: planPath(state, avatar, goal) ?? [] });
      return;
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
}
