// =============================================================================
//  VECINOS QUE VENDEN EXCLUSIVOS
// =============================================================================
//
// Algunos vecinos (ECONOMY.vendors) venden muebles exclusivos: no se fabrican
// en el taller, no se venden en las tiendas y Hank no los pide. Se compran en
// persona, tocando al vecino estando cerca de él; mientras un jugador está a
// su lado, el vecino se queda quieto atendiéndole (ver npcs.ts).
// =============================================================================

import { withChatMessage } from './chat';
import { CATALOG, type VendorItemId } from './catalog';
import { addNotice } from './economy';
import { ECONOMY, type Vendor } from './economy.config';
import type { Avatar, GameState } from './types';

/** Hasta cuántas baldosas de distancia se le puede comprar a un vecino. */
export const VENDOR_REACH = 2;

/** Lo que vende un vecino (o undefined si no vende nada). */
export function vendorOf(npcId: string): Vendor | undefined {
  return ECONOMY.vendors[npcId];
}

/** ¿Está el jugador lo bastante cerca del vecino para comprarle? */
export function isNearVendor(state: GameState, avatarId: string, npcId: string): boolean {
  const a = state.avatars[avatarId];
  const npc = state.avatars[npcId];
  return !!a && !!npc && a.sceneId === npc.sceneId && distance(a, npc) <= VENDOR_REACH;
}

/** ¿Hay algún jugador junto a este vecino? (Entonces se queda quieto.) */
export function hasCustomerNear(state: GameState, npc: Avatar): boolean {
  if (!vendorOf(npc.id)) return false;
  return Object.values(state.avatars).some(
    (a) => !a.isBot && a.sceneId === npc.sceneId && distance(a, npc) <= VENDOR_REACH,
  );
}

/**
 * Comprar un exclusivo a un vecino: hay que estar a su lado y tener el
 * dinero. El dinero desaparece de la economía (no es de ningún jugador).
 */
export function buyFromVendor(
  state: GameState,
  avatarId: string,
  npcId: string,
  defId: VendorItemId,
): GameState {
  const vendor = vendorOf(npcId);
  const offer = vendor?.items.find((i) => i.defId === defId);
  if (!offer || !isNearVendor(state, avatarId, npcId)) return state;
  const money = state.money[avatarId] ?? 0;
  if (money < offer.price) return state;

  const item = { id: `i${state.nextId}`, defId };
  let next: GameState = {
    ...state,
    money: { ...state.money, [avatarId]: money - offer.price },
    inventories: { ...state.inventories, [avatarId]: [...(state.inventories[avatarId] ?? []), item] },
    nextId: state.nextId + 1,
  };
  const name = CATALOG[defId].name;
  const npcName = state.avatars[npcId].name;
  next = addNotice(next, avatarId, `Has comprado ${name} a ${npcName}. Está en tu inventario.`);
  return withChatMessage(next, npcId, '¡Gracias! Que lo disfrutes.');
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
