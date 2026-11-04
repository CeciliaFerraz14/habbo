// =============================================================================
//  PRENDAS
// =============================================================================
//
// Las prendas (sombreros, chaquetas, botas...) se cosen en la tienda de ropa y
// se guardan en el inventario como cualquier mueble, pero no se colocan en la
// sala: se llevan puestas. Cada prenda va en una RANURA del cuerpo (cabeza,
// torso o pies) y tiene un color de GARMENT_COLORS (looks.ts).
//
// Llevar una prenda no la saca del inventario: el aspecto solo dice qué tipo y
// color llevas. Por eso, si te quedas sin ninguna prenda de ese tipo y color
// (la vendes, por ejemplo), dropUnownedOutfit te la quita de encima.
//
// Recetas y valores de cada prenda: en economy.config.ts, como el resto de la
// economía.
// =============================================================================
import { isOwnKey } from './economy.config';
import type { GameState, GarmentInventoryItem, InventoryItem } from './types';

/** Partes del cuerpo donde se lleva una prenda (una prenda por ranura). */
export type GarmentSlot = 'head' | 'torso' | 'feet';

export type GarmentId = 'cowboy_hat' | 'cap' | 'denim_jacket' | 'vest' | 'boots';

/** Una prenda concreta: qué tipo es y de qué color. */
export interface Garment {
  type: GarmentId;
  color: string;
}

/** Lo que lleva puesto un avatar: como mucho una prenda en cada ranura. */
export type Outfit = Partial<Record<GarmentSlot, Garment>>;

/** Prendas que existen, en el orden en que se muestran. */
export const GARMENTS: Record<GarmentId, { name: string; slot: GarmentSlot }> = {
  cowboy_hat: { name: 'Sombrero de cowboy', slot: 'head' },
  cap: { name: 'Gorra', slot: 'head' },
  denim_jacket: { name: 'Chaqueta vaquera', slot: 'torso' },
  vest: { name: 'Chaleco', slot: 'torso' },
  boots: { name: 'Botas', slot: 'feet' },
};

export const GARMENT_IDS = Object.keys(GARMENTS) as GarmentId[];

/** ¿Es un tipo de prenda? (la clave puede venir del cliente: ver isOwnKey). */
export function isGarmentId(id: unknown): id is GarmentId {
  return typeof id === 'string' && isOwnKey(GARMENTS, id);
}

/** ¿Este objeto del inventario es una prenda (y no un mueble)? */
export function isGarmentItem(item: InventoryItem): item is GarmentInventoryItem {
  return 'garment' in item;
}

/** ¿El avatar tiene en su inventario alguna prenda de ese tipo y color? */
export function ownsGarment(state: GameState, avatarId: string, garment: Garment): boolean {
  return (state.inventories[avatarId] ?? []).some(
    (item) => isGarmentItem(item) && item.garment === garment.type && item.color === garment.color,
  );
}

/**
 * Quita del aspecto del avatar las prendas que ya no tiene en el inventario.
 * Si no hay nada que quitar, devuelve el mismo estado (así el servidor sabe
 * que no ha cambiado nada).
 */
export function dropUnownedOutfit(state: GameState, avatarId: string): GameState {
  const avatar = state.avatars[avatarId];
  const outfit = avatar?.look.outfit;
  if (!outfit) return state;

  const kept: Outfit = {};
  let dropped = false;
  for (const [slot, garment] of Object.entries(outfit) as [GarmentSlot, Garment][]) {
    if (ownsGarment(state, avatarId, garment)) kept[slot] = garment;
    else dropped = true;
  }
  if (!dropped) return state;
  const look = { ...avatar.look, outfit: kept };
  return { ...state, avatars: { ...state.avatars, [avatarId]: { ...avatar, look } } };
}
