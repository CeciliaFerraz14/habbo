// La carga de un mundo guardado con la forma que tiene producción (filas
// inventadas, sin datos reales): locales alquilados, de parcela, construidos y
// de NPC. Ver el commit de las migraciones 010 y 011.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialState, lotBuildingId, releaseNpcLots, SCENES } from '@juego/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows, furnitureChanges, Persistence, worldFromRows, type WorldRows } from './persistence';

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

/** Fuente de páginas falsa: como .range(from, to), con los dos extremos incluidos. */
function pageSource(total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: `row-${i}` }));
  const ranges: [number, number][] = [];
  const fetchPage = async (from: number, to: number) => {
    ranges.push([from, to]);
    return { data: rows.slice(from, to + 1), error: null };
  };
  return { rows, ranges, fetchPage };
}

test('fetchAllRows reads one short page and stops', async () => {
  const { rows, ranges, fetchPage } = pageSource(1);
  assert.deepEqual(await fetchAllRows(fetchPage, 'test', 2), rows);
  assert.deepEqual(ranges, [[0, 1]]);
});

test('fetchAllRows on an empty table asks once and returns nothing', async () => {
  const { ranges, fetchPage } = pageSource(0);
  assert.deepEqual(await fetchAllRows(fetchPage, 'test', 2), []);
  assert.deepEqual(ranges, [[0, 1]]);
});

test('fetchAllRows on an exact page boundary asks for one more page', async () => {
  const { rows, ranges, fetchPage } = pageSource(4);
  assert.deepEqual(await fetchAllRows(fetchPage, 'test', 2), rows);
  assert.deepEqual(ranges, [[0, 1], [2, 3], [4, 5]]);
});

test('fetchAllRows joins more than one page in order', async () => {
  const { rows, ranges, fetchPage } = pageSource(5);
  assert.deepEqual(await fetchAllRows(fetchPage, 'test', 2), rows);
  assert.deepEqual(ranges, [[0, 1], [2, 3], [4, 5]]);
});

test('fetchAllRows fails if any page fails, instead of returning a truncated list', async () => {
  const fetchPage = async (from: number) =>
    from === 0
      ? { data: [{ id: 'a' }, { id: 'b' }], error: null }
      : { data: null, error: { message: 'timeout' } };
  await assert.rejects(fetchAllRows(fetchPage, 'furniture', 2), /furniture.*timeout/);
});

/**
 * Supabase falso con lo que usa Persistence.load. Las tablas de `withoutGarment`
 * se comportan como sin la migración 010: pedir esas columnas devuelve un error.
 */
function fakeDb(tables: Record<string, Record<string, unknown>[]>, withoutGarment: string[] = []) {
  const selects: string[] = [];
  const orders: string[] = [];
  const db = {
    from: (table: string) => ({
      select: (columns: string) => {
        selects.push(`${table}:${columns}`);
        return {
          limit: async () =>
            withoutGarment.includes(table)
              ? { data: null, error: { message: `column ${table}.garment does not exist` } }
              : { data: [], error: null },
          maybeSingle: async () => ({ data: null, error: null }),
          order: (column: string) => {
            orders.push(`${table}:${column}`);
            return {
              range: async (from: number, to: number) => ({
                data: (tables[table] ?? []).slice(from, to + 1),
                error: null,
              }),
            };
          },
        };
      },
    }),
  };
  return { db: db as unknown as SupabaseClient, selects, orders };
}

test('load refuses to start without migration 010 and reads nothing else', async () => {
  const noInventoryColumns = fakeDb({}, ['inventory_items']);
  await assert.rejects(Persistence.load(noInventoryColumns.db), /migración 010.*inventory_items/);
  assert.deepEqual(noInventoryColumns.selects, ['inventory_items:garment,color']);

  const noFurnitureColumn = fakeDb({}, ['furniture']);
  await assert.rejects(Persistence.load(noFurnitureColumn.db), /migración 010.*furniture/);
  assert.deepEqual(noFurnitureColumn.selects, ['inventory_items:garment,color', 'furniture:garment']);
});

test('load reads every row of a table larger than the default max_rows', async () => {
  const items = Array.from({ length: 1201 }, (_, i) => ({ id: `i-${i}`, owner_id: ANA, def_id: 'tire', garment: null, color: null }));
  const { db, orders } = fakeDb({ profiles: [profileRow(ANA, 'Ana', 0)], inventory_items: items });

  const { state } = await Persistence.load(db);

  assert.equal(state.inventories[ANA].length, 1201);
  for (const table of ['lots', 'furniture', 'profiles', 'inventory_items']) {
    assert.ok(orders.includes(`${table}:id`), `${table} is ordered by id`);
  }
});
