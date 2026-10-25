// Tipos del estado del juego. Son datos puros (sin métodos ni referencias al
// canvas) para poder enviarlos tal cual por la red en la fase 2.
import type { FurniId, Rotation } from './catalog';
import type { Room } from './room';

/** Una baldosa de la sala. */
export interface TilePoint {
  x: number;
  y: number;
}

/**
 * Las 4 direcciones isométricas en las que mira un avatar, como en una brújula
 * dibujada sobre la pantalla:
 *   NE ↗ (y - 1)    SE ↘ (x + 1)    SW ↙ (y + 1)    NW ↖ (x - 1)
 */
export type Direction = 'NE' | 'SE' | 'SW' | 'NW';

/** Colores del avatar, en formato "#rrggbb". */
export interface AvatarLook {
  hair: string;
  skin: string;
  shirt: string;
  pants: string;
}

export interface Avatar {
  id: string;
  name: string;
  /** Baldosa en la que está ahora (lógicamente). El cliente anima el paso entre baldosas. */
  x: number;
  y: number;
  direction: Direction;
  /** Baldosas que le quedan por recorrer (sin incluir la actual). */
  path: TilePoint[];
  look: AvatarLook;
  isBot: boolean;
}

/** Un mueble colocado en la sala. */
export interface FurniItem {
  id: string;
  /** Qué mueble del catálogo es. */
  defId: FurniId;
  /** Baldosa de la esquina con menor x e y que ocupa. */
  x: number;
  y: number;
  rotation: Rotation;
}

/** Todo el estado de una sala. Es lo que en la fase 2 tendrá el servidor. */
export interface GameState {
  room: Room;
  avatars: Record<string, Avatar>;
  furniture: Record<string, FurniItem>;
}
