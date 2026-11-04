import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAction,
  createInitialState,
  ECONOMY,
  isPlotId,
  planPath,
  PLOT_SITES,
  restorePlot,
  secondsToTicks,
  tick,
} from './index';
import type { GameState } from './index';
import { testPlayer } from './testHelpers';

const { plots } = ECONOMY;
const DAY = secondsToTicks(ECONOMY.rent.periodSeconds);
const SITE = PLOT_SITES[0];

/** p1 en la calle con el dinero y los materiales justos para construir. */
function readyToBuild(): GameState {
  const state = createInitialState();
  return {
    ...state,
    avatars: { p1: testPlayer('street') },
    money: { p1: plots.buildCost.money },
    materials: { p1: { ...plots.buildCost.materials } },
  };
}

/** p1 ha construido el primer solar; p2 está en la calle con dinero. */
function builtPlot(tenantMoney = 1000): GameState {
  const built = applyAction(readyToBuild(), { type: 'BUILD_PLOT', avatarId: 'p1', lotId: SITE.lotId });
  return {
    ...built,
    avatars: { ...built.avatars, p2: { ...testPlayer('street'), id: 'p2', name: 'P2' } },
    money: { ...built.money, p2: tenantMoney },
  };
}

/** builtPlot con p2 ya de inquilino (una tienda). */
function rentedPlot(tenantMoney = 1000): GameState {
  return applyAction(builtPlot(tenantMoney), {
    type: 'RENT_LOT',
    avatarId: 'p2',
    lotId: SITE.lotId,
    business: 'store',
  });
}

/** Avanza la simulación hasta el tick indicado. */
function runUntil(state: GameState, until: number): GameState {
  let next = state;
  while (next.tick < until) next = tick(next);
  return next;
}

const earned = (amount: number) => amount - Math.round(amount * plots.commissionRate);

test('the street has six free plot sites with a sign and no lot', () => {
  const state = createInitialState();
  const street = state.scenes.street;
  assert.equal(street.depth, 19);
  assert.deepEqual(
    PLOT_SITES.map((s) => [s.lotId, s.label]),
    [1, 2, 3, 4, 5, 6].map((n) => [`lot${n + 6}`, `Solar ${n}`]),
  );
  for (const site of PLOT_SITES) {
    assert.ok(isPlotId(site.lotId));
    assert.equal(state.lots[site.lotId], undefined);
    assert.equal(state.scenes[site.lotId], undefined);
    assert.ok(!street.doors.some((d) => d.lotId === site.lotId));
    const sign = Object.values(state.furniture).find(
      (f) => f.defId === 'plot_sign' && f.x === site.x + 3 && f.y === 14,
    );
    assert.ok(sign, `cartel de ${site.label}`);
  }
  assert.ok(!isPlotId('lot1'));
  assert.ok(!isPlotId('toString'));
  // Aceras: la sur junto a la carretera (y 10) y la trasera de los solares (y 15).
  assert.equal(street.ground?.[10][0], 's');
  assert.equal(street.ground?.[15][0], 's');
  assert.equal(street.ground?.[12][0], '.');
});

test('building a plot charges money and materials and creates lot, interior, building and door', () => {
  const state = builtPlot();
  const lot = state.lots[SITE.lotId];
  assert.equal(state.money.p1, 0);
  assert.deepEqual(state.materials.p1, {});
  assert.equal(lot.label, SITE.label);
  assert.equal(lot.ownerId, null);
  assert.equal(lot.landlordId, 'p1');
  assert.equal(lot.landlordName, 'P1');
  assert.deepEqual(lot.terms, plots.initialTerms);
  assert.equal(lot.nextUpkeepAt, state.tick + DAY);
  assert.equal(lot.suspended, false);

  assert.equal(state.scenes[SITE.lotId].name, SITE.label);
  const building = state.furniture[`${SITE.lotId}-building`];
  assert.equal(building.defId, 'shop');
  assert.deepEqual([building.x, building.y, building.rotation, building.variant], [SITE.x, 11, 1, 'closed']);
  const door = state.scenes.street.doors.find((d) => d.lotId === SITE.lotId);
  assert.deepEqual(
    [door?.x, door?.y, door?.spawn, door?.buildingId],
    [SITE.x + 2, 15, { x: SITE.x + 2, y: 16 }, building.id],
  );
  assert.ok(!Object.values(state.furniture).some((f) => f.defId === 'plot_sign' && f.x === SITE.x + 3));
});

test('cannot build without money or materials, twice, or on a non-plot id', () => {
  const ready = readyToBuild();
  const build = (s: GameState, lotId = SITE.lotId) =>
    applyAction(s, { type: 'BUILD_PLOT', avatarId: 'p1', lotId });

  const poor = { ...ready, money: { p1: plots.buildCost.money - 1 } };
  assert.equal(build(poor), poor);
  const noWood = { ...ready, materials: { p1: { ...plots.buildCost.materials, old_wood: 0 } } };
  assert.equal(build(noWood), noWood);
  assert.equal(build(ready, 'lot1'), ready);
  assert.equal(build(ready, 'toString'), ready);
  const inside = { ...ready, avatars: { p1: testPlayer('lot1') } };
  assert.equal(build(inside), inside);

  const rich = { ...ready, money: { p1: 10_000 }, materials: { p1: { sheet_metal: 99, old_wood: 99, tires: 99 } } };
  const once = build(rich);
  assert.notEqual(once, rich);
  assert.equal(build(once), once);
});

test('restorePlot is idempotent', () => {
  const state = builtPlot();
  const lot = state.lots[SITE.lotId];
  assert.deepEqual(restorePlot(state, lot), state);
  assert.deepEqual(restorePlot(restorePlot(state, lot), lot), state);
});

test('landlord sets terms within limits only while vacant', () => {
  const state = builtPlot();
  const set = (s: GameState, deposit: number, rent: number, avatarId = 'p1') =>
    applyAction(s, { type: 'SET_PLOT_TERMS', avatarId, lotId: SITE.lotId, deposit, rent });

  const changed = set(state, plots.deposit.max, plots.rent.min);
  assert.deepEqual(changed.lots[SITE.lotId].terms, { deposit: plots.deposit.max, rent: plots.rent.min });
  assert.equal(set(state, 50, 50, 'p2'), state);
  assert.equal(set(state, plots.deposit.min - 1, 50), state);
  assert.equal(set(state, 50, plots.rent.max + 1), state);
  assert.equal(set(state, 50.5, 50), state);
  assert.equal(set(state, 50, Number.NaN), state);

  const rented = rentedPlot();
  assert.equal(set(rented, 50, 50), rented);
});

test('a tenant rents a plot paying the landlord deposit minus commission; the landlord cannot rent it', () => {
  const built = builtPlot();
  const ownRent = { ...built, money: { ...built.money, p1: 1000 } };
  assert.equal(
    applyAction(ownRent, { type: 'RENT_LOT', avatarId: 'p1', lotId: SITE.lotId, business: 'store' }),
    ownRent,
  );

  const rented = rentedPlot();
  const { deposit } = plots.initialTerms;
  assert.equal(rented.lots[SITE.lotId].ownerId, 'p2');
  assert.equal(rented.money.p2, 1000 - deposit);
  assert.equal(rented.money.p1, earned(deposit));
  assert.ok(rented.notices.some((n) => n.avatarId === 'p1' && n.text.includes(`${earned(deposit)}`)));
});

test('daily rent goes to the landlord minus commission', () => {
  const rented = rentedPlot();
  const { rent } = plots.initialTerms;
  const lot = rented.lots[SITE.lotId];
  // El casero tiene dinero para el mantenimiento, que cae el mismo día.
  const withUpkeep = { ...rented, money: { ...rented.money, p1: 1000 } };
  const next = runUntil(withUpkeep, lot.nextRentAt);
  assert.equal(next.money.p2, rented.money.p2 - rent);
  assert.equal(next.money.p1, 1000 + earned(rent) - plots.upkeep);
  assert.ok(next.notices.some((n) => n.avatarId === 'p1' && n.text.includes(`${earned(rent)}`)));
});

test('losing a plot keeps the landlord', () => {
  const rented = rentedPlot(plots.initialTerms.deposit);
  assert.equal(rented.money.p2, 0);
  const next = runUntil(rented, rented.lots[SITE.lotId].nextRentAt);
  const lot = next.lots[SITE.lotId];
  assert.equal(lot.ownerId, null);
  assert.equal(lot.business, null);
  assert.equal(lot.landlordId, 'p1');
  assert.equal(lot.landlordName, 'P1');
  assert.deepEqual(lot.terms, plots.initialTerms);
  assert.equal(next.furniture[`${SITE.lotId}-building`].variant, 'closed');
});

test('upkeep suspends and resumes', () => {
  const built = builtPlot();
  assert.equal(built.money.p1, 0);
  const due = built.lots[SITE.lotId].nextUpkeepAt;
  const suspended = runUntil(built, due);
  assert.equal(suspended.lots[SITE.lotId].suspended, true);
  assert.ok(suspended.notices.some((n) => n.avatarId === 'p1' && n.text.includes(SITE.label)));
  const rent = { type: 'RENT_LOT', avatarId: 'p2', lotId: SITE.lotId, business: 'store' } as const;
  assert.equal(applyAction(suspended, rent), suspended);

  // Con dinero, el mantenimiento se cobra en el siguiente tick y vuelve a admitir inquilinos.
  const paid = tick({ ...suspended, money: { ...suspended.money, p1: plots.upkeep } });
  const lot = paid.lots[SITE.lotId];
  assert.equal(lot.suspended, false);
  assert.equal(paid.money.p1, 0);
  assert.equal(lot.nextUpkeepAt, paid.tick + DAY);
  assert.equal(applyAction(paid, rent).lots[SITE.lotId].ownerId, 'p2');
});

test('travelers can reach a shop on a plot', () => {
  const rented = rentedPlot();
  const door = rented.scenes.street.doors.find((d) => d.lotId === SITE.lotId);
  assert.ok(door);
  // Desde la acera norte, donde se bajan del coche, hasta la puerta trasera.
  const walker = { ...testPlayer('street'), x: door.x - 1, y: 6 };
  assert.notEqual(planPath(rented, walker, door), null);

  // Es la única tienda abierta: el primer viajero que pare entra en ella.
  let state = rented;
  const until = secondsToTicks(600);
  while (state.tick < until && !Object.values(state.avatars).some((a) => a.id.startsWith('trav') && a.sceneId === SITE.lotId)) {
    state = tick(state);
  }
  assert.ok(state.tick < until, 'ningún viajero llegó a la tienda del solar');
});
