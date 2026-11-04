import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testPlayer } from './testHelpers';
import {
  DEFAULT_LOOK,
  ECONOMY,
  GARMENT_COLORS,
  GARMENT_IDS,
  applyAction,
  createInitialState,
  dropUnownedOutfit,
  normalizeLook,
} from './index';
import type { AvatarLook, Garment, GameState, GarmentId, InventoryItem } from './index';

const HAT: Garment = { type: 'cowboy_hat', color: GARMENT_COLORS[0] };
const WITH_HAT: AvatarLook = { ...DEFAULT_LOOK, outfit: { head: HAT } };
const hatItem = (id: string): InventoryItem => ({ id, garment: HAT.type, color: HAT.color });

/** Jugador p1 en su caravana, con ese inventario. */
function withPlayer(inventory: InventoryItem[]): GameState {
  const state = applyAction(createInitialState(), { type: 'JOIN', avatar: testPlayer('trailer') });
  return { ...state, inventories: { ...state.inventories, p1: inventory } };
}

const setLook = (state: GameState, look: AvatarLook) =>
  applyAction(state, { type: 'SET_LOOK', avatarId: 'p1', look });

test('look without outfit is valid', () => {
  assert.deepEqual(normalizeLook(DEFAULT_LOOK), DEFAULT_LOOK);
});

test('outfit must use a known garment in its slot and an allowed color', () => {
  assert.deepEqual(normalizeLook(WITH_HAT), WITH_HAT);
  const invalid: unknown[] = [
    { head: { type: 'boots', color: GARMENT_COLORS[0] } },
    { head: { type: 'cowboy_hat', color: '#123456' } },
    { head: { type: 'toString', color: GARMENT_COLORS[0] } },
    { toString: HAT },
    { head: null },
    [],
  ];
  for (const outfit of invalid) {
    assert.equal(normalizeLook({ ...DEFAULT_LOOK, outfit }), null);
  }
});

test('extra fields in a look are not stored', () => {
  const junk = { ...DEFAULT_LOOK, junk: 'x', outfit: { head: { ...HAT, junk: 'x' } } };
  const worn = setLook(withPlayer([hatItem('g1')]), junk as AvatarLook);
  assert.deepEqual(worn.avatars.p1.look, WITH_HAT);
  assert.equal(normalizeLook({ ...DEFAULT_LOOK, outfit: {} })?.outfit, undefined);
});

test('cannot wear a garment you do not own', () => {
  const naked = setLook(withPlayer([]), WITH_HAT);
  assert.equal('outfit' in naked.avatars.p1.look, false);
  assert.equal(naked.avatars.p1.look.shirt, DEFAULT_LOOK.shirt);

  const owned = setLook(withPlayer([hatItem('g1')]), WITH_HAT);
  assert.deepEqual(owned.avatars.p1.look.outfit?.head, HAT);
});

test('invalid colours still reject the whole look', () => {
  const state = withPlayer([hatItem('g1')]);
  assert.equal(setLook(state, { ...WITH_HAT, hair: '#123456' }), state);
  assert.equal(setLook(state, null as unknown as AvatarLook), state);
});

test('join drops unowned garments', () => {
  const joined = applyAction(createInitialState(), {
    type: 'JOIN',
    avatar: { ...testPlayer('trailer'), look: WITH_HAT },
  });
  assert.equal(joined.avatars.p1.look.outfit?.head, undefined);

  const base = createInitialState();
  const owner = { ...base, inventories: { p1: [hatItem('g1')] } };
  const kept = applyAction(owner, { type: 'JOIN', avatar: { ...testPlayer('trailer'), look: WITH_HAT } });
  assert.deepEqual(kept.avatars.p1.look.outfit?.head, HAT);
});

test('a second identical garment keeps it on', () => {
  const worn = setLook(withPlayer([hatItem('g1'), hatItem('g2')]), WITH_HAT);
  const sold = { ...worn, inventories: { ...worn.inventories, p1: [hatItem('g2')] } };
  assert.equal(dropUnownedOutfit(sold, 'p1'), sold);

  const none = { ...worn, inventories: { ...worn.inventories, p1: [] } };
  assert.deepEqual(dropUnownedOutfit(none, 'p1').avatars.p1.look, DEFAULT_LOOK);
});

test('garments cannot be placed as furniture', () => {
  const state = withPlayer([hatItem('g1')]);
  const next = applyAction(state, { type: 'PLACE_FURNI', avatarId: 'p1', itemId: 'g1', x: 2, y: 2, rotation: 0 });
  assert.equal(next, state);
});

test('garments cannot be listed in a store', () => {
  const state = withPlayer([hatItem('g1')]);
  const store: GameState = {
    ...state,
    avatars: { p1: { ...state.avatars.p1, sceneId: 'lot1' } },
    lots: { ...state.lots, lot1: { ...state.lots.lot1, ownerId: 'p1', ownerName: 'P1', business: 'store', facade: 'boutique' } },
  };
  const next = applyAction(store, { type: 'LIST_ITEM', avatarId: 'p1', lotId: 'lot1', itemId: 'g1', price: 10 });
  assert.equal(next, store);
});

test('every garment has a recipe and a value', () => {
  const ids: GarmentId[] = GARMENT_IDS;
  assert.deepEqual(ids, ['cowboy_hat', 'cap', 'denim_jacket', 'vest', 'boots']);
  for (const id of ids) {
    assert.ok(ECONOMY.garmentRecipes[id].seconds > 0);
    assert.ok(ECONOMY.garmentValue[id] > 0);
  }
});
