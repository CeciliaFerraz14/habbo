// Tipos del estado del juego. Son datos puros (sin métodos ni referencias al
// canvas) para poder enviarlos tal cual por la red en la fase 2.
import type { FurniId, Rotation } from './catalog';
import type { Scene } from './scene';

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
  /** Escena en la que está. */
  sceneId: string;
  /** Baldosa en la que está ahora (lógicamente). El cliente anima el paso entre baldosas. */
  x: number;
  y: number;
  direction: Direction;
  /** Baldosas que le quedan por recorrer (sin incluir la actual). */
  path: TilePoint[];
  look: AvatarLook;
  isBot: boolean;
  /** ¿Está sentado? Se calcula solo: al terminar de caminar sobre un mueble sentable. */
  sitting: boolean;
}

/** Un mensaje del chat de la sala. */
export interface ChatMessage {
  id: string;
  /** Escena donde se dijo: solo lo oyen quienes están en ella. */
  sceneId: string;
  avatarId: string;
  /** Guardamos el nombre por si el avatar se va de la sala y queda en el historial. */
  name: string;
  text: string;
}

/** Un mueble guardado en el inventario (todavía sin colocar). */
export interface InventoryItem {
  id: string;
  defId: FurniId;
}

/** Un mueble colocado en una escena. */
export interface FurniItem {
  id: string;
  /** Escena en la que está colocado. */
  sceneId: string;
  /** Qué mueble del catálogo es. */
  defId: FurniId;
  /** Baldosa de la esquina con menor x e y que ocupa. */
  x: number;
  y: number;
  rotation: Rotation;
  /**
   * Variante visual del mismo mueble, por ejemplo 'closed' u 'open' en un
   * local. La decide la lógica del juego; el cliente solo elige el dibujo.
   */
  variant?: string;
}

/** Todo el estado del mundo. Es lo que en la fase 2 tendrá el servidor. */
export interface GameState {
  /** Todas las escenas (calle, caravana, locales...) por id. */
  scenes: Record<string, Scene>;
  avatars: Record<string, Avatar>;
  furniture: Record<string, FurniItem>;
  /** Inventario de cada usuario (clave: id del avatar). En la fase 2 irá a SQLite. */
  inventories: Record<string, InventoryItem[]>;
  /** Últimos mensajes del chat, del más antiguo al más reciente. */
  messages: ChatMessage[];
  /**
   * Contador para generar ids de muebles nuevos. Lo guardamos en el estado
   * (en vez de usar Math.random) para que el reducer siga siendo puro.
   */
  nextId: number;
}
