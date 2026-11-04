// =============================================================================
//  SOLARES: CONSTRUIR Y ALQUILAR COMO CASERO
// =============================================================================
//
// Enfrente de los locales del ayuntamiento hay solares vacíos (PLOT_SITES en
// world.ts). Un jugador paga dinero y materiales para construir en uno un
// local, y pasa a ser su CASERO: no lo usa él, lo alquila a otros jugadores
// con la fianza y el alquiler que él decide.
//
// - Construir crea el Lot (con el casero y sus condiciones) y llama a
//   restorePlot, que pone en la calle el edificio, la puerta y el interior.
// - Alquilar, cobrar el alquiler y perder el local son las mismas funciones de
//   los locales normales (economy.ts): si el local tiene casero, la fianza y
//   el alquiler son los suyos y se le pagan a él menos una comisión.
// - El mantenimiento diario del casero también está en economy.ts, junto al
//   alquiler, porque se cobra en el mismo tick de la economía.
// =============================================================================

import { addMaterials, createLot, hasMaterials, isIntegerBetween, secondsToTicks, type Lot } from './economy';
import { ECONOMY } from './economy.config';
import type { GameState } from './types';
import { isPlotId, plotSite, restorePlot } from './world';
import { SCENES } from './world.ids';

/**
 * Construir en un solar libre. Hay que estar en la calle y tener el dinero y
 * los materiales de ECONOMY.plots.buildCost, que desaparecen de la economía.
 */
export function buildPlot(state: GameState, avatarId: string, lotId: string): GameState {
  const avatar = state.avatars[avatarId];
  const site = plotSite(lotId);
  if (!avatar || avatar.sceneId !== SCENES.street || !site || state.lots[lotId]) return state;

  const cost = ECONOMY.plots.buildCost;
  const money = state.money[avatarId] ?? 0;
  const mine = state.materials[avatarId] ?? {};
  if (money < cost.money || !hasMaterials(mine, cost.materials)) return state;

  const lot: Lot = {
    ...createLot(lotId, site.label),
    landlordId: avatarId,
    landlordName: avatar.name,
    terms: { ...ECONOMY.plots.initialTerms },
    nextUpkeepAt: state.tick + secondsToTicks(ECONOMY.rent.periodSeconds),
  };
  const paid: GameState = {
    ...state,
    money: { ...state.money, [avatarId]: money - cost.money },
    materials: { ...state.materials, [avatarId]: addMaterials(mine, cost.materials, -1) },
    lots: { ...state.lots, [lotId]: lot },
  };
  return restorePlot(paid, lot);
}

/**
 * El casero cambia la fianza y el alquiler de su solar. Solo mientras está
 * libre (no se le cambian las condiciones al inquilino que ya hay) y con
 * enteros dentro de los límites de ECONOMY.plots.
 */
export function setPlotTerms(
  state: GameState,
  avatarId: string,
  lotId: string,
  deposit: number,
  rent: number,
): GameState {
  const lot = isPlotId(lotId) ? state.lots[lotId] : undefined;
  if (!lot || lot.landlordId !== avatarId || lot.ownerId !== null) return state;
  const limits = ECONOMY.plots;
  if (!isIntegerBetween(deposit, limits.deposit.min, limits.deposit.max)) return state;
  if (!isIntegerBetween(rent, limits.rent.min, limits.rent.max)) return state;
  return { ...state, lots: { ...state.lots, [lotId]: { ...lot, terms: { deposit, rent } } } };
}

/**
 * El servidor la llama al cargar el mundo guardado: pone en la calle las piezas
 * de cada solar construido (restorePlot). Un solar guardado SIN casero (filas
 * de antes de que los solares tuvieran dueño) se descarta con sus muebles: el
 * sitio vuelve a estar libre, con su cartel, en vez de quedar bloqueado para
 * siempre sin nadie que pueda alquilarlo.
 */
export function restoreSavedPlots(state: GameState): GameState {
  let next = state;
  for (const lot of Object.values(state.lots)) {
    if (!isPlotId(lot.id)) continue;
    if (lot.landlordId !== null) {
      next = restorePlot(next, lot);
      continue;
    }
    const { [lot.id]: _lot, ...lots } = next.lots;
    const furniture = Object.fromEntries(Object.entries(next.furniture).filter(([, f]) => f.sceneId !== lot.id));
    next = { ...next, lots, furniture };
  }
  return next;
}
