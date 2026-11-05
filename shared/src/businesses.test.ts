import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testPlayer, withBusiness } from './testHelpers';
import {
  BUSINESS_TYPES,
  CATALOG,
  DISPLAY_SLOTS,
  ECONOMY,
  FACADES,
  applyAction,
  canPlaceFurni,
  canServe,
  createInitialState,
  createWalkableCheck,
  findPath,
  furnitureInScene,
  getFootprint,
  getListings,
  lotOfStation,
  secondsToTicks,
  sellsProducts,
  serveCustomer,
  stationFront,
  stationId,
  tick,
  tileKey,
} from './index';
import type { BusinessDecorId, BusinessType, FurniItem, GameState } from './index';

test('cotton field produces fabric', () => {
  let state = withBusiness('cotton_field');
  // Avanzamos 20 s de simulación: con el ritmo configurado salen 2 de tela.
  const until = secondsToTicks(20);
  while (state.tick <= until) state = tick(state);
  assert.equal(state.lots.lot1.storage.fabric, 2);
});

test('bar serves with water and fruit', () => {
  const state = withBusiness('bar', { water: 1, fruit: 1 }, 40);
  assert.ok(canServe(state.lots.lot1));
  const next = serveCustomer(state, 'lot1');
  assert.deepEqual(next.lots.lot1.storage, {});
  assert.equal(next.money.p1, 40 - Math.round(40 * ECONOMY.store.commissionRate));
});

test('arcade serves only with tokens', () => {
  const empty = withBusiness('arcade', {}, 50);
  assert.equal(canServe(empty.lots.lot1), false);
  const state = withBusiness('arcade', { tokens: 2 }, 50);
  assert.ok(canServe(state.lots.lot1));
  const next = serveCustomer(state, 'lot1');
  assert.deepEqual(next.lots.lot1.storage, {});
  assert.equal(next.money.p1, 50 - Math.round(50 * ECONOMY.store.commissionRate));
});

test('new businesses have a station and a facade', () => {
  const stations = {
    cotton_field: { defId: 'cotton_bed', x: 3, y: 2 },
    bar: { defId: 'bar_tap', x: 1, y: 1 },
    arcade: { defId: 'token_machine', x: 1, y: 1 },
  } as const;
  for (const type of ['cotton_field', 'bar', 'arcade'] as const) {
    assert.ok(FACADES[ECONOMY.businesses[type].defaultFacade]);
    const base = createInitialState();
    const state: GameState = {
      ...base,
      avatars: { p1: testPlayer('street') },
      money: { p1: 1000 },
    };
    const next = applyAction(state, { type: 'RENT_LOT', avatarId: 'p1', lotId: 'lot1', business: type });
    assert.equal(next.lots.lot1.business, type);
    const station = next.furniture[stationId('lot1')];
    assert.deepEqual({ defId: station.defId, x: station.x, y: station.y }, stations[type]);
  }
});

// --- Plano de los locales -------------------------------------------------------

const LEVELS = [1, 2, 3];

/** p1, desde la calle, abre ese negocio en lot1, ya construido y de ese nivel. */
function openedAtLevel(business: BusinessType, level: number): GameState {
  const base = createInitialState();
  const state: GameState = {
    ...base,
    avatars: { p1: testPlayer('street') },
    lots: { ...base.lots, lot1: { ...base.lots.lot1, builtBy: 'p1', level } },
    money: { p1: 0 },
  };
  return applyAction(state, { type: 'RENT_LOT', avatarId: 'p1', lotId: 'lot1', business });
}

const stationsOf = (state: GameState) =>
  furnitureInScene(state, 'lot1').filter((item) => lotOfStation(item.id) === 'lot1');

/** El mismo estado con burros de ropa en todos los huecos de exposición (si ese negocio vende). */
function withFullDisplay(state: GameState): GameState {
  if (!sellsProducts(state.lots.lot1)) return state;
  const furniture = { ...state.furniture };
  DISPLAY_SLOTS.forEach((slot, i) => {
    const rack: FurniItem = { id: `rack${i}`, sceneId: 'lot1', defId: 'clothes_rack', ...slot, rotation: 1 };
    furniture[rack.id] = rack;
  });
  return { ...state, furniture };
}

/** Baldosas que ocupa un mueble. */
function tilesOf(item: FurniItem): { x: number; y: number }[] {
  const f = getFootprint(item);
  const tiles = [];
  for (let y = f.y; y < f.y + f.depth; y++) {
    for (let x = f.x; x < f.x + f.width; x++) tiles.push({ x, y });
  }
  return tiles;
}

/** ¿Se llega andando desde la puerta a alguna de las baldosas de al lado de este mueble? */
function canWalkNextTo(state: GameState, item: FurniItem): boolean {
  const scene = state.scenes.lot1;
  const walkable = createWalkableCheck(state, 'lot1');
  return tilesOf(item).some(({ x, y }) =>
    [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(
      ([nx, ny]) => findPath(scene.doors[0].spawn, { x: nx, y: ny }, scene.width, scene.depth, walkable) !== null,
    ),
  );
}

/** Lo que está mal en el plano de un negocio a un nivel (vacío si está todo bien). */
function layoutProblems(business: BusinessType, level: number): string[] {
  const state = openedAtLevel(business, level);
  const scene = state.scenes.lot1;
  const door = scene.doors[0];
  const stations = stationsOf(state);
  const problems: string[] = [];

  const expected = business === 'store' ? 1 : level;
  if (stations.length !== expected) problems.push(`${stations.length} stations instead of ${expected}`);

  // Lo que ningún puesto puede pisar: la puerta, donde se aparece al entrar, los
  // huecos de exposición (si el negocio vende) y los demás puestos.
  const reserved = new Set([tileKey(door.x, door.y), tileKey(door.spawn.x, door.spawn.y)]);
  if (sellsProducts(state.lots.lot1)) {
    for (const slot of DISPLAY_SLOTS) reserved.add(tileKey(slot.x, slot.y));
  }
  for (const station of stations) {
    for (const { x, y } of tilesOf(station)) {
      if (reserved.has(tileKey(x, y))) problems.push(`${station.id} covers ${x},${y}`);
      reserved.add(tileKey(x, y));
    }
  }

  // Todo tiene que quedar a mano con el local lleno.
  const full = withFullDisplay(state);
  const walkable = createWalkableCheck(full, 'lot1');
  for (const item of furnitureInScene(full, 'lot1')) {
    if (!canWalkNextTo(full, item)) problems.push(`${item.id} cannot be reached`);
  }
  // Los viajeros se ponen delante de los puestos de los servicios.
  if (ECONOMY.businesses[business].service) {
    stations.forEach((station, i) => {
      const front = stationFront(full, 'lot1', i + 1);
      if (!front || !findPath(door.spawn, front, scene.width, scene.depth, walkable)) {
        problems.push(`the front of ${station.id} cannot be reached`);
      }
    });
  }
  return problems;
}

for (const business of BUSINESS_TYPES) {
  for (const level of LEVELS) {
    test(`${business} at level ${level} has a clean floor plan`, () => {
      assert.deepEqual(layoutProblems(business, level), []);
    });
  }
}

test('a full clothing store at level 3 fits every listing next to its machines', () => {
  const state = openedAtLevel('clothing', 3);
  const inventory = DISPLAY_SLOTS.map((_, i) => ({ id: `g${i}`, garment: 'cap' as const, color: '#d94040' }));
  let next: GameState = {
    ...state,
    // Dentro, en el pasillo, y con el rango que da los huecos de más.
    avatars: { p1: { ...state.avatars.p1, sceneId: 'lot1', x: 2, y: 4 } },
    inventories: { p1: inventory },
    progress: { p1: { xp: 1200, dailyDay: -1, name: 'P1' } },
  };
  for (const item of inventory) {
    next = applyAction(next, { type: 'LIST_ITEM', avatarId: 'p1', lotId: 'lot1', itemId: item.id, price: 10 });
  }
  assert.equal(getListings(next, 'lot1').length, DISPLAY_SLOTS.length);
});

for (const business of BUSINESS_TYPES) {
  test(`${business} sells its own decor, unlocked by level`, () => {
    const offers = ECONOMY.businessDecor[business];
    assert.deepEqual(offers.map((o) => o.minLevel), LEVELS);
    const money = offers.reduce((sum, o) => sum + o.price, 0);
    const buy = (state: GameState, defId: BusinessDecorId) =>
      applyAction(state, { type: 'BUY_DECOR', avatarId: 'p1', lotId: 'lot1', defId });

    const atLevel1: GameState = { ...openedAtLevel(business, 1), money: { p1: money } };
    assert.equal(buy(atLevel1, offers[2].defId), atLevel1);

    let state: GameState = { ...openedAtLevel(business, 3), money: { p1: money } };
    for (const offer of offers) {
      assert.ok(CATALOG[offer.defId].exclusive, offer.defId);
      state = buy(state, offer.defId);
    }
    assert.equal(state.money.p1, 0);
    assert.equal(state.inventories.p1.length, offers.length);

    // No se puede colocar encima de la puerta ni de un puesto.
    const door = state.scenes.lot1.doors[0];
    const station = stationsOf(state)[0];
    for (const offer of offers) {
      assert.equal(canPlaceFurni(state, 'lot1', offer.defId, door.x, door.y, 0), false);
      assert.equal(canPlaceFurni(state, 'lot1', offer.defId, station.x, station.y, 0), false);
    }
  });
}
