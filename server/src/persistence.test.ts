// La carga de un mundo guardado con la forma que tiene producción (filas
// inventadas, sin datos reales): locales alquilados, de parcela, construidos y
// de NPC. Ver el commit de las migraciones 010 y 011.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialState, lotBuildingId, releaseNpcLots, SCENES } from '@juego/shared';
import { furnitureChanges, worldFromRows, type WorldRows } from './persistence';

const ANA = '11111111-1111-4111-8111-111111111111';
const BEA = '22222222-2222-4222-8222-222222222222';
const TICK = 500_000;

/** Fila de lots como la devuelve Supabase (next_restock_at incluida: aún existe). */
function lotRow(id: string, label: string, fields: Record<string, unknown> = {}) {
  return {
    id,
    label,
    owner_id: null,
    owner_name: null,
    business: null,
    facade: null,
    storage: {},
    jobs: [],
    service_price: 0,
    next_production_at: 0,
    next_restock_at: 0,
    next_rent_at: 0,
    built_by: null,
    ready_at: 0,
    level: 1,
    upgrade_ready_at: 0,
    ...fields,
  };
}

function furniRow(id: string, sceneId: string) {
  return { id, scene_id: sceneId, def_id: 'tire', x: 2, y: 2, rotation: 0, variant: null, price: 26, garment: null };
}

function profileRow(id: string, name: string, homeSlot: number) {
  return {
    id,
    name,
    look: { hair: '#000000', skin: '#ffffff', shirt: '#ffffff', pants: '#000000' },
    money: 1000,
    materials: {},
    next_subsidy_at: 0,
    gas_station: {},
    progress: {},
    home_slot: homeSlot,
    last_position: null,
    created_at: '2026-01-01T00:00:00Z',
  };
}

const ROWS: WorldRows = {
  world: { id: 1, tick: TICK, seed: 7, next_id: 9000, gas: {} },
  profiles: [profileRow(ANA, 'Ana', 0), profileRow(BEA, 'Bea', 1)],
  lots: [
    lotRow('lot4', 'Local 4', { owner_id: 'npc-rosa', owner_name: 'Rosa', business: 'store', facade: 'boutique' }),
    lotRow('lot6', 'Local 6', { owner_id: 'npc-elmer', owner_name: 'Elmer', business: 'store', facade: 'boutique' }),
    lotRow('lot7', 'Local 7', { owner_id: BEA, owner_name: 'Bea', business: 'greenhouse', level: 3, next_rent_at: TICK + 100 }),
    lotRow('lot-e1', 'Ensanche 1', { owner_id: ANA, owner_name: 'Ana', business: 'diner', built_by: ANA, ready_at: 1000, level: 3 }),
    lotRow('lot-e3', 'Ensanche 3', { built_by: BEA, ready_at: 2000 }),
  ],
  furniture: [
    furniRow('f-npc-4', 'lot4'),
    furniRow('f-npc-6', 'lot6'),
    furniRow('f-lot7', 'lot7'),
    furniRow('f-e1', 'lot-e1'),
    furniRow('f-trailer', `trailer:${ANA}`),
  ],
  items: [
    { id: 'i-furni', owner_id: ANA, def_id: 'tire', garment: null, color: null },
    { id: 'i-garment', owner_id: ANA, def_id: null, garment: 'cap', color: '#d94040' },
  ],
};

/** El mundo tal como está guardado, y el que queda tras liberar los locales NPC (como en Persistence.load). */
function load() {
  const saved = worldFromRows(createInitialState(), ROWS);
  return { saved, state: releaseNpcLots(saved) };
}

test('a saved world with production shape loads intact', () => {
  const { state } = load();

  assert.equal(state.lots.lot7.ownerId, BEA);
  assert.equal(state.lots.lot7.business, 'greenhouse');
  assert.equal(state.lots.lot7.level, 3);
  assert.equal(state.furniture['f-lot7'].sceneId, 'lot7');
  assert.ok(state.scenes.lot7, 'the home plot rebuilds the interior of lot7');
  assert.ok(state.furniture[lotBuildingId('lot7')]);

  assert.equal(state.lots['lot-e1'].ownerId, ANA);
  assert.equal(state.lots['lot-e1'].business, 'diner');
  assert.equal(state.lots['lot-e1'].builtBy, ANA);
  assert.equal(state.lots['lot-e1'].level, 3);
  assert.equal(state.furniture['f-e1'].sceneId, 'lot-e1');

  assert.equal(state.lots['lot-e3'].ownerId, null);
  assert.equal(state.lots['lot-e3'].business, null);
  assert.equal(state.lots['lot-e3'].builtBy, BEA);
  assert.equal(state.lots['lot-e3'].level, undefined);

  for (const npcLot of ['lot4', 'lot6']) {
    assert.equal(state.lots[npcLot].ownerId, null);
    assert.equal(state.lots[npcLot].business, null);
    assert.equal(state.furniture[lotBuildingId(npcLot)].variant, 'closed');
  }

  const doors = state.scenes[SCENES.street].doors;
  for (const id of ['lot-e1', 'lot-e3']) {
    assert.ok(state.furniture[lotBuildingId(id)], `${id} building`);
    assert.ok(doors.some((d) => d.lotId === id), `${id} door`);
    assert.ok(state.scenes[id], `${id} interior`);
  }

  assert.deepEqual(state.inventories[ANA], [
    { id: 'i-furni', defId: 'tire' },
    { id: 'i-garment', garment: 'cap', color: '#d94040' },
  ]);
  assert.deepEqual(state.inventories[BEA], []);
});

test('the first save after loading only removes the furniture of NPC lots', () => {
  const { saved, state } = load();
  const { upserts, deletes } = furnitureChanges(saved, state);
  assert.deepEqual(deletes.sort(), ['f-npc-4', 'f-npc-6']);
  assert.deepEqual(upserts, []);

  const changedLots = Object.keys(state.lots).filter((id) => state.lots[id] !== saved.lots[id]);
  assert.deepEqual(changedLots.sort(), ['lot4', 'lot6']);
  assert.strictEqual(state.inventories[ANA], saved.inventories[ANA]);
  assert.strictEqual(state.money[ANA], saved.money[ANA]);
});
