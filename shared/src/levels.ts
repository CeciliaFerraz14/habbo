// =============================================================================
//  NIVELES Y RANGOS
// =============================================================================
//
// Cada jugador acumula experiencia (XP) al hacer cosas que hacen avanzar el
// pueblo: vender a viajeros, fabricar, recoger materiales, entregar encargos,
// trabajar en la gasolinera, abrir negocios y entrar a jugar cada día. Con la
// XP sube de rango (Forastero → Recién llegado → ... → Alcalde) y cada rango
// da una recompensa: dinero y muebles al subir, y ventajas que duran (más
// huecos en el taller y la tienda, más subvención, descuento con Hank).
//
// Los números están en ECONOMY.levels (economy.config.ts).
// =============================================================================

import { addNotice, dayIndex, isNpcId } from './economy';
import { ECONOMY, type RankConfig } from './economy.config';
import type { GameState } from './types';
import { SCENES } from './world.ids';

/** Lo que el juego recuerda del progreso de cada jugador. */
export interface PlayerProgress {
  xp: number;
  /** Último día (ver dayIndex) en que ganó la XP por entrar a jugar. */
  dailyDay: number;
  /** Su nombre, para el ranking del tablón aunque no esté conectado. */
  name: string;
}

const LEVELS = ECONOMY.levels;
export const RANKS: readonly RankConfig[] = LEVELS.ranks;
export const MAX_LEVEL = RANKS.length;

export type XpReason = keyof typeof LEVELS.xp;

/** Nivel (1..MAX_LEVEL) que corresponde a una cantidad de XP. */
export function levelForXp(xp: number): number {
  let level = 1;
  RANKS.forEach((rank, i) => {
    if (xp >= rank.xp) level = i + 1;
  });
  return level;
}

export function progressOf(state: GameState, playerId: string): PlayerProgress {
  return state.progress[playerId] ?? { xp: 0, dailyDay: -1, name: '' };
}

export function levelOf(state: GameState, playerId: string): number {
  return levelForXp(progressOf(state, playerId).xp);
}

/** Rango de un nivel (1..MAX_LEVEL). */
export function rankOf(level: number): RankConfig {
  return RANKS[Math.min(MAX_LEVEL, Math.max(1, level)) - 1];
}

/**
 * Ventajas que tiene un jugador por su rango, sumando las de todos los rangos
 * a los que ha llegado.
 */
export function perksOf(state: GameState, playerId: string) {
  const level = isNpcId(playerId) ? 1 : levelOf(state, playerId);
  const perks = { workshopQueue: 0, storeListings: 0, subsidy: 0, hankDiscount: 0, premiumLook: false };
  for (const rank of RANKS.slice(0, level)) {
    const r = rank.reward;
    if (!r) continue;
    perks.workshopQueue += r.workshopQueue ?? 0;
    perks.storeListings += r.storeListings ?? 0;
    perks.subsidy = Math.max(perks.subsidy, r.subsidy ?? 0);
    perks.hankDiscount = Math.max(perks.hankDiscount, r.hankDiscount ?? 0);
    perks.premiumLook ||= r.premiumLook ?? false;
  }
  return perks;
}

/** Huecos de la cola del taller de un jugador. */
export function workshopQueueSize(state: GameState, playerId: string): number {
  return ECONOMY.workshop.queueSize + perksOf(state, playerId).workshopQueue;
}

/** Productos que caben a la venta en la tienda de un jugador (o de un NPC). */
export function storeListingsMax(state: GameState, ownerId: string): number {
  return ECONOMY.store.maxListings + perksOf(state, ownerId).storeListings;
}

/** Lo que da la subvención diaria a un jugador. */
export function subsidyAmount(state: GameState, playerId: string): number {
  return Math.max(ECONOMY.subsidy.amount, perksOf(state, playerId).subsidy);
}

/** Lo que le cuesta a un jugador algo del mostrador de Hank, con su descuento. */
export function hankPrice(state: GameState, playerId: string, price: number): number {
  return Math.max(1, Math.round(price * (1 - perksOf(state, playerId).hankDiscount)));
}

/**
 * Da XP a un jugador. Si sube de rango (o de varios), recibe las recompensas
 * de cada uno (dinero y muebles), un aviso con lo que ha ganado, y el resto
 * de jugadores conectados se enteran. A los NPC no les da nada.
 */
export function addXp(state: GameState, playerId: string | null, amount: number): GameState {
  if (!playerId || isNpcId(playerId) || amount <= 0) return state;
  const before = progressOf(state, playerId);
  const avatar = state.avatars[playerId];
  if (avatar?.isBot) return state;
  const xp = before.xp + amount;
  const name = avatar?.name ?? before.name;
  let next: GameState = { ...state, progress: { ...state.progress, [playerId]: { ...before, xp, name } } };

  const from = levelForXp(before.xp);
  const to = levelForXp(xp);
  for (let level = from + 1; level <= to; level++) next = rankUp(next, playerId, name, level);
  return next;
}

/** Recompensas y avisos de llegar a un rango. */
function rankUp(state: GameState, playerId: string, name: string, level: number): GameState {
  const rank = rankOf(level);
  const reward = rank.reward;
  let next = state;
  if (reward?.money) {
    next = { ...next, money: { ...next.money, [playerId]: (next.money[playerId] ?? 0) + reward.money } };
  }
  if (reward?.items?.length) {
    const items = reward.items.map((defId, i) => ({ id: `i${next.nextId + i}`, defId }));
    next = {
      ...next,
      inventories: { ...next.inventories, [playerId]: [...(next.inventories[playerId] ?? []), ...items] },
      nextId: next.nextId + items.length,
    };
  }
  if (reward?.mayor && !next.mayors.includes(name)) next = withStatue({ ...next, mayors: [...next.mayors, name] });
  const gift = reward ? ` Recompensa: ${reward.text}${reward.soon ? ' (próximamente)' : ''}.` : '';
  next = addNotice(next, playerId, `¡Subes a nivel ${level}: ${rank.name}!${gift}`);
  for (const other of Object.values(next.avatars)) {
    if (!other.isBot && other.id !== playerId) next = addNotice(next, other.id, `${name} ya es ${rank.name} (nivel ${level}).`);
  }
  return next;
}

/** Dónde está la estatua del alcalde: en el desierto, frente a la calle. */
const STATUE = { id: 'mayor-statue', x: 16, y: 11 };

/**
 * Pone la estatua del alcalde en la calle si ya hay algún alcalde (y no estaba).
 * Se llama al llegar alguien a nivel 10 y al cargar el mundo guardado.
 */
export function withStatue(state: GameState): GameState {
  if (state.mayors.length === 0 || state.furniture[STATUE.id]) return state;
  const statue = {
    id: STATUE.id,
    sceneId: SCENES.street,
    defId: 'mayor_statue' as const,
    x: STATUE.x,
    y: STATUE.y,
    rotation: 1 as const,
  };
  return { ...state, furniture: { ...state.furniture, [statue.id]: statue } };
}

/** XP de una acción (ver ECONOMY.levels.xp). */
export function addXpFor(state: GameState, playerId: string | null, reason: XpReason, times = 1): GameState {
  return addXp(state, playerId, LEVELS.xp[reason] * times);
}

/** XP por lo que un viajero ha pagado a un jugador (1 por cada saleDollarsPerXp). */
export function addSaleXp(state: GameState, ownerId: string | null, paid: number): GameState {
  return addXp(state, ownerId, Math.floor(paid / LEVELS.xp.saleDollarsPerXp));
}

/** XP por entrar a jugar, una vez al día. Se llama al entrar (JOIN). */
export function addDailyXp(state: GameState, playerId: string): GameState {
  const today = dayIndex(state.tick);
  const progress = progressOf(state, playerId);
  if (progress.dailyDay === today) return state;
  const marked = { ...state, progress: { ...state.progress, [playerId]: { ...progress, dailyDay: today } } };
  return addXpFor(marked, playerId, 'daily');
}

/** Los 5 jugadores con más XP (para el tablón de la gasolinera). */
export function topPlayers(state: GameState, count = 5): { name: string; level: number; xp: number }[] {
  return Object.values(state.progress)
    .filter((p) => p.name && p.xp > 0)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, count)
    .map((p) => ({ name: p.name, level: levelForXp(p.xp), xp: p.xp }));
}
