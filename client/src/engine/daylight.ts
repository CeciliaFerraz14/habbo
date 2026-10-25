// Ciclo día/noche ligado a la hora real del ordenador.
//
// Es SOLO visual: no forma parte del estado del juego ni afecta a la economía
// (cada jugador ve la hora de su propio reloj). Por eso vive en el cliente y
// no en /shared.
//
// En vez de oscurecer poco a poco con un degradado continuo, usamos 4 fases
// con escalones de oscuridad fijos. En pixel art queda mejor: la paleta sigue
// siendo limitada y cada fase tiene un "ambiente" reconocible.

export type DayPhase = 'day' | 'dusk' | 'night' | 'dawn';

/** Oscuridad de cada fase: 0 = pleno día, 1 = noche cerrada. */
export const PHASE_DARKNESS: Record<DayPhase, number> = {
  day: 0,
  dawn: 0.5,
  dusk: 0.5,
  night: 1,
};

export const PHASE_NAMES: Record<DayPhase, string> = {
  day: 'día',
  dawn: 'amanecer',
  dusk: 'atardecer',
  night: 'noche',
};

/**
 * Fase según la hora (con decimales: 18.5 = 18:30).
 *   06:00-07:59 amanecer · 08:00-18:59 día · 19:00-20:59 atardecer · 21:00-05:59 noche
 */
export function phaseForHour(hour: number): DayPhase {
  if (hour >= 6 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 19) return 'day';
  if (hour >= 19 && hour < 21) return 'dusk';
  return 'night';
}

/** Orden en que la tecla de depuración recorre las fases (null = hora real). */
const OVERRIDE_CYCLE: (DayPhase | null)[] = [null, 'day', 'dusk', 'night', 'dawn'];

/** Reloj del juego: hora real, salvo que se fuerce una fase para probar. */
export class DayClock {
  private override: DayPhase | null = null;

  /** Fase actual. */
  phase(now: Date = new Date()): DayPhase {
    return this.override ?? phaseForHour(now.getHours() + now.getMinutes() / 60);
  }

  /** ¿Se está forzando una fase en vez de usar la hora real? */
  get isForced(): boolean {
    return this.override !== null;
  }

  /** Pasa a la siguiente fase forzada (o vuelve a la hora real). */
  cycleOverride(): DayPhase | null {
    const i = OVERRIDE_CYCLE.indexOf(this.override);
    this.override = OVERRIDE_CYCLE[(i + 1) % OVERRIDE_CYCLE.length];
    return this.override;
  }
}
