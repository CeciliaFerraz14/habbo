// Posición VISUAL de cada avatar.
//
// En el estado, un avatar salta de baldosa en baldosa en cada tick. Si lo
// dibujáramos así, se teletransportaría. Por eso el cliente guarda una
// posición visual con decimales que avanza poco a poco hacia la posición
// lógica, a la misma velocidad que los ticks: 1 baldosa cada MOVE_TICK_MS.
// Esto es "interpolación" y funcionará igual cuando el estado llegue por red.

import { MOVE_TICK_MS, type GameState } from '@juego/shared';

export interface AvatarView {
  /** Posición visual en baldosas (con decimales). */
  x: number;
  y: number;
  /** ¿Se está moviendo? Sirve para elegir la animación de caminar o de pie. */
  walking: boolean;
  /** Escena en la que estaba la última vez. Si cambia, saltamos sin animar. */
  sceneId: string;
}

/** Si la posición visual se queda tan atrás, saltamos directamente (p. ej. tras un lag). */
const SNAP_DISTANCE = 2;

export class AvatarViews {
  private readonly views = new Map<string, AvatarView>();

  get(id: string): AvatarView | undefined {
    return this.views.get(id);
  }

  /** Avanza las posiciones visuales `dtMs` milisegundos hacia las lógicas. */
  update(state: GameState, dtMs: number): void {
    // Quitamos las vistas de avatares que ya no están en la sala.
    for (const id of this.views.keys()) {
      if (!state.avatars[id]) this.views.delete(id);
    }

    const step = dtMs / MOVE_TICK_MS; // baldosas que avanzamos en este fotograma
    for (const avatar of Object.values(state.avatars)) {
      let view = this.views.get(avatar.id);
      if (!view) {
        view = { x: avatar.x, y: avatar.y, walking: false, sceneId: avatar.sceneId };
        this.views.set(avatar.id, view);
      }

      const dx = avatar.x - view.x;
      const dy = avatar.y - view.y;
      // Al cruzar una puerta no tiene sentido "caminar" desde la otra escena:
      // aparecemos directamente en el sitio nuevo.
      if (view.sceneId !== avatar.sceneId || Math.abs(dx) + Math.abs(dy) > SNAP_DISTANCE) {
        view.sceneId = avatar.sceneId;
        view.x = avatar.x;
        view.y = avatar.y;
      } else {
        view.x += clamp(dx, -step, step);
        view.y += clamp(dy, -step, step);
      }

      // Seguimos "caminando" si aún no hemos llegado o si quedan baldosas en
      // el camino; si no, entre dos ticks se vería un fotograma parado.
      view.walking = view.x !== avatar.x || view.y !== avatar.y || avatar.path.length > 0;
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
