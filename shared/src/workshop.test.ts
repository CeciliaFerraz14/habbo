import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ECONOMY, SUPPLIER_MATERIAL_IDS, createInitialState, applyAction } from './index';
import type { BusinessType, CraftJob, FacadeId, GameState, MaterialId, Materials, RecipeId } from './index';

/** Jugador p1 dentro de lot1, que es suyo y es un taller. */
function withWorkshop(materials: Materials, jobs: CraftJob[] = []): GameState {
  const state = createInitialState();
  return {
    ...state,
    avatars: {
      p1: {
        id: 'p1',
        name: 'P1',
        sceneId: 'lot1',
        x: 1,
        y: 1,
        direction: 'SE',
        path: [],
        look: { hair: '#000000', skin: '#ffffff', shirt: '#ffffff', pants: '#000000' },
        isBot: false,
        sitting: false,
      },
    },
    lots: {
      ...state.lots,
      lot1: { ...state.lots.lot1, ownerId: 'p1', ownerName: 'P1', business: 'workshop', facade: 'classic', jobs },
    },
    materials: { p1: materials },
    inventories: { p1: [] },
    money: { p1: 1000 },
  };
}

const craft = (state: GameState, recipe: RecipeId) =>
  applyAction(state, { type: 'CRAFT', avatarId: 'p1', lotId: 'lot1', recipe });
const collect = (state: GameState) =>
  applyAction(state, { type: 'COLLECT_CRAFTED', avatarId: 'p1', lotId: 'lot1' });

test('material recipe crafts tokens into the owner materials', () => {
  const crafted = craft(withWorkshop({ sheet_metal: 1 }), 'tokens');
  assert.equal(crafted.lots.lot1.jobs.length, 1);
  const ready = { ...crafted, tick: crafted.lots.lot1.jobs[0].readyAt };
  const next = collect(ready);
  assert.equal(next.materials.p1.sheet_metal ?? 0, 0);
  assert.equal(next.materials.p1.tokens, 5);
  assert.deepEqual(next.lots.lot1.jobs, []);
});

test('material recipe needs materials and queue room', () => {
  const empty = withWorkshop({});
  assert.equal(craft(empty, 'tokens'), empty);
  const jobs = Array.from({ length: ECONOMY.workshop.queueSize }, () => ({ defId: 'tire' as const, readyAt: 99 }));
  const full = withWorkshop({ sheet_metal: 1 }, jobs);
  assert.equal(craft(full, 'tokens'), full);
});

test('collect mixed queue', () => {
  const state = withWorkshop({}, [
    { defId: 'tire', readyAt: 0 },
    { material: 'tokens', readyAt: 0 },
  ]);
  const next = collect(state);
  assert.deepEqual(next.inventories.p1.map((i) => i.defId), ['tire']);
  assert.equal(next.materials.p1.tokens, 5);
  assert.deepEqual(next.lots.lot1.jobs, []);
});

test('old furniture jobs still collect', () => {
  const next = collect(withWorkshop({}, [{ defId: 'tire', readyAt: 0 }]));
  assert.deepEqual(next.inventories.p1.map((i) => i.defId), ['tire']);
});

test('supplier does not sell fabric or tokens', () => {
  const sold: MaterialId[] = SUPPLIER_MATERIAL_IDS;
  assert.ok(!sold.includes('fabric'));
  assert.ok(!sold.includes('tokens'));
  const street = withWorkshop({});
  street.avatars.p1 = { ...street.avatars.p1, sceneId: 'street' };
  const bought = applyAction(street, { type: 'BUY_MATERIAL', avatarId: 'p1', material: 'fabric', quantity: 1 });
  assert.equal(bought, street);
});

test('furniture recipe spends materials and delivers the item', () => {
  const crafted = craft(withWorkshop({ tires: 3 }), 'tire');
  assert.equal(crafted.materials.p1.tires, 1);
  assert.deepEqual(crafted.lots.lot1.jobs.map((j) => 'defId' in j && j.defId), ['tire']);
  const next = collect({ ...crafted, tick: crafted.lots.lot1.jobs[0].readyAt });
  assert.deepEqual(next.inventories.p1.map((i) => i.defId), ['tire']);
  assert.equal(next.materials.p1.tires, 1);
});

test('CRAFT with a non-recipe key does nothing', () => {
  const state = withWorkshop({ sheet_metal: 5 });
  for (const recipe of ['toString', 'constructor', '__proto__']) {
    assert.equal(craft(state, recipe as RecipeId), state);
  }
});

test('collecting only furniture leaves the materials untouched', () => {
  const state = withWorkshop({}, [{ defId: 'tire', readyAt: 0 }]);
  assert.equal(collect(state).materials, state.materials);
});

test('BUY_MATERIAL with a non-material key does nothing', () => {
  const street = withWorkshop({});
  street.avatars.p1 = { ...street.avatars.p1, sceneId: 'street' };
  const bought = applyAction(street, {
    type: 'BUY_MATERIAL',
    avatarId: 'p1',
    material: 'toString' as MaterialId,
    quantity: 1,
  });
  assert.equal(bought, street);
});

test('SET_FACADE with a non-facade key does nothing', () => {
  const state = withWorkshop({});
  const next = applyAction(state, { type: 'SET_FACADE', avatarId: 'p1', lotId: 'lot1', facade: 'toString' as FacadeId });
  assert.equal(next, state);
});

test('RENT_LOT with a non-business key does nothing', () => {
  const base = createInitialState();
  const state: GameState = {
    ...base,
    avatars: { p1: { ...withWorkshop({}).avatars.p1, sceneId: 'street' } },
    money: { p1: 1000 },
  };
  const next = applyAction(state, { type: 'RENT_LOT', avatarId: 'p1', lotId: 'lot1', business: 'toString' as BusinessType });
  assert.equal(next, state);
});
