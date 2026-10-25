// Datos de una sala, independientes de cómo se dibujen.
import { ROOM_DEPTH, ROOM_WIDTH } from './constants';

export interface Room {
  id: string;
  name: string;
  /** Número de baldosas en el eje X. */
  width: number;
  /** Número de baldosas en el eje Y. */
  depth: number;
}

export function createDefaultRoom(): Room {
  return { id: 'lobby', name: 'Vestíbulo', width: ROOM_WIDTH, depth: ROOM_DEPTH };
}

/** ¿La baldosa (x, y) está dentro de la sala? */
export function isInsideRoom(room: Room, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < room.width && y < room.depth;
}
