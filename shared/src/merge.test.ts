// Lo que la fusión de los dos ordenadores no debe perder: el contenido de cada
// lado y las reglas nuevas donde los dos lados se tocan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testPlayer, withBusiness } from './testHelpers';
import {
  applyAction,
  CATALOG,
  createInitialState,
  createLot,
  dailyDeal,
  DEFAULT_LOOK,
  ECONOMY,
  isNpcId,
  normalizeLook,
  releaseNpcLots,
  sanitizeLook,
  SCENES,
  SUPPLIER_MATERIAL_IDS,
  stationId,
  tick,
  type FurniId,
  type GameState,
  type Outfit,
} from './index';

/** Muebles y estructuras que añadió cada lado desde a43bb81. */
const BOTH_SIDES_DEF_IDS: FurniId[] = [
  // a43bb81..master
  'bar_counter', 'beer_barrel', 'dartboard', 'arcade_machine', 'pinball',
  'cotton_bed', 'bar_tap', 'token_machine', 'sewing_machine', 'clothes_rack',
  // a43bb81..origin/master
  'bed', 'sofa', 'radio', 'rocking_chair', 'open_sign', 'milkshake_machine', 'cow_skull',
  'solar', 'gas_counter', 'minimart_shelf', 'soda_machine', 'arcade_cabinet', 'notice_board',
  'name_sign', 'golden_jukebox',
  'pink_flamingo', 'lava_lamp', 'wagon_wheel', 'gas_pump', 'neon_cactus', 'retro_tv',
  'oil_drum', 'engine_block', 'scrap_robot', 'water_bucket', 'hand_pump', 'windmill',
  'seed_sacks', 'flower_box', 'scarecrow', 'toolbox', 'sawhorse', 'tool_rack',
  'cash_register', 'gift_boxes', 'mannequin', 'menu_board', 'pie_stand', 'neon_burger',
  'barber_pole', 'standing_mirror', 'hair_dryer', 'orange_crate', 'watermelons', 'old_scale',
  'mayor_statue', 'fountain', 'park_bench', 'bus',
];

const OUTFIT: Outfit = { head: { type: 'cap', color: '#d94040' } };

/** p1 dentro del taller de lot1 (público), y p2 como dueño: p1 es el cliente. */
function publicWorkshop(): GameState {
  const state = withBusiness('workshop', {}, 1);
  return {
    ...state,
    lots: { ...state.lots, lot1: { ...state.lots.lot1, ownerId: 'p2', ownerName: 'P2' } },
    money: { p1: 100, p2: 0 },
    materials: { p1: { tires: 10, sheet_metal: 10, old_wood: 10, tokens: 0 } },
  };
}

test('the merged catalog keeps every furniture id from both sides', () => {
  for (const id of BOTH_SIDES_DEF_IDS) assert.ok(CATALOG[id], id);
});

test('a new world has no NPC-owned lots and keeps the vendor neighbors', () => {
  const state = createInitialState();
  assert.equal(Object.values(state.lots).filter((l) => isNpcId(l.ownerId)).length, 0);
  for (const id of Object.keys(ECONOMY.vendors)) assert.ok(state.avatars[id], id);
});

test('releaseNpcLots leaves player money, inventories and lots untouched', () => {
  const state = createInitialState();
  const lot7 = { ...createLot('lot7', 'Local 7'), ownerId: 'p1', ownerName: 'P1', business: 'greenhouse' as const, level: 3 };
  const built = { ...createLot('lot-e1', 'Local E1'), ownerId: 'p1', ownerName: 'P1', business: 'store' as const, builtBy: 'p1', readyAt: 0, level: 3 };
  const before: GameState = {
    ...state,
    lots: {
      ...state.lots,
      lot4: { ...state.lots.lot4, ownerId: 'npc-rosa', ownerName: 'Rosa', business: 'store', facade: 'boutique' },
      lot7,
      'lot-e1': built,
    },
    money: { p1: 1234, 'npc-rosa': 50 },
    inventories: { p1: [{ id: 'i1', defId: 'tire' }], 'npc-rosa': [] },
  };
  const next = releaseNpcLots(before);
  assert.equal(next.lots.lot4.ownerId, null);
  assert.equal(next.money['npc-rosa'], undefined);
  assert.strictEqual(next.money.p1, 1234);
  assert.strictEqual(next.inventories.p1, before.inventories.p1);
  assert.strictEqual(next.lots.lot7, lot7);
  assert.strictEqual(next.lots['lot-e1'], built);
});

test('a public workshop lets others craft furniture for a fee, but not materials', () => {
  const state = publicWorkshop();
  const crafted = applyAction(state, { type: 'CRAFT', avatarId: 'p1', lotId: 'lot1', recipe: 'tire' });
  assert.equal(crafted.lots.lot1.jobs.length, 1);
  assert.equal(crafted.lots.lot1.jobs[0].by, 'p1');
  assert.ok(crafted.money.p2 > 0);

  const materials = applyAction(state, { type: 'CRAFT', avatarId: 'p1', lotId: 'lot1', recipe: 'tokens' });
  assert.equal(materials, state);
});

test('closing a workshop gives each job back, also materials and garments', () => {
  const state = withBusiness('workshop');
  const { tokens } = ECONOMY.materialRecipes;
  const closing: GameState = {
    ...state,
    lots: {
      ...state.lots,
      lot1: {
        ...state.lots.lot1,
        jobs: [
          { material: 'tokens', readyAt: state.tick },
          { material: 'tokens', readyAt: state.tick + 1000 },
          { garment: 'cap', color: '#d94040', readyAt: state.tick },
          { defId: 'tire', readyAt: state.tick },
        ],
      },
    },
    inventories: { p1: [] },
  };
  const next = applyAction(closing, { type: 'CLOSE_BUSINESS', avatarId: 'p1', lotId: 'lot1' });
  assert.equal(next.lots.lot1.ownerId, null);
  // Fichas hechas, y lo que gastó la que iba a medias.
  assert.equal(next.materials.p1?.tokens, tokens.quantity);
  for (const [material, qty] of Object.entries(tokens.materials)) {
    assert.equal(next.materials.p1?.[material as keyof typeof tokens.materials], qty);
  }
  assert.deepEqual(
    next.inventories.p1.map((i) => ('garment' in i ? i.garment : i.defId)),
    ['cap', 'tire'],
  );
});

test('the look keeps both the rank hat and the garments', () => {
  const look = { ...DEFAULT_LOOK, hat: true, outfit: OUTFIT };
  assert.equal(normalizeLook(look), null);
  assert.deepEqual(normalizeLook(look, true), look);
  assert.deepEqual(sanitizeLook(look, false), { ...DEFAULT_LOOK, outfit: OUTFIT });
  assert.deepEqual(sanitizeLook(look, true), look);
});

test('a player keeps a saved hat only with the rank, and garments only if owned', () => {
  const look = { ...DEFAULT_LOOK, hat: true, outfit: OUTFIT };
  const state = createInitialState();
  const avatar = { ...testPlayer('street'), look };
  const owned = { ...state, inventories: { p1: [{ id: 'g1', garment: 'cap' as const, color: '#d94040' }] } };
  const joined = applyAction(owned, { type: 'JOIN', avatar });
  assert.deepEqual(joined.avatars.p1.look, { ...DEFAULT_LOOK, outfit: OUTFIT });
});

test('the supplier only deals in what it stocks', () => {
  for (let day = 0; day < 30; day++) {
    const { cheap, pricey } = dailyDeal(day * 864000);
    assert.ok(SUPPLIER_MATERIAL_IDS.includes(cheap));
    assert.ok(SUPPLIER_MATERIAL_IDS.includes(pricey));
  }
  const base = createInitialState();
  const state: GameState = {
    ...base,
    avatars: { p1: testPlayer(SCENES.gas) },
    money: { p1: 1000 },
    materials: { p1: { fabric: 5 } },
  };
  assert.equal(applyAction(state, { type: 'SELL_MATERIAL', avatarId: 'p1', material: 'fabric', quantity: 1 }), state);
  assert.equal(applyAction(state, { type: 'BUY_MATERIAL', avatarId: 'p1', material: 'fabric', quantity: 1 }), state);
  assert.notEqual(applyAction(state, { type: 'BUY_MATERIAL', avatarId: 'p1', material: 'water', quantity: 1 }), state);
});

for (const business of ['cotton_field', 'clothing', 'bar', 'arcade'] as const) {
  test(`${business} can be upgraded and gets a new station`, () => {
    const start = withBusiness(business);
    const opened: GameState = {
      ...start,
      lots: { ...start.lots, lot1: { ...start.lots.lot1, ownerId: null, ownerName: null, business: null } },
      money: { p1: 10000 },
      materials: { p1: { sheet_metal: 50, old_wood: 50 } },
    };
    const rented = applyAction(opened, { type: 'RENT_LOT', avatarId: 'p1', lotId: 'lot1', business });
    assert.ok(rented.furniture[stationId('lot1')]);
    const upgrading = applyAction(rented, { type: 'UPGRADE_LOT', avatarId: 'p1', lotId: 'lot1' });
    assert.ok(upgrading.lots.lot1.upgradeReadyAt);
    // Fuera del local para no estorbar, y con la obra a punto de acabar.
    const done = tick({ ...upgrading, avatars: {}, tick: upgrading.lots.lot1.upgradeReadyAt! - 1 });
    assert.equal(done.lots.lot1.level, 2);
    assert.ok(done.furniture[stationId('lot1', 2)]);
  });
}

