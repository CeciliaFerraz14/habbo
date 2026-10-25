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

import type { DecorId, FurniId, Rotation } from './catalog';
import {
  ECONOMY,
  MATERIAL_IDS,
  type BusinessType,
  type Materials,
  type MaterialId,
} from './economy.config';
import { MOVE_TICK_MS } from './constants';
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
  /** Dueño (id de avatar), o null si está en alquiler. */
  ownerId: string | null;
  business: BusinessType | null;
  /** Chatarrería: materiales producidos pendientes de recoger. */
  storage: Materials;
  /** Chatarrería: tick de la próxima producción. */
  nextProductionAt: number;
  /** Taller: muebles en fabricación (o terminados, si tick >= readyAt). */
  jobs: CraftJob[];
}

/** Convierte segundos de la configuración a ticks de simulación. */
export function secondsToTicks(seconds: number): number {
  return Math.round((seconds * 1000) / MOVE_TICK_MS);
}

export function createLot(id: string, label: string): Lot {
  return { id, label, ownerId: null, business: null, storage: {}, nextProductionAt: 0, jobs: [] };
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
};

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
 * Alquilar un local libre y abrir en él un negocio. Se paga la fianza, el
 * local cambia de nombre, se enciende su neón y aparece su puesto de trabajo.
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
  if (!lot || lot.ownerId !== null || !config || money < config.deposit) return state;

  const rented: Lot = {
    ...lot,
    ownerId: avatarId,
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

  const scene = state.scenes[lotId];
  return {
    ...state,
    lots: { ...state.lots, [lotId]: rented },
    money: { ...state.money, [avatarId]: money - config.deposit },
    furniture,
    scenes: scene
      ? { ...state.scenes, [lotId]: { ...scene, name: `${config.name} · ${lot.label}` } }
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
  return lots === state.lots ? state : { ...state, lots };
}
