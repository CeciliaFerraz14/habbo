// =============================================================================
//  GASOLINERA DE HANK
// =============================================================================
//
// La gasolinera es un interior (el minimarket de Hank) con:
//   - El proveedor de materiales en el mostrador: compra y venta, con una
//     oferta distinta cada día (un material rebajado y otro más caro).
//   - Encargos: Hank pide muebles y los paga por encima de su valor. Son de
//     todo el pueblo: el primero que los entrega se lleva la recompensa.
//   - Turnos en la caja: te quedas dentro un rato y cobras un sueldo (más
//     propinas por cada coche que reposta mientras trabajas).
//   - Rasca y gana, máquina de refrescos y máquina recreativa.
//
// Como el resto de la economía, todo es determinista: el tiempo se mide en
// ticks y el azar sale de la semilla del estado.
// =============================================================================

import { withChatMessage } from './chat';
import { CATALOG, DECOR_IDS, type DecorId } from './catalog';
import { addMaterials, addNotice, secondsToTicks } from './economy';
import { ECONOMY, MATERIAL_IDS, type MaterialId } from './economy.config';
import { createRandom } from './random';
import type { GameState } from './types';
import { SCENES } from './world.ids';

/** Un encargo de Hank. */
export interface HankOrder {
  id: string;
  defId: DecorId;
  quantity: number;
  /** Lo que paga al entregarlo. */
  reward: number;
  /** Tick en el que Hank lo retira si nadie lo ha entregado. */
  expiresAt: number;
}

/** Lo que recuerda la gasolinera de cada jugador. */
export interface GasPlayerState {
  /** Día (ver dayIndex) de los boletos contados en `scratches`. */
  scratchDay: number;
  /** Boletos de rasca y gana comprados ese día. */
  scratches: number;
  /** Tick en el que acaba el turno en curso (0 = no está trabajando). */
  shiftEndsAt: number;
  /** Tick a partir del cual puede empezar otro turno. */
  nextShiftAt: number;
}

/** Mejor partida de la máquina recreativa. */
export interface PinballRecord {
  name: string;
  score: number;
}

const GAS = ECONOMY.gasStation;
const DAY_SECONDS = 24 * 60 * 60;

const EMPTY_PLAYER: GasPlayerState = { scratchDay: -1, scratches: 0, shiftEndsAt: 0, nextShiftAt: 0 };

/** ¿Está el avatar dentro de la gasolinera? Casi todo se hace en el mostrador. */
function isInside(state: GameState, avatarId: string): boolean {
  return state.avatars[avatarId]?.sceneId === SCENES.gas;
}

export function gasPlayer(state: GameState, avatarId: string): GasPlayerState {
  return state.gasPlayers[avatarId] ?? EMPTY_PLAYER;
}

function withGasPlayer(state: GameState, avatarId: string, changes: Partial<GasPlayerState>): GameState {
  const current = gasPlayer(state, avatarId);
  return { ...state, gasPlayers: { ...state.gasPlayers, [avatarId]: { ...current, ...changes } } };
}

function withMoney(state: GameState, avatarId: string, delta: number): GameState {
  return { ...state, money: { ...state.money, [avatarId]: (state.money[avatarId] ?? 0) + delta } };
}

// --- Proveedor y oferta del día ------------------------------------------------

/** Número de día de la simulación (cambia cada 24 h de servidor en marcha). */
export function dayIndex(tick: number): number {
  return Math.floor(tick / secondsToTicks(DAY_SECONDS));
}

/**
 * Oferta del día: un material rebajado y otro más caro. Sale del número de
 * día (no de la semilla del estado), así que es igual para todos y no cambia
 * hasta el día siguiente.
 */
export function dailyDeal(tick: number): { cheap: MaterialId; pricey: MaterialId } {
  const rng = createRandom(dayIndex(tick) * 7919 + 17);
  const cheap = MATERIAL_IDS[Math.floor(rng.random() * MATERIAL_IDS.length)];
  const others = MATERIAL_IDS.filter((m) => m !== cheap);
  const pricey = others[Math.floor(rng.random() * others.length)];
  return { cheap, pricey };
}

/** Lo que cuesta hoy comprar una unidad al proveedor. */
export function buyPrice(tick: number, material: MaterialId): number {
  const { prices, dailyDeal: deal } = ECONOMY.supplier;
  const today = dailyDeal(tick);
  let price: number = prices[material];
  if (material === today.cheap) price *= 1 - deal.discount;
  if (material === today.pricey) price *= 1 + deal.markup;
  return Math.max(1, Math.round(price));
}

/** Lo que paga hoy el proveedor por una unidad. */
export function sellPrice(tick: number, material: MaterialId): number {
  return Math.max(1, Math.floor(buyPrice(tick, material) * ECONOMY.supplier.sellRatio));
}

function isValidQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= ECONOMY.supplier.maxPerPurchase;
}

/** Comprar materiales al proveedor (salida de dinero: lo pagado sale del pueblo). */
export function buyMaterial(
  state: GameState,
  avatarId: string,
  material: MaterialId,
  quantity: number,
): GameState {
  if (!isInside(state, avatarId) || !MATERIAL_IDS.includes(material) || !isValidQuantity(quantity)) {
    return state;
  }
  const cost = buyPrice(state.tick, material) * quantity;
  if ((state.money[avatarId] ?? 0) < cost) return state;
  const mine = state.materials[avatarId] ?? {};
  return {
    ...withMoney(state, avatarId, -cost),
    materials: { ...state.materials, [avatarId]: addMaterials(mine, { [material]: quantity }) },
  };
}

/** Vender materiales al proveedor (entrada de dinero, a precio bajo). */
export function sellMaterial(
  state: GameState,
  avatarId: string,
  material: MaterialId,
  quantity: number,
): GameState {
  if (!isInside(state, avatarId) || !MATERIAL_IDS.includes(material) || !isValidQuantity(quantity)) {
    return state;
  }
  const mine = state.materials[avatarId] ?? {};
  if ((mine[material] ?? 0) < quantity) return state;
  const earned = sellPrice(state.tick, material) * quantity;
  return {
    ...withMoney(state, avatarId, earned),
    materials: { ...state.materials, [avatarId]: addMaterials(mine, { [material]: quantity }, -1) },
  };
}

// --- Encargos -------------------------------------------------------------------

/** Crea un encargo nuevo al azar. */
function newOrder(state: GameState): GameState {
  const rng = createRandom(state.seed);
  const { quantity, rewardMultiplier, expireSeconds } = GAS.orders;
  const defId = DECOR_IDS[Math.floor(rng.random() * DECOR_IDS.length)];
  const value = ECONOMY.baseValue[defId];
  const qty = value >= 100 ? 1 : quantity.min + Math.floor(rng.random() * (quantity.max - quantity.min + 1));
  const order: HankOrder = {
    id: `o${state.nextId}`,
    defId,
    quantity: qty,
    // Redondeado a múltiplos de 5, que queda más "de cartel".
    reward: Math.round((value * qty * rewardMultiplier) / 5) * 5,
    expiresAt: state.tick + secondsToTicks(expireSeconds),
  };
  return { ...state, orders: [...state.orders, order], nextId: state.nextId + 1, seed: rng.seed() };
}

/** Retira los encargos caducados y, si hay hueco y toca, añade uno nuevo. */
function updateOrders(state: GameState): GameState {
  let next = state;
  if (next.orders.some((o) => o.expiresAt <= next.tick)) {
    next = { ...next, orders: next.orders.filter((o) => o.expiresAt > next.tick) };
  }
  if (next.orders.length < GAS.orders.max && next.tick >= next.nextOrderAt) {
    next = newOrder(next);
    next = { ...next, nextOrderAt: next.tick + secondsToTicks(GAS.orders.newEverySeconds) };
  }
  return next;
}

/** Entregar un encargo: se quitan los muebles del inventario y se cobra la recompensa. */
export function deliverOrder(state: GameState, avatarId: string, orderId: string): GameState {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order || !isInside(state, avatarId)) return state;
  const inventory = state.inventories[avatarId] ?? [];
  const matching = inventory.filter((i) => i.defId === order.defId);
  if (matching.length < order.quantity) return state;

  const given = new Set(matching.slice(0, order.quantity).map((i) => i.id));
  const next: GameState = {
    ...withMoney(state, avatarId, order.reward),
    inventories: { ...state.inventories, [avatarId]: inventory.filter((i) => !given.has(i.id)) },
    orders: state.orders.filter((o) => o.id !== orderId),
  };
  const what = `${order.quantity} × ${CATALOG[order.defId].name}`;
  return addNotice(next, avatarId, `Encargo entregado (${what}): +${ECONOMY.currency}${order.reward}`);
}

// --- Turnos en la caja ------------------------------------------------------------

/** Ticks que faltan para poder empezar otro turno (0 si ya se puede). */
export function shiftCooldownLeft(state: GameState, avatarId: string): number {
  return Math.max(0, gasPlayer(state, avatarId).nextShiftAt - state.tick);
}

export function startShift(state: GameState, avatarId: string): GameState {
  const player = gasPlayer(state, avatarId);
  if (!isInside(state, avatarId) || player.shiftEndsAt > 0 || state.tick < player.nextShiftAt) return state;
  return withGasPlayer(state, avatarId, { shiftEndsAt: state.tick + secondsToTicks(GAS.shift.seconds) });
}

/**
 * Turnos en curso: si el jugador sale de la gasolinera (o se desconecta), lo
 * deja a medias y no cobra; si aguanta hasta el final, cobra el sueldo.
 */
function updateShifts(state: GameState): GameState {
  let next = state;
  for (const [id, player] of Object.entries(state.gasPlayers)) {
    if (player.shiftEndsAt === 0) continue;
    if (!isInside(next, id)) {
      next = withGasPlayer(next, id, { shiftEndsAt: 0 });
      next = addNotice(next, id, 'Has dejado el turno a medias: esta vez no cobras.');
    } else if (next.tick >= player.shiftEndsAt) {
      const nextShiftAt = next.tick + secondsToTicks(GAS.shift.cooldownSeconds);
      next = withGasPlayer(withMoney(next, id, GAS.shift.wage), id, { shiftEndsAt: 0, nextShiftAt });
      next = addNotice(next, id, `Fin del turno. Sueldo: +${ECONOMY.currency}${GAS.shift.wage}`);
    }
  }
  return next;
}

/** Un coche ha repostado: propina para quien esté trabajando en la caja. */
export function tipWorkers(state: GameState): GameState {
  let next = state;
  for (const [id, player] of Object.entries(state.gasPlayers)) {
    if (player.shiftEndsAt === 0 || !isInside(next, id)) continue;
    next = withMoney(next, id, GAS.shift.tipPerCar);
    next = addNotice(next, id, `Propina por llenar un depósito: +${ECONOMY.currency}${GAS.shift.tipPerCar}`);
  }
  return next;
}

// --- Rasca y gana ------------------------------------------------------------------

/** Boletos que le quedan hoy a un jugador. */
export function scratchesLeft(state: GameState, avatarId: string): number {
  const player = gasPlayer(state, avatarId);
  const used = player.scratchDay === dayIndex(state.tick) ? player.scratches : 0;
  return Math.max(0, GAS.scratch.maxPerDay - used);
}

export function buyScratch(state: GameState, avatarId: string): GameState {
  const { price, prizes } = GAS.scratch;
  if (!isInside(state, avatarId) || (state.money[avatarId] ?? 0) < price) return state;
  if (scratchesLeft(state, avatarId) === 0) return state;

  const rng = createRandom(state.seed);
  const total = prizes.reduce((sum, p) => sum + p.weight, 0);
  let roll = rng.random() * total;
  const prize = prizes.find((p) => (roll -= p.weight) < 0)?.amount ?? 0;

  const today = dayIndex(state.tick);
  const used = gasPlayer(state, avatarId).scratchDay === today ? gasPlayer(state, avatarId).scratches : 0;
  let next = withMoney({ ...state, seed: rng.seed() }, avatarId, prize - price);
  next = withGasPlayer(next, avatarId, { scratchDay: today, scratches: used + 1 });
  const text =
    prize > 0
      ? `Rasca y gana: ¡premio de ${ECONOMY.currency}${prize}!`
      : 'Rasca y gana: nada esta vez. ¡Otra vez será!';
  return addNotice(next, avatarId, text);
}

// --- Máquinas ------------------------------------------------------------------------

/** Comprar un refresco: el avatar lo lleva en la mano un rato. */
export function buySoda(state: GameState, avatarId: string): GameState {
  const { price, seconds } = GAS.soda;
  const avatar = state.avatars[avatarId];
  if (!avatar || !isInside(state, avatarId) || (state.money[avatarId] ?? 0) < price) return state;
  const holding = { item: 'soda' as const, until: state.tick + secondsToTicks(seconds) };
  const next = withMoney(state, avatarId, -price);
  return { ...next, avatars: { ...next.avatars, [avatarId]: { ...avatar, holding } } };
}

/** Los refrescos se acaban: quitamos lo que lleven en la mano cuando toca. */
function updateHolding(state: GameState): GameState {
  let avatars = state.avatars;
  for (const avatar of Object.values(state.avatars)) {
    if (!avatar.holding || avatar.holding.until > state.tick) continue;
    if (avatars === state.avatars) avatars = { ...avatars };
    const { holding: _done, ...rest } = avatar;
    avatars[avatar.id] = rest;
  }
  return avatars === state.avatars ? state : { ...state, avatars };
}

/**
 * Una partida en la máquina recreativa: el avatar dice su puntuación en el
 * chat y, si bate el récord, Hank lo anuncia.
 */
export function playPinball(state: GameState, avatarId: string): GameState {
  const avatar = state.avatars[avatarId];
  if (!avatar || !isInside(state, avatarId) || (state.money[avatarId] ?? 0) < GAS.pinball.price) return state;
  const rng = createRandom(state.seed);
  // Al cuadrado: las puntuaciones bajas son mucho más frecuentes que las altas.
  const score = Math.round((500 + rng.random() ** 2 * 99_500) / 10) * 10;
  let next = withMoney({ ...state, seed: rng.seed() }, avatarId, -GAS.pinball.price);
  const points = score.toLocaleString('es-ES');
  next = withChatMessage(next, avatarId, `¡${points} puntos en la máquina!`);
  if (score > (state.pinballRecord?.score ?? 0)) {
    next = { ...next, pinballRecord: { name: avatar.name, score } };
    next = withChatMessage(next, HANK_ID, `¡Nuevo récord de ${avatar.name}: ${points} puntos!`);
  }
  return next;
}

// --- Hank -------------------------------------------------------------------------------

/** Id del avatar de Hank, el dueño de la gasolinera (un NPC; su "cerebro" está en npcs.ts). */
export const HANK_ID = 'npc-hank';

// --- Tick -------------------------------------------------------------------------------

/** Un paso de la gasolinera: encargos, turnos y refrescos. Se llama en cada tick. */
export function gasStationTick(state: GameState): GameState {
  return updateHolding(updateShifts(updateOrders(state)));
}
