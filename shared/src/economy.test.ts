import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  createLot,
  DECOR_IDS,
  ECONOMY,
  getListings,
  LOT_IDS,
  releaseNpcLots,
  secondsToTicks,
  tick,
} from './index';
import type { GameState } from './index';

test('initial world has every lot for rent and nothing on sale', () => {
  const state = createInitialState();
  for (const id of LOT_IDS) {
    assert.equal(state.lots[id].ownerId, null);
    assert.equal(getListings(state, id).length, 0);
  }
  assert.deepEqual(Object.keys(state.money).filter((id) => id.startsWith('npc-')), []);
});

test('no lot restocks itself over time', () => {
  let state = createInitialState();
  const until = secondsToTicks(120);
  while (state.tick < until) state = tick(state);
  for (const id of LOT_IDS) assert.equal(getListings(state, id).length, 0);
});

/** Mundo guardado de antes: lot4 sigue siendo la tienda de Rosa, con un mueble a la venta. */
function withRosaStore(): GameState {
  const state = createInitialState();
  return {
    ...state,
    lots: {
      ...state.lots,
      lot4: {
        ...state.lots.lot4,
        ownerId: 'npc-rosa',
        ownerName: 'Rosa',
        business: 'store',
        facade: 'boutique',
      },
    },
    furniture: {
      ...state.furniture,
      'lot4-building': { ...state.furniture['lot4-building'], variant: 'open-store' },
      i500: { id: 'i500', sceneId: 'lot4', defId: 'tire', x: 2, y: 2, rotation: 0, price: 26 },
    },
    money: { ...state.money, 'npc-rosa': 0 },
    scenes: {
      ...state.scenes,
      lot4: { ...state.scenes.lot4, name: 'Tienda de decoración · Local 4' },
    },
  };
}

test('releaseNpcLots puts NPC lots back for rent and drops their goods', () => {
  const next = releaseNpcLots(withRosaStore());
  assert.deepEqual(next.lots.lot4, createLot('lot4', 'Local 4'));
  assert.equal(next.furniture.i500, undefined);
  assert.equal(next.furniture['lot4-building'].variant, 'closed');
  assert.equal(next.scenes.lot4.name, 'Local 4');
  assert.equal(next.money['npc-rosa'], undefined);
  assert.equal(next.inventories['npc-rosa'], undefined);
});

test('releaseNpcLots leaves player lots untouched', () => {
  const state = withRosaStore();
  const playerLot = { ...state.lots.lot6, ownerId: 'player', ownerName: 'Ana', business: 'well' as const };
  const before = { ...state, lots: { ...state.lots, lot6: playerLot } };
  const next = releaseNpcLots(before);
  assert.equal(next.lots.lot6, playerLot);
});

test('releaseNpcLots returns the same state when no NPC owns a lot', () => {
  const state = createInitialState();
  assert.equal(releaseNpcLots(state), state);
});

test('new furniture has recipe and value', () => {
  for (const id of ['bar_counter', 'beer_barrel', 'dartboard', 'arcade_machine', 'pinball'] as const) {
    assert.ok(DECOR_IDS.includes(id));
    assert.ok(ECONOMY.recipes[id].seconds > 0);
    assert.ok(ECONOMY.baseValue[id] > 0);
  }
});
