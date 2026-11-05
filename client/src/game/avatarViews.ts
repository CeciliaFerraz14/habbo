// Posición VISUAL de cada avatar.
//
// En el estado, un avatar salta de baldosa en baldosa: WALK_STEPS_PER_TICK
// baldosas en cada tick. Si lo dibujáramos así, se teletransportaría. Por eso
// el cliente guarda una posición visual con decimales que recorre, una a una,
// las baldosas por las que ha pasado (las saca del camino que tenía), a la
// misma velocidad que la simulación. Esto es "interpolación" y funciona igual
// con el estado que llega por red.

import { MOVE_TICK_MS, WALK_STEPS_PER_TICK, type GameState, type TilePoint } from '@juego/shared';

export interface AvatarView {
  /** Posición visual en baldosas (con decimales). */
  x: number;
  y: number;
  /** ¿Se está moviendo? Sirve para elegir la animación de caminar o de pie. */
  walking: boolean;
  /** Escena en la que estaba la última vez. Si cambia, saltamos sin animar. */
  sceneId: string;
  /** Momento (performance.now) en que llegó a esta escena cruzando una puerta. */
  arrivedAt: number;
}

/** Lo que recordamos de cada avatar para animarlo. */
interface Track {
  view: AvatarView;
  /** Posición lógica y camino que tenía en el último estado visto. */
  last: TilePoint;
  lastPath: TilePoint[];
  /** Baldosas que aún tiene que recorrer la posición visual. */
  queue: TilePoint[];
}

/** Si la posición visual se queda tan atrás (en baldosas por recorrer), saltamos (p. ej. tras un lag). */
const SNAP_QUEUE = 2 * WALK_STEPS_PER_TICK + 2;

export class AvatarViews {
  private readonly tracks = new Map<string, Track>();

  get(id: string): AvatarView | undefined {
    return this.tracks.get(id)?.view;
  }

  /** Avanza las posiciones visuales `dtMs` milisegundos hacia las lógicas. */
  update(state: GameState, dtMs: number): void {
    // Quitamos las vistas de avatares que ya no están en la sala.
    for (const id of this.tracks.keys()) {
      if (!state.avatars[id]) this.tracks.delete(id);
    }

    for (const avatar of Object.values(state.avatars)) {
      let track = this.tracks.get(avatar.id);
      if (!track) {
        const view = { x: avatar.x, y: avatar.y, walking: false, sceneId: avatar.sceneId, arrivedAt: 0 };
        track = { view, last: { x: avatar.x, y: avatar.y }, lastPath: avatar.path, queue: [] };
        this.tracks.set(avatar.id, track);
      }
      const { view } = track;

      // ¿Ha avanzado desde el último estado? Las baldosas por las que ha
      // pasado son las primeras de su camino de entonces, hasta donde está.
      if (avatar.x !== track.last.x || avatar.y !== track.last.y) {
        const reached = track.lastPath.findIndex((t) => t.x === avatar.x && t.y === avatar.y);
        const passed = reached >= 0 ? track.lastPath.slice(0, reached + 1) : [{ x: avatar.x, y: avatar.y }];
        track.queue.push(...passed);
        track.last = { x: avatar.x, y: avatar.y };
      }
      track.lastPath = avatar.path;

      // Al cruzar una puerta no tiene sentido "caminar" desde la otra escena:
      // aparecemos directamente en el sitio nuevo. Igual si vamos muy atrasados.
      if (view.sceneId !== avatar.sceneId || track.queue.length > SNAP_QUEUE) {
        if (view.sceneId !== avatar.sceneId) view.arrivedAt = performance.now();
        view.sceneId = avatar.sceneId;
        view.x = avatar.x;
        view.y = avatar.y;
        track.queue = [];
      } else {
        // Recorremos la cola de baldosas a la velocidad de la simulación.
        let budget = (dtMs * WALK_STEPS_PER_TICK) / MOVE_TICK_MS;
        while (budget > 0 && track.queue.length > 0) {
          const target = track.queue[0];
          const dx = target.x - view.x;
          const dy = target.y - view.y;
          const dist = Math.max(Math.abs(dx), Math.abs(dy));
          if (dist <= budget) {
            view.x = target.x;
            view.y = target.y;
            track.queue.shift();
            budget -= dist;
          } else {
            view.x += clamp(dx, -budget, budget);
            view.y += clamp(dy, -budget, budget);
            budget = 0;
          }
        }
      }

      // Seguimos "caminando" si aún no hemos llegado o si quedan baldosas en
      // el camino; si no, entre dos ticks se vería un fotograma parado.
      view.walking = track.queue.length > 0 || avatar.path.length > 0;
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
