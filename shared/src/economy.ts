// =============================================================================
//  LÓGICA DE LA ECONOMÍA
// =============================================================================
//
// Todo lo de aquí es DETERMINISTA: con el mismo estado y las mismas acciones
// sale siempre el mismo resultado. Por eso:
// - El tiempo no se mide con Date.now() sino con `state.tick`, un contador que
//   avanza en cada turno de simulación. "Producir cada 20 s" se guarda como
//   "producir cuando tick llegue a X".
// - No se usa Math.random().
// Así, en la fase 2, el servidor puede ejecutar exactamente esta lógica y
// validar lo que hacen los clientes.
//
// Las funciones que reciben una acción devuelven el estado nuevo, o el mismo
// estado si la acción no es válida (no eres el dueño, no tienes dinero...).
// =============================================================================

import { DECOR_IDS, type DecorId, type FurniId, type Rotation } from './catalog';
import {
  ECONOMY,
  MATERIAL_IDS,
  type BusinessType,
  type Materials,
  type MaterialId,
} from './economy.config';
import { MOVE_TICK_MS } from './constants';
import { canPlaceFurni } from './furniture';
import { createRandom } from './random';
import type { FurniItem, GameState, InventoryItem } from './types';

/** Un mueble en la cola del taller. */
export interface CraftJob {
  defId: DecorId;
  /** Tick en el que estará terminado. */
  readyAt: number;
}

/** Un local de la calle. */
export interface Lot {
  /** Mismo id que su escena interior (lot1, lot2...). */
  id: string;
  /** Nombre fijo ("Local 1"). */
  label: string;
  /** Dueño (id de avatar o de NPC), o null si está en alquiler. */
  ownerId: string | null;
  /** Nombre del dueño, para mostrarlo en la tienda. */
  ownerName: string | null;
  business: BusinessType | null;
  /** Chatarrería: materiales producidos pendientes de recoger. */
  storage: Materials;
  /** Chatarrería: tick de la próxima producción. */
  nextProductionAt: number;
  /** Taller: muebles en fabricación (o terminados, si tick >= readyAt). */
  jobs: CraftJob[];
  /** Tienda de un NPC: tick en el que repondrá género. */
  nextRestockAt: number;
}

/** Convierte segundos de la configuración a ticks de simulación. */
export function secondsToTicks(seconds: number): number {
  return Math.round((seconds * 1000) / MOVE_TICK_MS);
}

export function createLot(id: string, label: string): Lot {
  return {
    id,
    label,
    ownerId: null,
    ownerName: null,
    business: null,
    storage: {},
    nextProductionAt: 0,
    jobs: [],
    nextRestockAt: 0,
  };
}

/** ¿Este dueño es un NPC? Los ids de los NPC empiezan por "npc-". */
export function isNpcId(id: string | null): boolean {
  return id?.startsWith('npc-') ?? false;
}

// --- Materiales ---------------------------------------------------------------

/** ¿`have` tiene al menos lo que pide `need`? */
export function hasMaterials(have: Materials, need: Materials): boolean {
  return MATERIAL_IDS.every((m) => (have[m] ?? 0) >= (need[m] ?? 0));
}

/** Suma (o resta, con sign = -1) materiales y devuelve un objeto nuevo. */
export function addMaterials(a: Materials, b: Materials, sign: 1 | -1 = 1): Materials {
  const result: Materials = {};
  for (const m of MATERIAL_IDS) {
    const value = (a[m] ?? 0) + sign * (b[m] ?? 0);
    if (value !== 0) result[m] = value;
  }
  return result;
}

export function totalMaterials(m: Materials): number {
  return MATERIAL_IDS.reduce((sum, id) => sum + (m[id] ?? 0), 0);
}

// --- Locales y puestos de trabajo ---------------------------------------------

/**
 * Puesto de trabajo que aparece dentro del local al abrir cada negocio. Es un
 * mueble fijo: al hacer clic en él se abre la ventana del negocio.
 */
const STATIONS: Partial<Record<BusinessType, { defId: FurniId; x: number; y: number; rotation: Rotation }>> = {
  scrapyard: { defId: 'scrap_pile', x: 3, y: 2, rotation: 0 },
  workshop: { defId: 'workbench', x: 3, y: 2, rotation: 0 },
  store: { defId: 'shop_counter', x: 1, y: 1, rotation: 0 },
};

/**
 * Huecos de exposición de una tienda (local de 8x8). Al poner algo a la venta
 * se coloca en el primer hueco donde quepa. Están separados para dejar
 * pasillos entre los productos.
 */
const DISPLAY_SLOTS = [
  { x: 3, y: 1 }, { x: 5, y: 1 }, { x: 3, y: 3 }, { x: 5, y: 3 },
  { x: 7, y: 1 }, { x: 7, y: 3 }, { x: 5, y: 6 }, { x: 7, y: 6 },
];
/** Los productos se exponen mirando a SW (hacia la cámara). */
const DISPLAY_ROTATION: Rotation = 1;

/** Id del mueble-puesto de un local (para saber a qué local pertenece al hacer clic). */
export const stationId = (lotId: string) => `${lotId}-station`;

/** Si el mueble es el puesto de trabajo de un local, devuelve el id del local. */
export function lotOfStation(itemId: string): string | null {
  return itemId.endsWith('-station') ? itemId.slice(0, -'-station'.length) : null;
}

/**
 * ¿Puede este avatar decorar (colocar, mover, recoger muebles) en esta escena?
 * En su caravana sí, y en los locales de los que es dueño. (En la fase 2 cada
 * jugador tendrá su propia caravana; ahora solo hay una.)
 */
export function canEditScene(state: GameState, avatarId: string, sceneId: string): boolean {
  if (sceneId === 'trailer') return true;
  return state.lots[sceneId]?.ownerId === avatarId;
}

/** ¿El avatar es dueño del local Y está dentro de él? (para gestionar el negocio) */
function isOwnerInside(state: GameState, avatarId: string, lot: Lot | undefined): lot is Lot {
  const avatar = state.avatars[avatarId];
  return !!lot && lot.ownerId === avatarId && avatar?.sceneId === lot.id;
}

// --- Acciones -----------------------------------------------------------------

/**
 * Alquilar un local libre y abrir en él un negocio: se paga la fianza y se
 * abre el negocio.
 */
export function rentLot(
  state: GameState,
  avatarId: string,
  lotId: string,
  business: BusinessType,
): GameState {
  const lot = state.lots[lotId];
  const config = ECONOMY.businesses[business];
  const money = state.money[avatarId] ?? 0;
  const avatar = state.avatars[avatarId];
  if (!lot || !avatar || lot.ownerId !== null || !config || money < config.deposit) return state;

  const paid = { ...state, money: { ...state.money, [avatarId]: money - config.deposit } };
  return openBusiness(paid, lotId, avatarId, avatar.name, business);
}

/**
 * Abre un negocio en un local (sin cobrar nada; rentLot cobra antes de
 * llamarla y las tiendas de los NPC la usan al crear el mundo). El local
 * cambia de nombre, se enciende su neón y aparece su puesto de trabajo.
 */
function openBusiness(
  state: GameState,
  lotId: string,
  ownerId: string,
  ownerName: string,
  business: BusinessType,
): GameState {
  const lot = state.lots[lotId];
  const config = ECONOMY.businesses[business];
  const rented: Lot = {
    ...lot,
    ownerId,
    ownerName,
    business,
    storage: {},
    nextProductionAt: state.tick + secondsToTicks(ECONOMY.scrapyard.productionSeconds),
    jobs: [],
  };

  // El edificio de la calle pasa a mostrarse abierto, con el neón del negocio.
  const buildingId = `${lotId}-building`;
  const furniture = { ...state.furniture };
  const building = furniture[buildingId];
  if (building) furniture[buildingId] = { ...building, variant: `open:${config.neon}` };

  // Puesto de trabajo dentro del local.
  const station = STATIONS[business];
  if (station) {
    const item: FurniItem = { id: stationId(lotId), sceneId: lotId, ...station };
    furniture[item.id] = item;
  }

  // Los negocios de los NPC llevan su nombre en el cartel.
  const scene = state.scenes[lotId];
  const title = isNpcId(ownerId) ? `${config.name} de ${ownerName}` : config.name;
  return {
    ...state,
    lots: { ...state.lots, [lotId]: rented },
    furniture,
    scenes: scene
      ? { ...state.scenes, [lotId]: { ...scene, name: `${title} · ${lot.label}` } }
      : state.scenes,
  };
}

/** Chatarrería: el dueño recoge los materiales acumulados. */
export function collectMaterials(state: GameState, avatarId: string, lotId: string): GameState {
  const lot = state.lots[lotId];
  if (!isOwnerInside(state, avatarId, lot) || lot.business !== 'scrapyard') return state;
  if (totalMaterials(lot.storage) === 0) return state;

  const mine = state.materials[avatarId] ?? {};
  return {
    ...state,
    lots: { ...state.lots, [lotId]: { ...lot, storage: {} } },
    materials: { ...state.materials, [avatarId]: addMaterials(mine, lot.storage) },
  };
}

/** Taller: empezar a fabricar un mueble. Los materiales se gastan al empezar. */
export function startCraft(
  state: GameState,
  avatarId: string,
  lotId: string,
  defId: DecorId,
): GameState {
  const lot = state.lots[lotId];
  const recipe = ECONOMY.recipes[defId];
  if (!isOwnerInside(state, avatarId, lot) || lot.business !== 'workshop' || !recipe) return state;
  if (lot.jobs.length >= ECONOMY.workshop.queueSize) return state;

  const mine = state.materials[avatarId] ?? {};
  if (!hasMaterials(mine, recipe.materials)) return state;

  // Los trabajos se hacen uno detrás de otro: el nuevo empieza cuando acabe el
  // último de la cola (o ahora, si la cola está vacía o ya terminó).
  const lastReady = lot.jobs.at(-1)?.readyAt ?? state.tick;
  const start = Math.max(state.tick, lastReady);
  const job: CraftJob = { defId, readyAt: start + secondsToTicks(recipe.seconds) };

  return {
    ...state,
    lots: { ...state.lots, [lotId]: { ...lot, jobs: [...lot.jobs, job] } },
    materials: { ...state.materials, [avatarId]: addMaterials(mine, recipe.materials, -1) },
  };
}

/** Taller: el dueño recoge los muebles terminados; van a su inventario. */
export function collectCrafted(state: GameState, avatarId: string, lotId: string): GameState {
  const lot = state.lots[lotId];
  if (!isOwnerInside(state, avatarId, lot) || lot.business !== 'workshop') return state;

  const done = lot.jobs.filter((j) => j.readyAt <= state.tick);
  if (done.length === 0) return state;

  const items: InventoryItem[] = done.map((job, i) => ({ id: `i${state.nextId + i}`, defId: job.defId }));
  return {
    ...state,
    lots: { ...state.lots, [lotId]: { ...lot, jobs: lot.jobs.filter((j) => j.readyAt > state.tick) } },
    inventories: {
      ...state.inventories,
      [avatarId]: [...(state.inventories[avatarId] ?? []), ...items],
    },
    nextId: state.nextId + items.length,
  };
}

// --- Simulación ---------------------------------------------------------------

/**
 * Lo que hace la economía en cada tick: las chatarrerías producen cuando les
 * toca (sin pasarse del límite del almacén). Los talleres no necesitan hacer
 * nada: un trabajo está terminado cuando tick >= readyAt.
 */
export function economyTick(state: GameState): GameState {
  let lots = state.lots;
  for (const lot of Object.values(state.lots)) {
    if (lot.business !== 'scrapyard' || state.tick < lot.nextProductionAt) continue;

    const storage: Materials = { ...lot.storage };
    for (const [m, qty] of Object.entries(ECONOMY.scrapyard.output) as [MaterialId, number][]) {
      storage[m] = Math.min(ECONOMY.scrapyard.storageCap, (storage[m] ?? 0) + qty);
    }
    if (lots === state.lots) lots = { ...lots };
    lots[lot.id] = {
      ...lot,
      storage,
      nextProductionAt: state.tick + secondsToTicks(ECONOMY.scrapyard.productionSeconds),
    };
  }
  const produced = lots === state.lots ? state : { ...state, lots };
  return restockNpcStores(produced);
}

// --- Tiendas --------------------------------------------------------------------

/** Productos a la venta en una tienda: los muebles con precio de su escena. */
export function getListings(state: GameState, lotId: string): FurniItem[] {
  return Object.values(state.furniture).filter(
    (item) => item.sceneId === lotId && item.price !== undefined,
  );
}

/** ¿Es un precio válido? Entero y dentro de los límites de la configuración. */
function isValidPrice(price: number): boolean {
  const { minPrice, maxPrice } = ECONOMY.store;
  return Number.isInteger(price) && price >= minPrice && price <= maxPrice;
}

/**
 * Coloca un mueble a la venta en el primer hueco de exposición libre.
 * Devuelve null si la tienda está llena o no cabe en ningún hueco.
 */
function placeOnDisplay(
  state: GameState,
  lotId: string,
  id: string,
  defId: DecorId,
  price: number,
): FurniItem | null {
  if (getListings(state, lotId).length >= ECONOMY.store.maxListings) return null;
  const slot = DISPLAY_SLOTS.find((s) =>
    canPlaceFurni(state, lotId, defId, s.x, s.y, DISPLAY_ROTATION),
  );
  if (!slot) return null;
  return { id, sceneId: lotId, defId, ...slot, rotation: DISPLAY_ROTATION, price };
}

/** El dueño pone a la venta un mueble de su inventario. */
export function listItem(
  state: GameState,
  avatarId: string,
  lotId: string,
  itemId: string,
  price: number,
): GameState {
  const lot = state.lots[lotId];
  if (!isOwnerInside(state, avatarId, lot) || lot.business !== 'store' || !isValidPrice(price)) {
    return state;
  }
  const inventory = state.inventories[avatarId] ?? [];
  const item = inventory.find((i) => i.id === itemId);
  if (!item) return state;

  const product = placeOnDisplay(state, lotId, item.id, item.defId as DecorId, price);
  if (!product) return state;
  return {
    ...state,
    furniture: { ...state.furniture, [product.id]: product },
    inventories: { ...state.inventories, [avatarId]: inventory.filter((i) => i.id !== itemId) },
  };
}

/** El dueño cambia el precio de un producto. */
export function setPrice(
  state: GameState,
  avatarId: string,
  itemId: string,
  price: number,
): GameState {
  const item = state.furniture[itemId];
  if (!item || item.price === undefined || !isValidPrice(price)) return state;
  if (!isOwnerInside(state, avatarId, state.lots[item.sceneId])) return state;
  return { ...state, furniture: { ...state.furniture, [itemId]: { ...item, price } } };
}

/**
 * Comprar un producto. El comprador tiene que estar dentro de la tienda, no
 * ser el dueño y tener dinero. El dueño cobra el precio menos la comisión, que
 * desaparece de la economía (es una de las "salidas" de dinero).
 */
export function buyItem(state: GameState, buyerId: string, itemId: string): GameState {
  const item = state.furniture[itemId];
  if (!item || item.price === undefined) return state;
  const price = item.price;
  const lot = state.lots[item.sceneId];
  const buyer = state.avatars[buyerId];
  if (!lot?.ownerId || !buyer || buyer.sceneId !== lot.id || lot.ownerId === buyerId) return state;

  const money = state.money[buyerId] ?? 0;
  if (money < price) return state;

  return sellProduct(state, item, lot.ownerId, (s) => ({
    ...s,
    money: { ...s.money, [buyerId]: money - price },
    inventories: {
      ...s.inventories,
      [buyerId]: [...(s.inventories[buyerId] ?? []), { id: item.id, defId: item.defId }],
    },
  }));
}

/**
 * Parte común de toda venta: quita el producto de la tienda y paga al dueño
 * (precio - comisión). `deliver` añade lo que recibe el comprador.
 */
export function sellProduct(
  state: GameState,
  item: FurniItem,
  ownerId: string,
  deliver: (s: GameState) => GameState,
): GameState {
  const price = item.price ?? 0;
  const commission = Math.round(price * ECONOMY.store.commissionRate);
  const { [item.id]: _sold, ...furniture } = state.furniture;
  const paid: GameState = {
    ...state,
    furniture,
    money: { ...state.money, [ownerId]: (state.money[ownerId] ?? 0) + price - commission },
  };
  return deliver(paid);
}

// --- Tiendas de los NPC -------------------------------------------------------

/**
 * Añade a la tienda de un NPC un producto al azar, con su precio: el valor de
 * referencia por el margen del NPC. El azar viene de la semilla del estado.
 */
function addRandomNpcProduct(state: GameState, lotId: string, markup: number): GameState {
  const rng = createRandom(state.seed);
  const defId = DECOR_IDS[Math.floor(rng.random() * DECOR_IDS.length)];
  const price = Math.round(ECONOMY.baseValue[defId] * markup);
  const next = { ...state, seed: rng.seed() };
  const product = placeOnDisplay(next, lotId, `i${next.nextId}`, defId, price);
  if (!product) return next;
  return {
    ...next,
    furniture: { ...next.furniture, [product.id]: product },
    nextId: next.nextId + 1,
  };
}

/** Abre las tiendas de los NPC con su género inicial (al crear el mundo). */
export function setupNpcStores(state: GameState): GameState {
  let next = state;
  for (const npc of ECONOMY.npcStores) {
    if (!next.lots[npc.lotId]) continue;
    next = openBusiness(next, npc.lotId, npc.ownerId, npc.ownerName, 'store');
    next = { ...next, money: { ...next.money, [npc.ownerId]: 0 } };
    for (let i = 0; i < npc.initialStock; i++) {
      next = addRandomNpcProduct(next, npc.lotId, npc.markup);
    }
    next = withRestockTimer(next, npc.lotId);
  }
  return next;
}

function withRestockTimer(state: GameState, lotId: string): GameState {
  const lot = state.lots[lotId];
  const nextRestockAt = state.tick + secondsToTicks(ECONOMY.npcRestock.seconds);
  return { ...state, lots: { ...state.lots, [lotId]: { ...lot, nextRestockAt } } };
}

/** Cada cierto tiempo, las tiendas de los NPC reponen un producto si les falta género. */
function restockNpcStores(state: GameState): GameState {
  let next = state;
  for (const npc of ECONOMY.npcStores) {
    const lot = next.lots[npc.lotId];
    if (!lot || lot.ownerId !== npc.ownerId || next.tick < lot.nextRestockAt) continue;
    if (getListings(next, npc.lotId).length < ECONOMY.npcRestock.targetStock) {
      next = addRandomNpcProduct(next, npc.lotId, npc.markup);
    }
    next = withRestockTimer(next, npc.lotId);
  }
  return next;
}
