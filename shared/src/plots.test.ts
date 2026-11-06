import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAction,
  createInitialState,
  ECONOMY,
  economyTick,
  lotTerms,
  secondsToTicks,
  stationId,
} from './index';
import type { Action, GameState, Lot } from './index';
import { testPlayer } from './testHelpers';

const { plots } = ECONOMY;
const P = secondsToTicks(ECONOMY.rent.periodSeconds);
const earned = (amount: number) => amount - Math.round(amount * plots.commissionRate);

/** lot1 construido por p1 y libre; p1 y p2 con 1000 de dinero. */
function withBuiltLot(overrides: Partial<Lot> = {}): GameState {
  const state = createInitialState();
  return {
    ...state,
    avatars: { p1: testPlayer('street'), p2: { ...testPlayer('street'), id: 'p2', name: 'P2' } },
    money: { p1: 1000, p2: 1000 },
    materials: { p1: { sheet_metal: 99, old_wood: 99, tires: 99 }, p2: { sheet_metal: 99, old_wood: 99, tires: 99 } },
    lots: { ...state.lots, lot1: { ...state.lots.lot1, builtBy: 'p1', readyAt: 0, ...overrides } },
  };
}

const list = (state: GameState, deposit = 100, rent = 40) =>
  applyAction(state, { type: 'LIST_LOT', avatarId: 'p1', lotId: 'lot1', deposit, rent });
const unlist = (state: GameState) => applyAction(state, { type: 'UNLIST_LOT', avatarId: 'p1', lotId: 'lot1' });
const rent = (state: GameState, avatarId = 'p2', business: 'store' | 'diner' = 'store') =>
  applyAction(state, { type: 'RENT_LOT', avatarId, lotId: 'lot1', business });

/** Pone al lot1 una propiedad de más (para fijar fechas en los tests). */
function setLot(state: GameState, changes: Partial<Lot>): GameState {
  return { ...state, lots: { ...state.lots, lot1: { ...state.lots.lot1, ...changes } } };
}

/** lot1 en alquiler y ya alquilado por p2, con el mantenimiento y el alquiler lejos. */
function leased(deposit = 100, price = 40): GameState {
  const state = rent(list(withBuiltLot(), deposit, price));
  return setLot(state, { nextUpkeepAt: state.tick + 10 * P, nextRentAt: state.tick + 10 * P });
}

/** Ejecuta un tick de la economía en el instante dado. */
const at = (state: GameState, tick: number) => economyTick({ ...state, tick });

const noticesFor = (state: GameState, avatarId: string) => state.notices.filter((n) => n.avatarId === avatarId);
const totalMoney = (state: GameState) => Object.values(state.money).reduce((a, b) => a + b, 0);

test('listing charges the first upkeep and stores the terms', () => {
  const state = withBuiltLot();
  const listed = list(state);
  assert.deepEqual(listed.lots.lot1.terms, { deposit: 100, rent: 40 });
  assert.equal(listed.money.p1, 1000 - plots.upkeep);
  assert.equal(listed.lots.lot1.nextUpkeepAt, state.tick + P);
});

test('listing again within the paid period charges nothing', () => {
  const listed = list(withBuiltLot());
  const again = list(unlist(listed));
  assert.equal(again.money.p1, listed.money.p1);
  assert.equal(again.lots.lot1.nextUpkeepAt, listed.lots.lot1.nextUpkeepAt);
});

test('listing after the paid period charges again', () => {
  const listed = list(withBuiltLot());
  const later = { ...unlist(listed), tick: listed.lots.lot1.nextUpkeepAt! };
  const again = list(later);
  assert.equal(again.money.p1, 1000 - 2 * plots.upkeep);
  assert.equal(again.lots.lot1.nextUpkeepAt, later.tick + P);
});

test('listing without money for the upkeep is rejected', () => {
  const state = { ...withBuiltLot(), money: { p1: plots.upkeep - 1 } };
  assert.equal(list(state), state);
});

test('changing terms while listed charges nothing', () => {
  const listed = list(withBuiltLot());
  const changed = list(listed, 50, 20);
  assert.deepEqual(changed.lots.lot1.terms, { deposit: 50, rent: 20 });
  assert.equal(changed.money.p1, listed.money.p1);
  assert.equal(changed.lots.lot1.nextUpkeepAt, listed.lots.lot1.nextUpkeepAt);
});

test('listing rejects bad values and bad lots', () => {
  const state = withBuiltLot();
  const bad = (value: unknown) => value as number;
  const values: [number, number][] = [
    [NaN, 40],
    [100, NaN],
    [1.5, 40],
    [100, 40.5],
    [bad('100'), 40],
    [100, bad('40')],
    [plots.deposit.min - 1, 40],
    [plots.deposit.max + 1, 40],
    [100, plots.rent.min - 1],
    [100, plots.rent.max + 1],
  ];
  for (const [deposit, price] of values) assert.equal(list(state, deposit, price), state, `${deposit}/${price}`);

  const lots: Partial<Lot>[] = [
    { builtBy: 'p2' },
    { builtBy: undefined, readyAt: undefined },
    { readyAt: state.tick + 1 },
    { ownerId: 'p1', ownerName: 'P1', business: 'store' },
    { ownerId: 'p2', ownerName: 'P2', business: 'store' },
  ];
  for (const overrides of lots) {
    const s = withBuiltLot(overrides);
    assert.equal(list(s), s, JSON.stringify(overrides));
  }
});

test('a listed lot cannot be opened by its owner', () => {
  const listed = list(withBuiltLot());
  assert.equal(rent(listed, 'p1'), listed);
});

test('unlisting works only while vacant and clears the suspension', () => {
  const occupied = leased();
  assert.equal(unlist(occupied), occupied);

  const suspended = setLot(list(withBuiltLot()), { suspended: true });
  const unlisted = unlist(suspended);
  assert.ok(!('terms' in unlisted.lots.lot1));
  assert.ok(!('suspended' in unlisted.lots.lot1));
  assert.equal(unlisted.lots.lot1.nextUpkeepAt, suspended.lots.lot1.nextUpkeepAt);
});

test('a tenant pays the deposit to the owner minus commission', () => {
  const listed = list(withBuiltLot());
  const rented = rent(listed);
  assert.equal(rented.money.p2, 1000 - 100);
  assert.equal(rented.money.p1, listed.money.p1 + earned(100));
  assert.equal(rented.lots.lot1.ownerId, 'p2');
  assert.equal(rented.lots.lot1.builtBy, 'p1');
  assert.ok(noticesFor(rented, 'p1').some((n) => n.text.includes('P2')));
});

test('a deposit of 0 opens without paying and tells the owner', () => {
  const listed = list(withBuiltLot(), 0, 40);
  const rented = rent(listed);
  assert.equal(rented.lots.lot1.ownerId, 'p2');
  assert.equal(rented.money.p2, 1000);
  assert.equal(rented.money.p1, listed.money.p1);
  assert.ok(noticesFor(rented, 'p1').some((n) => n.text.includes('P2')));
});

test('an unlisted, suspended or unfinished lot cannot be rented by others', () => {
  const unlisted = withBuiltLot();
  assert.equal(rent(unlisted), unlisted);
  const suspended = setLot(list(withBuiltLot()), { suspended: true });
  assert.equal(rent(suspended), suspended);
  const unfinished = setLot(list(withBuiltLot()), { readyAt: unlisted.tick + 1 });
  assert.equal(rent(unfinished), unfinished);
});

test('daily rent goes to the owner minus commission', () => {
  for (const price of [40, 15]) {
    const state = leased(100, price);
    const due = setLot(state, { nextRentAt: state.tick + P });
    const paid = at(due, due.tick + P);
    assert.equal(paid.money.p2, state.money.p2 - price);
    assert.equal(paid.money.p1, state.money.p1 + earned(price));
  }
});

test('upkeep is charged empty and occupied, and not when unlisted', () => {
  const empty = list(withBuiltLot());
  const emptyDue = at(empty, empty.lots.lot1.nextUpkeepAt!);
  assert.equal(emptyDue.money.p1, empty.money.p1 - plots.upkeep);

  const occupied = leased();
  const due = setLot(occupied, { nextUpkeepAt: occupied.tick + P });
  assert.equal(at(due, due.tick + P).money.p1, due.money.p1 - plots.upkeep);

  const unlisted = setLot(withBuiltLot(), { nextUpkeepAt: 1 });
  assert.equal(at(unlisted, P).money.p1, unlisted.money.p1);
  const neverListed = withBuiltLot();
  assert.equal(at(neverListed, 10 * P).money.p1, neverListed.money.p1);
});

test('upkeep suspends once and resumes', () => {
  const listed = list(withBuiltLot());
  const due = listed.lots.lot1.nextUpkeepAt!;
  let state: GameState = { ...listed, money: { ...listed.money, p1: plots.upkeep - 7 } };
  const before = noticesFor(state, 'p1').length;
  for (let t = due; t < due + 3; t++) state = at(state, t);
  assert.equal(state.lots.lot1.suspended, true);
  assert.equal(noticesFor(state, 'p1').length, before + 1);

  state = at({ ...state, money: { ...state.money, p1: plots.upkeep } }, due + 3);
  assert.equal(state.lots.lot1.suspended, false);
  assert.equal(state.money.p1, 0);
  assert.equal(state.lots.lot1.nextUpkeepAt, due + 3 + P);
});

test('a suspended lot keeps its tenant and still pays rent', () => {
  const state = setLot(leased(), { suspended: true });
  const due = setLot(state, { nextRentAt: state.tick + P });
  const paid = at(due, due.tick + P);
  assert.equal(paid.lots.lot1.ownerId, 'p2');
  assert.equal(paid.money.p1, state.money.p1 + earned(40));
});

test('offline owner still collects and pays', () => {
  const state = leased();
  const due = setLot(state, { nextRentAt: state.tick + P, nextUpkeepAt: state.tick + P });
  const offline = { ...due, avatars: { p2: due.avatars.p2 } };
  const paid = at(offline, due.tick + P);
  assert.equal(paid.money.p2, state.money.p2 - 40);
  assert.equal(paid.money.p1, state.money.p1 + earned(40) - plots.upkeep);
});

test('a tenant who cannot pay loses the lot, which stays listed', () => {
  const rented = setLot(leased(), { level: 2 });
  const furnished: GameState = {
    ...rented,
    furniture: { f1: { id: 'f1', sceneId: 'lot1', defId: 'tire', x: 2, y: 2, rotation: 0 } },
    money: { ...rented.money, p2: 0 },
  };
  const due = setLot(furnished, { nextRentAt: furnished.tick + P });
  const lost = at(due, due.tick + P);
  const lot = lost.lots.lot1;
  assert.equal(lot.ownerId, null);
  assert.equal(lot.business, null);
  assert.deepEqual(lot.terms, { deposit: 100, rent: 40 });
  assert.equal(lot.builtBy, 'p1');
  assert.equal(lot.level, 2);
  assert.equal(lost.inventories.p2?.length, 1);
  assert.ok(noticesFor(lost, 'p2').length > 0);
  assert.ok(noticesFor(lost, 'p1').length > noticesFor(due, 'p1').length);
});

test('losing the lot in the same tick as upkeep keeps both results', () => {
  const state = leased();
  const due = setLot({ ...state, money: { ...state.money, p2: 0 } }, {
    nextRentAt: state.tick + P,
    nextUpkeepAt: state.tick + P,
  });
  const lost = at(due, due.tick + P);
  assert.equal(lost.lots.lot1.ownerId, null);
  assert.ok(lost.lots.lot1.terms);
  assert.equal(lost.lots.lot1.nextUpkeepAt, due.tick + P + P);
  assert.equal(lost.money.p1, state.money.p1 - plots.upkeep);
});

test('an absent tenant loses the lot; an absent owner does not', () => {
  const progress = { xp: 0, dailyDay: 0, name: 'P2', lastSeen: 0 };
  const leaving = secondsToTicks(ECONOMY.rent.abandonSeconds);

  const tenant = leased();
  const gone: GameState = {
    ...tenant,
    avatars: { p1: tenant.avatars.p1 },
    progress: { ...tenant.progress, p2: progress },
  };
  const lost = at(gone, leaving);
  assert.equal(lost.lots.lot1.ownerId, null);
  assert.ok(noticesFor(lost, 'p1').length > noticesFor(gone, 'p1').length);

  const own = setLot(withBuiltLot(), { ownerId: 'p1', ownerName: 'P1', business: 'store' });
  const away: GameState = { ...own, avatars: {}, progress: { p1: { ...progress, name: 'P1' } } };
  assert.equal(at(away, leaving).lots.lot1.ownerId, 'p1');
});

test('a tenant closing gets no refund and the money is not created', () => {
  const state = setLot(leased(), { storage: { sheet_metal: 3 } });
  const closed = applyAction(state, { type: 'CLOSE_BUSINESS', avatarId: 'p2', lotId: 'lot1' });
  assert.equal(closed.lots.lot1.ownerId, null);
  assert.equal(closed.money.p2, state.money.p2);
  assert.equal(closed.materials.p2?.sheet_metal, (state.materials.p2?.sheet_metal ?? 0) + 3);
  assert.ok(noticesFor(closed, 'p1').length > noticesFor(state, 'p1').length);
  assert.equal(totalMoney(closed), totalMoney(state));
});

test('only the owner upgrades a built lot', () => {
  const state = leased();
  const upgrade = (avatarId: string, lotId = 'lot1'): Action => ({ type: 'UPGRADE_LOT', avatarId, lotId });
  assert.equal(applyAction(state, upgrade('p2')), state);
  const upgraded = applyAction(state, upgrade('p1'));
  const cost = ECONOMY.lotLevels.upgrades[0];
  assert.ok(upgraded.lots.lot1.upgradeReadyAt);
  assert.equal(upgraded.money.p1, state.money.p1 - cost.price);
  assert.equal(upgraded.money.p2, state.money.p2);

  const city = applyAction(state, { type: 'RENT_LOT', avatarId: 'p2', lotId: 'lot2', business: 'store' });
  const cityUpgraded = applyAction(city, upgrade('p2', 'lot2'));
  assert.ok(cityUpgraded.lots.lot2.upgradeReadyAt);
});

test('the level stays and the next tenant gets its stations', () => {
  const state = leased();
  const upgrading = applyAction(state, { type: 'UPGRADE_LOT', avatarId: 'p1', lotId: 'lot1' });
  const closed = applyAction(upgrading, { type: 'CLOSE_BUSINESS', avatarId: 'p2', lotId: 'lot1' });
  const done = at({ ...closed, avatars: { p2: closed.avatars.p2 } }, closed.lots.lot1.upgradeReadyAt!);
  assert.equal(done.lots.lot1.business, null);
  assert.equal(done.lots.lot1.level, 2);

  const next = rent(done, 'p2', 'diner');
  for (const n of [1, 2]) assert.ok(next.furniture[stationId('lot1', n)], `station ${n}`);
});

test('a city lot behaves as before', () => {
  const state = withBuiltLot();
  const config = ECONOMY.businesses.store;
  const rented = applyAction(state, { type: 'RENT_LOT', avatarId: 'p2', lotId: 'lot2', business: 'store' });
  assert.equal(rented.money.p2, state.money.p2 - config.deposit);
  assert.equal(rented.money.p1, state.money.p1);
  assert.deepEqual(lotTerms(rented.lots.lot2, 'store'), { deposit: config.deposit, rent: config.rent });

  const upgraded = { ...rented, lots: { ...rented.lots, lot2: { ...rented.lots.lot2, level: 2 } } };
  const closed = applyAction(upgraded, { type: 'CLOSE_BUSINESS', avatarId: 'p2', lotId: 'lot2' });
  assert.equal(closed.money.p2, rented.money.p2 + Math.round(config.deposit * ECONOMY.rent.closeRefund));
  assert.equal(closed.lots.lot2.level, undefined);
});

test('opening a business leaves a notice for whoever opens it', () => {
  const tenant = rent(list(withBuiltLot()));
  assert.ok(noticesFor(tenant, 'p2').some((n) => n.text.includes('alquilado')));

  const own = applyAction(withBuiltLot(), { type: 'RENT_LOT', avatarId: 'p1', lotId: 'lot1', business: 'store' });
  assert.equal(own.lots.lot1.ownerId, 'p1');
  assert.ok(noticesFor(own, 'p1').some((n) => n.text.includes('abierto')));

  const city = applyAction(withBuiltLot(), { type: 'RENT_LOT', avatarId: 'p2', lotId: 'lot2', business: 'store' });
  assert.ok(noticesFor(city, 'p2').some((n) => n.text.includes('alquilado')));
});

test('a rejected rent leaves no notice', () => {
  const unlisted = withBuiltLot();
  assert.equal(noticesFor(rent(unlisted), 'p2').length, 0);
  const poor = list(withBuiltLot());
  const broke = rent({ ...poor, money: { ...poor.money, p2: 0 } });
  assert.equal(noticesFor(broke, 'p2').length, 0);
});

test('a finished upgrade of a leased lot notifies owner and tenant', () => {
  const upgrading = applyAction(leased(), { type: 'UPGRADE_LOT', avatarId: 'p1', lotId: 'lot1' });
  const done = at(upgrading, upgrading.lots.lot1.upgradeReadyAt!);
  assert.equal(done.lots.lot1.level, 2);
  assert.ok(noticesFor(done, 'p1').some((n) => n.text.includes('nivel 2')));
  assert.ok(noticesFor(done, 'p2').some((n) => n.text.includes('nivel 2')));
});

test('tenant furniture covering the new station is reported to both sides', () => {
  const rented = rent(list(withBuiltLot()), 'p2', 'diner');
  const state = setLot(rented, { nextUpkeepAt: rented.tick + 10 * P, nextRentAt: rented.tick + 10 * P });
  const upgrading = applyAction(state, { type: 'UPGRADE_LOT', avatarId: 'p1', lotId: 'lot1' });
  const tire = (id: string, x: number, y: number) => ({ id, sceneId: 'lot1', defId: 'tire' as const, x, y, rotation: 0 as const });
  // Se tapan los dos sitios libres del puesto (el primero ya lo ocupa el puesto 1).
  const covered: GameState = {
    ...upgrading,
    furniture: { ...upgrading.furniture, f1: tire('f1', 1, 3), f2: tire('f2', 4, 1) },
  };
  const done = at(covered, covered.lots.lot1.upgradeReadyAt!);
  assert.equal(done.lots.lot1.level, 2);
  assert.ok(noticesFor(done, 'p1').some((n) => n.text.includes('inquilino')));
  assert.ok(noticesFor(done, 'p2').some((n) => n.text.includes('tus muebles')));
  assert.ok(done.progress.p1.xp > (covered.progress.p1?.xp ?? 0));
  assert.equal(done.progress.p2?.xp ?? 0, covered.progress.p2?.xp ?? 0);
});
