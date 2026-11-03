import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ECONOMY, SUPPLIER_MATERIAL_IDS, createInitialState, applyAction } from './index';
import type { CraftJob, GameState, MaterialId, Materials } from './index';

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

const craft = (state: GameState, recipe: 'tokens' | 'tire') =>
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
