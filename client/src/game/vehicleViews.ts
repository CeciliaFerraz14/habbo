// Posición VISUAL de cada coche (igual que AvatarViews para los avatares).
//
// En el estado, los coches avanzan una baldosa por tick. Aquí avanzamos su
// posición visual poco a poco para que circulen suaves en vez de a saltos.
import { MOVE_TICK_MS, type GameState } from '@juego/shared';

export interface VehicleView {
  x: number;
  y: number;
}

/** Si la posición visual se queda tan atrás, saltamos directamente. */
const SNAP_DISTANCE = 3;

export class VehicleViews {
  private readonly views = new Map<string, VehicleView>();

  get(id: string): VehicleView | undefined {
    return this.views.get(id);
  }

  update(state: GameState, dtMs: number): void {
    for (const id of this.views.keys()) {
      if (!state.vehicles[id]) this.views.delete(id);
    }
    const step = dtMs / MOVE_TICK_MS;
    for (const car of Object.values(state.vehicles)) {
      let view = this.views.get(car.id);
      if (!view) {
        view = { x: car.x, y: car.y };
        this.views.set(car.id, view);
      }
      const dx = car.x - view.x;
      view.x = Math.abs(dx) > SNAP_DISTANCE ? car.x : view.x + Math.max(-step, Math.min(step, dx));
      view.y = car.y;
    }
  }
}
