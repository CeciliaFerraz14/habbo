import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DECOR_IDS, ECONOMY, createInitialState, applyAction } from './index';
import type { GameState, Materials } from './index';

/** Jugador p1 dentro de lot1, que es suyo y es un taller. */
function withWorkshop(materials: Materials): GameState {
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
      lot1: { ...state.lots.lot1, ownerId: 'p1', ownerName: 'P1', business: 'workshop', facade: 'classic', jobs: [] },
    },
    materials: { p1: materials },
    inventories: { p1: [] },
    money: { p1: 1000 },
  };
}

const craft = (state: GameState) =>
  applyAction(state, { type: 'CRAFT', avatarId: 'p1', lotId: 'lot1', recipe: 'arcade_machine' });

test('new furniture has recipe and value', () => {
  for (const id of ['bar_counter', 'beer_barrel', 'dartboard', 'arcade_machine', 'pinball'] as const) {
    assert.ok(DECOR_IDS.includes(id));
    assert.ok(ECONOMY.recipes[id].seconds > 0);
    assert.ok(ECONOMY.baseValue[id] > 0);
  }
});

test('arcade machine needs tokens', () => {
  const noTokens = withWorkshop({ sheet_metal: 3, old_wood: 1 });
  assert.equal(craft(noTokens), noTokens);
  const next = craft(withWorkshop({ sheet_metal: 3, old_wood: 1, tokens: 2 }));
  assert.equal(next.lots.lot1.jobs.length, 1);
  assert.equal(next.materials.p1.sheet_metal ?? 0, 0);
  assert.equal(next.materials.p1.old_wood ?? 0, 0);
  assert.equal(next.materials.p1.tokens ?? 0, 0);
});
