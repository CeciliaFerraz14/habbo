// Animación de las puertas: decide qué puertas se ven ABIERTAS en cada momento.
//
// Es solo visual (no forma parte del estado del juego). Una puerta se abre si:
// - alguien está pisando su baldosa,
// - alguien camina hacia ella (su camino termina en la puerta) y ya está cerca,
// - o alguien acaba de aparecer a su lado al cruzarla desde otra escena.
// Cuando deja de cumplirse, sigue abierta un instante (CLOSE_DELAY_MS) para
// que no parpadee.
import { isDoorLocked, type GameState } from '@juego/shared';
import type { AvatarViews } from './avatarViews';

/** Cuánto tarda en cerrarse una puerta después de que nadie la use. */
const CLOSE_DELAY_MS = 350;
/** Tras cruzar una puerta, cuánto se ve abierta la puerta de llegada. */
const ARRIVAL_MS = 600;
/** A qué distancia (en baldosas) empieza a abrirse para quien camina hacia ella. */
const APPROACH_DISTANCE = 1.5;

export class DoorStates {
  /** Hasta cuándo está abierta cada puerta (clave: id de la puerta). */
  private readonly openUntil = new Map<string, number>();

  /** Recalcula las puertas de la escena `sceneId`. Devuelve los ids de las abiertas. */
  update(state: GameState, sceneId: string, views: AvatarViews, now: number): Set<string> {
    const scene = state.scenes[sceneId];
    const open = new Set<string>();
    if (!scene) return open;

    for (const door of scene.doors) {
      // Los locales en alquiler están cerrados a cal y canto.
      if (isDoorLocked(state, door)) continue;

      for (const avatar of Object.values(state.avatars)) {
        if (avatar.sceneId !== sceneId) continue;
        const view = views.get(avatar.id);
        if (!view) continue;

        const distance = Math.max(Math.abs(view.x - door.x), Math.abs(view.y - door.y));
        const goal = avatar.path.at(-1);
        const headingHere = goal?.x === door.x && goal.y === door.y;
        const arrived =
          now - view.arrivedAt < ARRIVAL_MS && avatar.x === door.spawn.x && avatar.y === door.spawn.y;

        if (distance < 0.6 || (headingHere && distance <= APPROACH_DISTANCE) || arrived) {
          this.openUntil.set(door.id, now + CLOSE_DELAY_MS);
        }
      }
      if ((this.openUntil.get(door.id) ?? 0) > now) open.add(door.id);
    }
    return open;
  }
}
