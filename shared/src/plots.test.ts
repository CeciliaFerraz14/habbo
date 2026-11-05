import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAction,
  createInitialState,
  createWalkableCheck,
  ECONOMY,
  footprintContains,
  getFootprint,
  isPlotId,
  lotTerms,
  planPath,
  plotOfSiteItem,
  PLOT_SITES,
  restorePlot,
  restoreSavedPlots,
  secondsToTicks,
  tick,
} from './index';
import type { FurniItem, GameState } from './index';
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

/** p1 ha construido los seis solares. */
function allBuilt(): GameState {
  const ready = readyToBuild();
  const count = PLOT_SITES.length;
  const rich: GameState = {
    ...ready,
    money: { p1: plots.buildCost.money * count },
    materials: { p1: { sheet_metal: 99, old_wood: 99, tires: 99 } },
  };
  return PLOT_SITES.reduce(
    (state, site) => applyAction(state, { type: 'BUILD_PLOT', avatarId: 'p1', lotId: site.lotId }),
    rich,
  );
}

/** Avanza la simulación hasta el tick indicado. */
function runUntil(state: GameState, until: number): GameState {
  let next = state;
  while (next.tick < until) next = tick(next);
  return next;
}

const earned = (amount: number) => amount - Math.round(amount * plots.commissionRate);

test('the street has six free plot sites with a fixed structure and no lot', () => {
  const state = createInitialState();
  const street = state.scenes.street;
  assert.equal(street.depth, 25);
  assert.deepEqual(
    PLOT_SITES.map((s) => [s.lotId, s.label, s.x, s.y]),
    [
      ['lot7', 'Solar 1', 8, 11],
      ['lot8', 'Solar 2', 20, 11],
      ['lot9', 'Solar 3', 32, 11],
      ['lot10', 'Solar 4', 15, 17],
      ['lot11', 'Solar 5', 27, 17],
      ['lot12', 'Solar 6', 39, 17],
    ],
  );
  for (const site of PLOT_SITES) {
    assert.ok(isPlotId(site.lotId));
    assert.equal(state.lots[site.lotId], undefined);
    assert.equal(state.scenes[site.lotId], undefined);
    assert.ok(!street.doors.some((d) => d.lotId === site.lotId));
    const item = Object.values(state.furniture).find((f) => f.defId === 'plot_site' && f.x === site.x && f.y === site.y);
    assert.ok(item, `estructura de ${site.label}`);
    assert.equal(plotOfSiteItem(item.id), site.lotId);
    // Mismo tamaño y orientación que el local que se construirá encima.
    assert.equal(item.rotation, 1);
    const { width, depth } = getFootprint(item);
    assert.deepEqual([width, depth], [4, 4]);
  }
  assert.equal(plotOfSiteItem('lot1-building'), null);
  assert.ok(!isPlotId('lot1'));
  assert.ok(!isPlotId('toString'));
  // Aceras: la sur junto a la carretera (y 10) y las de las puertas de los solares (y 15 e y 21).
  for (const y of [10, 15, 21]) assert.equal(street.ground?.[y][0], 's', `fila ${y}`);
  for (const y of [12, 16, 19, 22, 24]) assert.equal(street.ground?.[y][0], '.', `fila ${y}`);
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
  assert.ok(!Object.values(state.furniture).some((f) => f.defId === 'plot_site' && f.x === SITE.x && f.y === SITE.y));
});

test('every built plot has its building on the site and its door on the sidewalk in front', () => {
  const state = allBuilt();
  for (const site of PLOT_SITES) {
    const building = state.furniture[`${site.lotId}-building`];
    assert.equal(building.defId, 'shop');
    assert.deepEqual([building.x, building.y, building.rotation, building.variant], [site.x, site.y, 1, 'closed']);
    const door = state.scenes.street.doors.find((d) => d.lotId === site.lotId);
    assert.deepEqual(
      [door?.x, door?.y, door?.spawn, door?.buildingId],
      [site.x + 2, site.y + 4, { x: site.x + 2, y: site.y + 5 }, building.id],
    );
    assert.equal(state.scenes.street.ground?.[site.y + 4][site.x + 2], 's');
  }
  assert.ok(!Object.values(state.furniture).some((f) => f.defId === 'plot_site'));
});

test('an unbuilt site cannot be walked on', () => {
  const state = readyToBuild();
  const walkable = createWalkableCheck(state, 'street');
  const walker = { ...testPlayer('street'), x: 5, y: 5 };
  for (const site of PLOT_SITES) {
    for (let y = site.y; y < site.y + 4; y++) {
      for (let x = site.x; x < site.x + 4; x++) {
        assert.equal(walkable(x, y), false, `${site.label}: baldosa ${x},${y}`);
        assert.equal(planPath(state, walker, { x, y }), null, `${site.label}: ruta a ${x},${y}`);
      }
    }
  }
});

test('every plot door is reachable from the north sidewalk', () => {
  const state = allBuilt();
  const walker = { ...testPlayer('street'), x: 5, y: 5 };
  for (const site of PLOT_SITES) {
    const door = state.scenes.street.doors.find((d) => d.lotId === site.lotId);
    assert.ok(door);
    assert.notEqual(planPath(state, walker, door), null, `puerta de ${site.label}`);
    assert.notEqual(planPath(state, walker, door.spawn), null, `salida de ${site.label}`);
  }
  // También sin construir: los huecos entre filas no dependen de que haya edificios.
  const empty = readyToBuild();
  for (const site of PLOT_SITES) {
    assert.notEqual(planPath(empty, walker, { x: site.x + 2, y: site.y + 5 }), null, `delante de ${site.label}`);
  }
});

test('street decor stays off plot sites, doors and spawns, and cacti off the sidewalks', () => {
  const state = allBuilt();
  const street = state.scenes.street;
  const decor = Object.values(state.furniture).filter(
    (f) => f.sceneId === 'street' && ['street_lamp', 'saguaro', 'welcome_sign'].includes(f.defId),
  );
  const lampRows = new Set(decor.filter((f) => f.defId === 'street_lamp').map((f) => f.y));
  for (const y of [6, 10, 15, 21]) assert.ok(lampRows.has(y), `farolas en la fila ${y}`);

  const doorTiles = street.doors.flatMap((d) => [d, d.spawn]);
  for (const item of decor) {
    const f = getFootprint(item);
    assert.ok(f.x + f.width <= street.width && f.y + f.depth <= street.depth, `${item.id} dentro de la calle`);
    for (const site of PLOT_SITES) {
      const clear = f.x + f.width <= site.x || f.x >= site.x + 4 || f.y + f.depth <= site.y || f.y >= site.y + 4;
      assert.ok(clear, `${item.id} sobre ${site.label}`);
    }
    for (const tile of doorTiles) {
      assert.ok(!footprintContains(f, tile.x, tile.y), `${item.id} sobre ${tile.x},${tile.y}`);
    }
    if (item.defId === 'saguaro') assert.equal(street.ground?.[item.y][item.x], '.', `${item.id} sobre la acera`);
  }
});

test('neighbors also stroll along the sidewalk of the second row of plots', () => {
  let state = createInitialState();
  const until = secondsToTicks(600);
  const isThere = (s: GameState) =>
    Object.values(s.avatars).some((a) => a.id.startsWith('npc-') && a.sceneId === 'street' && a.y === 21);
  while (state.tick < until && !isThere(state)) state = tick(state);
  assert.ok(state.tick < until, 'ningún vecino pasó por la fila 21');
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

/** Lo que carga el servidor: mundo inicial con el local y sus muebles guardados encima. */
function loadedWith(saved: GameState, lotId: string): GameState {
  const fresh = createInitialState();
  const furniture = { ...fresh.furniture };
  for (const f of Object.values(saved.furniture)) if (f.sceneId === lotId) furniture[f.id] = f;
  return { ...fresh, lots: { ...fresh.lots, [lotId]: saved.lots[lotId] }, furniture };
}

test('loading a saved plot reproduces the scene, door and building of building it', () => {
  const built = builtPlot();
  const loaded = restoreSavedPlots(loadedWith(built, SITE.lotId));
  assert.deepEqual(loaded.scenes, built.scenes);
  assert.deepEqual(loaded.furniture, built.furniture);
  assert.deepEqual(loaded.lots, built.lots);
});

test('loading a plot saved without landlord drops it and its furniture, and the site goes back to unbuilt', () => {
  const lot = { ...builtPlot().lots[SITE.lotId], landlordId: null, landlordName: null, terms: null };
  const fresh = createInitialState();
  const stray: FurniItem = { id: 'old-f', sceneId: SITE.lotId, defId: 'saguaro', x: 1, y: 1, rotation: 0 };
  const loaded = restoreSavedPlots({
    ...fresh,
    lots: { ...fresh.lots, [SITE.lotId]: lot },
    furniture: { ...fresh.furniture, [stray.id]: stray },
  });
  assert.equal(loaded.lots[SITE.lotId], undefined);
  assert.equal(loaded.scenes[SITE.lotId], undefined);
  assert.equal(loaded.furniture[stray.id], undefined);
  assert.deepEqual(loaded.scenes.street, fresh.scenes.street);
  assert.deepEqual(loaded.furniture, fresh.furniture);
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

test('lotTerms: landlord terms on a plot, business deposit and rent on a city lot', () => {
  const state = builtPlot();
  assert.deepEqual(lotTerms(state.lots[SITE.lotId], 'store'), plots.initialTerms);
  const { deposit, rent } = ECONOMY.businesses.store;
  assert.deepEqual(lotTerms(state.lots.lot1, 'store'), { deposit, rent });
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
  // Desde la acera norte, donde se bajan del coche, hasta la puerta del solar.
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

/** Avisos de un jugador. */
const noticesOf = (state: GameState, avatarId: string) =>
  state.notices.filter((n) => n.avatarId === avatarId).map((n) => n.text);

test('building a plot, saving its terms and renting a lot leave a notice for whoever did it', () => {
  const built = builtPlot();
  assert.ok(noticesOf(built, 'p1').some((text) => text.includes(SITE.label) && text.includes('casero')));

  const saved = applyAction(built, { type: 'SET_PLOT_TERMS', avatarId: 'p1', lotId: SITE.lotId, deposit: 50, rent: 50 });
  assert.equal(noticesOf(saved, 'p1').length, noticesOf(built, 'p1').length + 1);
  assert.ok(noticesOf(saved, 'p1').at(-1)?.includes(SITE.label));

  const rented = rentedPlot();
  assert.ok(noticesOf(rented, 'p2').some((text) => text.includes(SITE.label)));

  const cityLot = applyAction(built, { type: 'RENT_LOT', avatarId: 'p2', lotId: 'lot1', business: 'store' });
  assert.equal(cityLot.lots.lot1.ownerId, 'p2');
  assert.equal(noticesOf(cityLot, 'p2').length, 1);
  assert.ok(noticesOf(cityLot, 'p2')[0].includes('Local 1'));
});

test('rejected build, terms and rent actions leave no notice', () => {
  const ready = readyToBuild();
  const poor = { ...ready, money: { p1: 0 } };
  assert.equal(applyAction(poor, { type: 'BUILD_PLOT', avatarId: 'p1', lotId: SITE.lotId }).notices.length, 0);

  const rented = rentedPlot();
  const terms = applyAction(rented, { type: 'SET_PLOT_TERMS', avatarId: 'p1', lotId: SITE.lotId, deposit: 50, rent: 50 });
  assert.equal(terms.notices.length, rented.notices.length);

  const again = applyAction(rented, { type: 'RENT_LOT', avatarId: 'p1', lotId: SITE.lotId, business: 'store' });
  assert.equal(again.notices.length, rented.notices.length);
});

test('the landlord is told about a new tenant, also when the deposit is 0', () => {
  const built = builtPlot();
  const free = applyAction(built, { type: 'SET_PLOT_TERMS', avatarId: 'p1', lotId: SITE.lotId, deposit: 0, rent: 50 });
  const rented = applyAction(free, { type: 'RENT_LOT', avatarId: 'p2', lotId: SITE.lotId, business: 'store' });
  assert.equal(rented.lots[SITE.lotId].ownerId, 'p2');
  assert.equal(rented.money.p1, free.money.p1);
  assert.ok(noticesOf(rented, 'p1').some((text) => text.includes('P2') && text.includes(SITE.label)));

  // Con fianza se le avisa igual, además de lo que ha cobrado.
  const paying = rentedPlot();
  assert.ok(noticesOf(paying, 'p1').some((text) => text.includes('P2') && text.includes(SITE.label)));
});

test('the landlord is told when the tenant loses the plot', () => {
  const rented = rentedPlot(plots.initialTerms.deposit);
  const next = runUntil(rented, rented.lots[SITE.lotId].nextRentAt);
  assert.equal(next.lots[SITE.lotId].ownerId, null);
  assert.ok(noticesOf(next, 'p1').some((text) => text.includes('P2') && text.includes(SITE.label) && text.includes('perdido')));
  assert.ok(noticesOf(next, 'p2').some((text) => text.includes('perdido')));
});
