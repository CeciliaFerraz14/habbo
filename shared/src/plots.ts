// =============================================================================
//  LOCALES DEL ENSANCHE EN ALQUILER
// =============================================================================
//
// Quien construye un local en el Ensanche (buildLot, en world.ts) es su dueño
// para siempre. Puede abrir en él su propio negocio o ponerlo en alquiler para
// otros jugadores, con la fianza y el alquiler que decida.
//
// - "En alquiler" es tener `terms`: no hay otra bandera. Solo se puede poner en
//   alquiler un local acabado y vacío, y retirarlo mientras no tenga inquilino.
// - Al ponerlo en alquiler se cobra por adelantado el primer mantenimiento
//   (ECONOMY.plots.upkeep), salvo que el periodo siga pagado. Así retirarlo y
//   volver a ponerlo no sirve para esquivar el pago ni para salir de la
//   suspensión gratis. Con el local ya en alquiler y libre, volver a llamar solo
//   cambia las condiciones, sin cobrar.
// - Retirarlo borra las condiciones y la suspensión, pero conserva
//   `nextUpkeepAt`, para saber hasta cuándo está pagado el periodo.
// - Alquilar, cobrar el alquiler, perder el local y el mantenimiento diario
//   están en economy.ts (rentLot, chargeRent, chargeUpkeep), porque se cobran
//   en el mismo tick de la economía que el resto de alquileres.
// =============================================================================

import { addNotice, isIntegerBetween, isUnderConstruction, secondsToTicks, type Lot } from './economy';
import { ECONOMY } from './economy.config';
import type { GameState } from './types';

/** El local si es de `avatarId`, está acabado y no lo usa nadie (ni él ni un inquilino). */
function vacantBuiltLot(state: GameState, avatarId: string, lotId: string): Lot | null {
  const lot = state.lots[lotId];
  if (!lot || lot.builtBy !== avatarId || lot.ownerId !== null || isUnderConstruction(lot, state.tick)) return null;
  return lot;
}

/**
 * Pone en alquiler un local propio vacío, o cambia sus condiciones si ya lo
 * está. Fianza y alquiler deben ser enteros dentro de los límites de
 * ECONOMY.plots. Ver la cabecera para el cobro del mantenimiento.
 */
export function listLot(
  state: GameState,
  avatarId: string,
  lotId: string,
  deposit: number,
  rent: number,
): GameState {
  const lot = vacantBuiltLot(state, avatarId, lotId);
  const limits = ECONOMY.plots;
  if (!lot || !isIntegerBetween(deposit, limits.deposit.min, limits.deposit.max)) return state;
  if (!isIntegerBetween(rent, limits.rent.min, limits.rent.max)) return state;

  const terms = { deposit, rent };
  if (lot.terms) {
    const saved = { ...state, lots: { ...state.lots, [lotId]: { ...lot, terms } } };
    return addNotice(saved, avatarId, `Condiciones del ${lot.label} guardadas.`);
  }

  const paidUntil = lot.nextUpkeepAt ?? 0;
  const owes = paidUntil <= state.tick;
  const money = state.money[avatarId] ?? 0;
  if (owes && money < limits.upkeep) return state;
  const listed: Lot = {
    ...lot,
    terms,
    nextUpkeepAt: owes ? state.tick + secondsToTicks(ECONOMY.rent.periodSeconds) : paidUntil,
  };
  const charged: GameState = {
    ...state,
    money: { ...state.money, [avatarId]: owes ? money - limits.upkeep : money },
    lots: { ...state.lots, [lotId]: listed },
  };
  return addNotice(charged, avatarId, `El ${lot.label} está en alquiler.`);
}

/** Retira del alquiler un local propio mientras no tenga inquilino. */
export function unlistLot(state: GameState, avatarId: string, lotId: string): GameState {
  const lot = vacantBuiltLot(state, avatarId, lotId);
  if (!lot?.terms) return state;
  const { terms: _terms, suspended: _suspended, ...kept } = lot;
  const unlisted = { ...state, lots: { ...state.lots, [lotId]: kept } };
  return addNotice(unlisted, avatarId, `Has retirado el ${lot.label} del alquiler.`);
}
