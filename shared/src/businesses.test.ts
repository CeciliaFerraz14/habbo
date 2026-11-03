import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ECONOMY,
  FACADES,
  applyAction,
  canServe,
  createInitialState,
  secondsToTicks,
  serveCustomer,
  stationId,
  tick,
} from './index';
import type { BusinessType, GameState, Materials } from './index';

/** Jugador p1 dentro de lot1, que es suyo y tiene ese negocio con ese almacén. */
function withBusiness(business: BusinessType, storage: Materials = {}, price = 0): GameState {
  const state = createInitialState();
  const config = ECONOMY.businesses[business];
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
      lot1: {
        ...state.lots.lot1,
        ownerId: 'p1',
        ownerName: 'P1',
        business,
        facade: config.defaultFacade,
        storage,
        price,
        nextRentAt: state.tick + secondsToTicks(ECONOMY.rent.periodSeconds),
        nextProductionAt: state.tick + secondsToTicks(config.production?.seconds ?? 0),
      },
    },
    money: { p1: 0 },
  };
}

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
      avatars: { p1: { ...withBusiness(type).avatars.p1, sceneId: 'street' } },
      money: { p1: 1000 },
    };
    const next = applyAction(state, { type: 'RENT_LOT', avatarId: 'p1', lotId: 'lot1', business: type });
    assert.equal(next.lots.lot1.business, type);
    const station = next.furniture[stationId('lot1')];
    assert.deepEqual({ defId: station.defId, x: station.x, y: station.y }, stations[type]);
  }
});
