import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testPlayer, withBusiness } from './testHelpers';
import {
  DEFAULT_LOOK,
  ECONOMY,
  GARMENT_COLORS,
  applyAction,
  listingValue,
  stationId,
  tick,
  travelerTick,
} from './index';
import type {
  Action,
  BusinessType,
  Garment,
  GameState,
  InventoryItem,
  Materials,
  RecipeId,
  TravelerBrain,
} from './index';

const HAT: Garment = { type: 'cowboy_hat', color: GARMENT_COLORS[1] };
const hatItem: InventoryItem = { id: 'g1', garment: HAT.type, color: HAT.color };
const PRICE = 10;

/** p1 dentro de su negocio en lot1, con esos materiales e inventario y el sombrero puesto. */
function owner(business: BusinessType, materials: Materials = {}, inventory: InventoryItem[] = []): GameState {
  const state = withBusiness(business);
  return {
    ...state,
    avatars: { p1: { ...state.avatars.p1, look: { ...DEFAULT_LOOK, outfit: { head: HAT } } } },
    materials: { p1: materials },
    inventories: { p1: inventory },
  };
}

const craft = (state: GameState, recipe: RecipeId, color?: string) =>
  applyAction(state, { type: 'CRAFT', avatarId: 'p1', lotId: 'lot1', recipe, color });
const list = (state: GameState, itemId: string) =>
  applyAction(state, { type: 'LIST_ITEM', avatarId: 'p1', lotId: 'lot1', itemId, price: PRICE });

/** Tienda de ropa de p1 con el sombrero g1 a la venta y p2 dentro con dinero. */
function listedHat(): GameState {
  const state = list(owner('clothing', {}, [hatItem]), 'g1');
  return {
    ...state,
    avatars: { ...state.avatars, p2: { ...testPlayer(), id: 'p2', name: 'P2', x: 2, y: 6 } },
    money: { ...state.money, p2: 100 },
    inventories: { ...state.inventories, p2: [] },
  };
}

test('clothing store crafts a garment in the chosen color', () => {
  const crafted = craft(owner('clothing', { fabric: 2 }), 'cowboy_hat', HAT.color);
  const [job] = crafted.lots.lot1.jobs;
  assert.deepEqual(job, { garment: 'cowboy_hat', color: HAT.color, readyAt: job.readyAt });
  assert.equal(crafted.materials.p1.fabric ?? 0, 0);

  const early = applyAction(crafted, { type: 'COLLECT_CRAFTED', avatarId: 'p1', lotId: 'lot1' });
  assert.equal(early, crafted);
  const ready = { ...crafted, tick: job.readyAt };
  const next = applyAction(ready, { type: 'COLLECT_CRAFTED', avatarId: 'p1', lotId: 'lot1' });
  assert.deepEqual(next.inventories.p1, [{ id: `i${ready.nextId}`, garment: 'cowboy_hat', color: HAT.color }]);
  assert.deepEqual(next.lots.lot1.jobs, []);
});

test('craft rejects a garment without a valid color, and garments outside a clothing store', () => {
  const clothing = owner('clothing', { fabric: 5, tires: 5, sheet_metal: 5 });
  for (const color of [undefined, '#123456', 'toString']) {
    assert.equal(craft(clothing, 'cowboy_hat', color), clothing);
  }
  assert.equal(craft(clothing, 'toString' as RecipeId, HAT.color), clothing);
  // La tienda de ropa no fabrica muebles ni materiales...
  assert.equal(craft(clothing, 'tire'), clothing);
  assert.equal(craft(clothing, 'tokens'), clothing);
  // ...y el taller no cose prendas.
  const workshop = owner('workshop', { fabric: 5 });
  assert.equal(craft(workshop, 'cowboy_hat', HAT.color), workshop);
  // En el taller el color se ignora.
  assert.equal(craft({ ...workshop, materials: { p1: { tires: 2 } } }, 'tire', HAT.color).lots.lot1.jobs.length, 1);
});

test('stores only list their own kind', () => {
  const store = owner('store', {}, [hatItem]);
  assert.equal(list(store, 'g1'), store);
  const clothing = owner('clothing', {}, [{ id: 'f1', defId: 'tire' }]);
  assert.equal(list(clothing, 'f1'), clothing);
});

test('listing a worn garment takes it off', () => {
  const next = list(owner('clothing', {}, [hatItem]), 'g1');
  assert.equal(next.avatars.p1.look.outfit, undefined);
  assert.deepEqual(next.inventories.p1, []);
  const rack = next.furniture.g1;
  assert.equal(rack.defId, 'clothes_rack');
  assert.equal(rack.variant, HAT.color);
  assert.equal(rack.garment, HAT.type);
  assert.equal(rack.price, PRICE);
  assert.equal(listingValue(rack), ECONOMY.garmentValue.cowboy_hat);
});

test('a player buys a garment and can wear it', () => {
  const state = listedHat();
  const bought = applyAction(state, { type: 'BUY_ITEM', avatarId: 'p2', itemId: 'g1' });
  assert.deepEqual(bought.inventories.p2, [hatItem]);
  assert.equal(bought.furniture.g1, undefined);
  assert.equal(bought.money.p2, 100 - PRICE);
  assert.equal(bought.money.p1, PRICE - Math.round(PRICE * ECONOMY.store.commissionRate));
  assert.ok(bought.notices.some((n) => n.avatarId === 'p1' && n.text.includes('Sombrero de cowboy')));

  const look = { ...DEFAULT_LOOK, outfit: { head: HAT } };
  const worn = applyAction(bought, { type: 'SET_LOOK', avatarId: 'p2', look });
  assert.deepEqual(worn.avatars.p2.look.outfit, { head: HAT });
});

test('unlisting returns the garment', () => {
  const state = listedHat();
  const pickup = (avatarId: string): Action => ({ type: 'PICKUP_FURNI', avatarId, itemId: 'g1' });
  assert.equal(applyAction(state, pickup('p2')), state);
  const next = applyAction(state, pickup('p1'));
  assert.deepEqual(next.inventories.p1, [hatItem]);
  assert.equal(next.furniture.g1, undefined);
  // El burro no se mueve como un mueble, y el puesto sigue sin poder recogerse.
  const moved = applyAction(state, { type: 'MOVE_FURNI', avatarId: 'p1', itemId: 'g1', x: 2, y: 2, rotation: 0 });
  assert.equal(moved, state);
  const rented = applyAction(
    { ...state, avatars: { p1: testPlayer('street') }, lots: { ...state.lots, lot2: { ...state.lots.lot2 } }, money: { p1: 1000 } },
    { type: 'RENT_LOT', avatarId: 'p1', lotId: 'lot2', business: 'clothing' },
  );
  const station = rented.furniture[stationId('lot2')];
  assert.deepEqual([station.defId, station.x, station.y, station.rotation], ['sewing_machine', 1, 1, 0]);
  assert.equal(applyAction(rented, { type: 'PICKUP_FURNI', avatarId: 'p1', itemId: station.id }), rented);
});

test('losing the store returns listed garments', () => {
  const state = listedHat();
  // Sin dinero para el alquiler, pierde el local y el sombrero vuelve a su inventario.
  const due: GameState = {
    ...state,
    money: { ...state.money, p1: 0 },
    lots: { ...state.lots, lot1: { ...state.lots.lot1, nextRentAt: state.tick } },
  };
  const next = tick(due);
  assert.equal(next.lots.lot1.ownerId, null);
  assert.deepEqual(next.inventories.p1, [hatItem]);
});

test('a traveler buys a garment and wears it', () => {
  const state = listedHat();
  const brain: TravelerBrain = {
    id: 'trav1',
    role: 'traveler',
    vehicleId: 'car1',
    lotId: 'lot1',
    phase: 'shopping',
    nextThinkAt: 0,
    budget: 100,
    looked: 2,
    patience: 5,
  };
  const traveler = { ...testPlayer(), id: brain.id, name: 'Viajero', x: 2, y: 6, isBot: true };
  const shopping: GameState = {
    ...state,
    avatars: { p1: state.avatars.p1, [brain.id]: traveler },
    npcs: { [brain.id]: brain },
    nextCarAt: Number.MAX_SAFE_INTEGER,
    // Semilla con la que el viajero se decide a comprar (la simulación es determinista).
    seed: 1,
  };
  const next = travelerTick(shopping);
  assert.equal(next.furniture.g1, undefined);
  assert.deepEqual(next.avatars[brain.id].look.outfit, { head: HAT });
  assert.equal(next.money.p1, PRICE - Math.round(PRICE * ECONOMY.store.commissionRate));
});
