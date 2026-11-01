// Mundo inicial de Pixel Springs: qué escenas hay, cómo se conectan y qué
// muebles y edificios tienen al empezar. En la fase 2 el servidor creará el
// mundo con esta misma función (o lo cargará de la base de datos).
//
// Plano de la calle (x hacia la derecha, y hacia abajo; en pantalla la
// carretera queda en diagonal):
//
//   y 0-3   [caravana 1]  [local1] ... [local6]  [gasolinera]  [Ensanche: solares]
//   y 4     acera con las puertas (D) de los edificios (la de la gasolinera, en x = 39)
//   y 5-6   acera (con farolas en y = 6)
//   y 7-9   carretera, con la línea central en y = 8
//   y 10-13 desierto con cactus, el cartel de bienvenida y la estatua del alcalde
//           (a la izquierda, x = 0-2, una carretera baja hasta la avenida)
//   y 14-23 AVENIDA DE LAS PLAZAS: igual que la Calle Mayor, 14 filas más abajo
//           (edificios, acera con las puertas en y = 18, carretera en y = 21-23)
//   y 24-31 al otro lado de la avenida, una plaza pequeña con fuente por cada 4 parcelas
//
// El pueblo CRECE con los jugadores, todo en el mismo mapa. El primero ocupa la
// caravana del principio de la calle. Los demás reciben su parcela (su
// caravana y un local nuevo) en la Avenida de las Plazas, una al lado de otra.
// Cada 4 parcelas forman una plaza (con su nombre y su fuente enfrente);
// cuando se llena, se abre la siguiente a su derecha y el mapa se ensancha.
// Los coches también pasan por la avenida y paran en sus tiendas. Ver addHome.
//
// Además, pasada la gasolinera, la calle sigue por el ENSANCHE: solares en
// venta donde los jugadores construyen locales propios. Siempre hay alguno
// libre; al construir en uno, aparece otro al final. Ver buildLot.
import {
  addMaterials,
  addNotice,
  buildingVariant,
  createLot,
  hasMaterials,
  secondsToTicks,
  setupNpcStores,
} from './economy';
import { ECONOMY } from './economy.config';
import { addXpFor } from './levels';
import type { Lot } from './economy';
import { setupNeighbors } from './npcs';
import type { Door, Scene } from './scene';
import type { FurniItem, GameState } from './types';

import { SCENES, trailerSceneId } from './world.ids';

export { SCENES, trailerSceneId };

/**
 * Escena en la que aparece un jugador al entrar: su propia caravana (el alias
 * 'trailer' se resuelve a `trailer:<id>` en el reducer), y en qué baldosa.
 */
export const START_SCENE = SCENES.trailer;
export const START_TILE = { x: 6, y: 3 };


/** Ancho de la calle (hasta la gasolinera y el paso a la plaza). */
const STREET_WIDTH = 44;
const STREET_DEPTH = 14;

/** Coordenada x de los 6 locales del pueblo original (todos en y = 0, de 4x4 baldosas). */
const BASE_LOT_XS = [8, 13, 18, 23, 28, 33];
/** Id del local número i (empezando en 1), que también es el id de su escena interior. */
export const lotId = (i: number) => `lot${i}`;
export const LOT_IDS = BASE_LOT_XS.map((_, i) => lotId(i + 1));

/** Ids del edificio y de la puerta de la caravana de un jugador. */
export const trailerBuildingId = (ownerId: string) => `trailer-building:${ownerId}`;
const trailerDoorId = (ownerId: string) => `door-trailer:${ownerId}`;

/** Una baldosa de puerta y dónde aparece quien llega por ella. */
interface DoorSpot {
  x: number;
  y: number;
  spawn: { x: number; y: number };
}

/** Suelo de las filas de una calle (Calle Mayor o avenida), contando desde su fila de edificios. */
function streetRowTile(row: number, x: number): string {
  if (row >= 4 && row <= 6) return 's'; // acera
  if (row === 7 || row === 9) return 'r'; // carriles
  if (row === 8) return x % 2 === 1 ? 'r' : '-'; // línea central, con raya cada dos baldosas
  return '.'; // arena
}

/**
 * Genera el mapa de suelo, fila a fila: la Calle Mayor arriba (con el ancho
 * que tenga el mapa) y, si hay `plazas` abiertas, la carretera que baja por la
 * izquierda, la Avenida de las Plazas y, enfrente, las plazas (losas y,
 * alrededor de cada fuente, barro cocido) sobre la arena.
 */
function streetGround(width: number, plazas: number): string[] {
  const rows: string[] = [];
  const depth = plazas > 0 ? PLAZA_TOP + PLAZA_DEPTH : STREET_DEPTH;
  for (let y = 0; y < depth; y++) {
    let row = '';
    for (let x = 0; x < width; x++) {
      const p = plazaAt(x, y);
      if (y < AVENUE_DY) {
        // La carretera que baja a la avenida corta el desierto por la izquierda.
        row += plazas > 0 && y > 9 && x <= 2 ? 'r' : streetRowTile(y, x);
      } else if (y < PLAZA_TOP) {
        row += x <= 2 && y < AVENUE_DY + 7 ? 'r' : streetRowTile(y - AVENUE_DY, x);
      } else if (p !== null && p <= plazas) {
        const c = fountainSpot(p);
        row += Math.hypot(x - c.x - 1, y - c.y - 1) < 3.2 ? 'c' : 'p';
      } else {
        row += '.';
      }
    }
    rows.push(row);
  }
  return rows;
}

/** Puerta del local `id` en la escena de fuera (calle o plaza). */
function lotDoor(id: string, spot: DoorSpot): Door {
  return {
    id: `door-${id}`,
    ...spot,
    to: { sceneId: id, doorId: `${id}-exit` },
    buildingId: `${id}-building`,
    lotId: id,
  };
}

/** Interior del local `id`: una sala vacía de 8x8 con la puerta en la pared izquierda. */
function lotInterior(id: string, name: string, outsideSceneId: string): Scene {
  return {
    id,
    name,
    kind: 'interior',
    theme: 'adobe',
    width: 8,
    depth: 8,
    doors: [
      {
        id: `${id}-exit`,
        x: 0,
        y: 5,
        spawn: { x: 1, y: 5 },
        to: { sceneId: outsideSceneId, doorId: `door-${id}` },
      },
    ],
  };
}

/** Edificio del local `id` (con tablones mientras está en alquiler). */
function lotBuilding(id: string, sceneId: string, x: number, y: number, rotation: 0 | 1, variant = 'closed'): FurniItem {
  return { id: `${id}-building`, sceneId, defId: 'shop', x, y, rotation, variant };
}

/** Puerta de la calle del local n del pueblo original (en la acera, frente a su tercera baldosa). */
const baseLotSpot = (x: number): DoorSpot => ({ x: x + 2, y: 4, spawn: { x: x + 2, y: 5 } });

function createScenes(): Scene[] {
  const s = SCENES.street;

  // Puertas de la calle: la gasolinera y una por local. Las de las caravanas
  // se añaden con cada jugador (addHome).
  const streetDoors: Door[] = [
    {
      id: 'street-gas',
      x: 39,
      y: 4,
      spawn: { x: 39, y: 5 },
      to: { sceneId: SCENES.gas, doorId: 'gas-exit' },
      buildingId: 'gas-station',
    },
    ...BASE_LOT_XS.map((x, i) => lotDoor(lotId(i + 1), baseLotSpot(x))),
  ];
  const lotInteriors = BASE_LOT_XS.map((_, i) => lotInterior(lotId(i + 1), `Local ${i + 1}`, s));

  return [
    {
      id: s,
      name: 'Calle Mayor',
      kind: 'street',
      width: STREET_WIDTH,
      depth: STREET_DEPTH,
      doors: streetDoors,
      ground: streetGround(STREET_WIDTH, 0),
    },
    ...lotInteriors,
    // El minimarket de la gasolinera: Hank, el mostrador y las máquinas.
    {
      id: SCENES.gas,
      name: 'Gasolinera de Hank',
      kind: 'interior',
      theme: 'minimart',
      width: 8,
      depth: 6,
      doors: [
        {
          id: 'gas-exit',
          x: 0,
          y: 4,
          spawn: { x: 1, y: 4 },
          to: { sceneId: s, doorId: 'street-gas' },
        },
      ],
    },
  ];
}

/**
 * Muebles fijos del minimarket. Hank está detrás del mostrador, en (3, 0).
 * Al hacer clic: el mostrador abre la tienda de Hank, el tablón muestra lo que
 * pasa en el pueblo y las máquinas venden un refresco o una partida.
 */
function createGasInterior(): FurniItem[] {
  const g = SCENES.gas;
  return [
    { id: 'gas-counter', sceneId: g, defId: 'gas_counter', x: 2, y: 1, rotation: 1 },
    { id: 'gas-soda', sceneId: g, defId: 'soda_machine', x: 6, y: 0, rotation: 1 },
    { id: 'gas-arcade', sceneId: g, defId: 'arcade_cabinet', x: 7, y: 0, rotation: 1 },
    { id: 'gas-board', sceneId: g, defId: 'notice_board', x: 0, y: 1, rotation: 0 },
    { id: 'gas-shelf-1', sceneId: g, defId: 'minimart_shelf', x: 4, y: 3, rotation: 1 },
    { id: 'gas-shelf-2', sceneId: g, defId: 'minimart_shelf', x: 6, y: 3, rotation: 1 },
  ];
}

/** Edificios y decoración fija de la calle. */
function createStreetStructures(): FurniItem[] {
  const s = SCENES.street;
  const items: FurniItem[] = [
    // Con rotación 1 la fachada mira a la carretera (+y).
    { id: 'gas-station', sceneId: s, defId: 'gas_station', x: 38, y: 0, rotation: 1 },
    { id: 'welcome-sign', sceneId: s, defId: 'welcome_sign', x: 4, y: 11, rotation: 1 },
    ...BASE_LOT_XS.map((x, i) => lotBuilding(lotId(i + 1), s, x, 0, 1)),
  ];

  // Farolas a lo largo de la acera, junto al bordillo.
  [6, 16, 26, 36].forEach((x, i) => {
    items.push({ id: `lamp-${i}`, sceneId: s, defId: 'street_lamp', x, y: 6, rotation: 0 });
  });

  // Cactus en el desierto y en los huecos entre edificios.
  const cacti = [
    [6, 2], [12, 2], [7, 13], [9, 11], [14, 13], [20, 11],
    [25, 12], [31, 13], [35, 11], [41, 12],
  ];
  cacti.forEach(([x, y], i) => {
    items.push({ id: `cactus-${i}`, sceneId: s, defId: 'saguaro', x, y, rotation: 0 });
  });

  return items;
}

/**
 * La caravana de un jugador: escena propia y muebles con los que empieza.
 *
 * Es larga y estrecha, con la puerta en mitad de la pared larga (y = 0), como
 * se ve desde fuera. Empieza amueblada con una "dinette" (dos sillones de diner
 * enfrentados con una mesa en medio) a un lado y la cocina al otro.
 *
 * Los ids de los muebles llevan delante el id del dueño para que no choquen
 * con los de otras caravanas.
 */
export function createTrailer(ownerId: string, ownerName: string) {
  const id = trailerSceneId(ownerId);
  const scene: Scene = {
    id,
    name: `Caravana de ${ownerName}`,
    kind: 'interior',
    theme: 'trailer',
    width: 12,
    depth: 5,
    doors: [
      {
        id: 'trailer-exit',
        x: 6,
        y: 0,
        spawn: { x: 6, y: 1 },
        to: { sceneId: SCENES.street, doorId: trailerDoorId(ownerId) },
      },
    ],
  };
  const f = (n: number, item: Omit<FurniItem, 'id' | 'sceneId'>): FurniItem => ({
    id: `${ownerId}:f${n}`,
    sceneId: id,
    ...item,
  });
  const furniture: FurniItem[] = [
    f(1, { defId: 'diner_booth', x: 0, y: 1, rotation: 0 }),
    f(2, { defId: 'formica_table', x: 1, y: 1, rotation: 0 }),
    f(3, { defId: 'diner_booth', x: 2, y: 1, rotation: 2 }),
    f(4, { defId: 'neon_lamp', x: 4, y: 0, rotation: 1 }),
    f(5, { defId: 'jukebox', x: 9, y: 0, rotation: 1 }),
    f(6, { defId: 'vintage_fridge', x: 11, y: 0, rotation: 1 }),
    f(7, { defId: 'bar_stool', x: 10, y: 3, rotation: 3 }),
    f(8, { defId: 'potted_cactus', x: 0, y: 4, rotation: 0 }),
  ];
  return { scene, furniture };
}

// --- Avenida de las Plazas y parcelas -------------------------------------------------

/** Filas que hay entre la Calle Mayor y la avenida (la avenida es una copia suya, más abajo). */
const AVENUE_DY = 14;
/** Columna de la primera parcela de la avenida (a la izquierda queda la carretera que baja). */
const AVENUE_X0 = 4;
/** Ancho de una parcela: caravana (5), hueco, local (4) y hueco. */
const HOME_WIDTH = 11;
const HOMES_PER_PLAZA = 4;
/** Ancho de lo que ocupa una plaza en la avenida (sus 4 parcelas). */
const PLAZA_WIDTH = HOMES_PER_PLAZA * HOME_WIDTH;
/** Fila donde empiezan las plazas (al otro lado de la carretera de la avenida) y su fondo. */
const PLAZA_TOP = AVENUE_DY + 10;
const PLAZA_DEPTH = 8;

/** Esquina superior izquierda del tramo de avenida de la plaza número p (empezando en 1). */
function plazaOrigin(p: number): { x: number; y: number } {
  return { x: AVENUE_X0 + (p - 1) * PLAZA_WIDTH, y: AVENUE_DY };
}

/** Baldosa de la fuente (2x2) de la plaza número p: en el centro de su tramo, enfrente de la avenida. */
function fountainSpot(p: number): { x: number; y: number } {
  return { x: plazaOrigin(p).x + PLAZA_WIDTH / 2 - 1, y: PLAZA_TOP + PLAZA_DEPTH / 2 - 1 };
}

/** Número de la plaza en la que cae la baldosa (x, y) de la avenida o de su plaza, o null. */
function plazaAt(x: number, y: number): number | null {
  if (y < AVENUE_DY || y >= PLAZA_TOP + PLAZA_DEPTH || x < AVENUE_X0) return null;
  const p = Math.floor((x - AVENUE_X0) / PLAZA_WIDTH) + 1;
  // En la fila de las plazas, solo las losas de alrededor de la fuente.
  if (y >= PLAZA_TOP && Math.abs(x - fountainSpot(p).x) > 7) return null;
  return p;
}

/** Nombres de las plazas, en el orden en que se abren (luego, "Plaza 7", "Plaza 8"...). */
const PLAZA_NAMES = [
  'Plaza del Pueblo',
  'Plaza del Cactus',
  'Plaza del Pozo',
  'Plaza de la Diligencia',
  'Plaza del Coyote',
  'Plaza del Sol',
];

/**
 * Nombre de la zona de la calle en la que está la baldosa (x, y): el Ensanche
 * o la plaza (su tramo de avenida o la propia plaza), para el cartel de dónde
 * estás. null en la Calle Mayor.
 */
export function areaNameAt(state: GameState, x: number, y: number): string | null {
  if (y <= 6 && x >= SOLAR_X0 - 1) return 'El Ensanche';
  const p = plazaAt(x, y);
  if (p === null || !state.furniture[`plaza-${p}:fountain`]) {
    const onAvenue = y >= AVENUE_DY && y < PLAZA_TOP && state.furniture['plaza-1:fountain'];
    return onAvenue ? 'Avenida de las Plazas' : null;
  }
  return PLAZA_NAMES[p - 1] ?? `Plaza ${p}`;
}

/** Plaza de la parcela `slot` (0 = la calle, sin plaza). */
const plazaOfSlot = (slot: number) => (slot === 0 ? 0 : Math.floor((slot - 1) / HOMES_PER_PLAZA) + 1);

/**
 * Dónde va cada cosa de la parcela `slot`. La 0, al principio de la Calle
 * Mayor (solo caravana). Las demás, en la avenida, una al lado de otra:
 * caravana y local con la fachada hacia la carretera (+y), como en la calle.
 */
function homeLayout(slot: number): {
  trailer: { x: number; y: number; rotation: 0 | 1 };
  trailerDoor: DoorSpot;
  lot: { x: number; y: number; rotation: 0 | 1 } | null;
  lotDoor: DoorSpot | null;
} {
  if (slot === 0) {
    return {
      trailer: { x: 1, y: 1, rotation: 1 },
      trailerDoor: { x: 3, y: 4, spawn: { x: 3, y: 5 } },
      lot: null,
      lotDoor: null,
    };
  }
  const x = AVENUE_X0 + (slot - 1) * HOME_WIDTH;
  const door = AVENUE_DY + 4;
  return {
    trailer: { x, y: AVENUE_DY + 1, rotation: 1 },
    trailerDoor: { x: x + 2, y: door, spawn: { x: x + 2, y: door + 1 } },
    lot: { x: x + 6, y: AVENUE_DY, rotation: 1 },
    lotDoor: { x: x + 8, y: door, spawn: { x: x + 8, y: door + 1 } },
  };
}

/** Fuente, bancos y farolas de la plaza número p, y las farolas de su tramo de avenida. */
function plazaDecor(p: number): FurniItem[] {
  const o = plazaOrigin(p);
  const c = fountainSpot(p);
  const f = (id: string, item: Omit<FurniItem, 'id' | 'sceneId'>): FurniItem => ({
    ...item,
    id: `plaza-${p}:${id}`,
    sceneId: SCENES.street,
  });
  return [
    f('fountain', { defId: 'fountain', x: c.x, y: c.y, rotation: 0 }),
    // Bancos mirando a la fuente
    f('bench-w', { defId: 'park_bench', x: c.x - 3, y: c.y, rotation: 0 }),
    f('bench-e', { defId: 'park_bench', x: c.x + 4, y: c.y, rotation: 2 }),
    f('bench-s', { defId: 'park_bench', x: c.x, y: c.y + 3, rotation: 3 }),
    // Farolas en las esquinas de la plaza
    f('lamp-1', { defId: 'street_lamp', x: c.x - 5, y: c.y - 2, rotation: 0 }),
    f('lamp-2', { defId: 'street_lamp', x: c.x + 6, y: c.y - 2, rotation: 0 }),
    f('lamp-3', { defId: 'street_lamp', x: c.x - 5, y: c.y + 3, rotation: 0 }),
    f('lamp-4', { defId: 'street_lamp', x: c.x + 6, y: c.y + 3, rotation: 0 }),
    // Farolas de la avenida, en el bordillo entre parcela y parcela
    ...[0, 1, 2, 3].map((k) =>
      f(`street-lamp-${k}`, { defId: 'street_lamp', x: o.x + k * HOME_WIDTH + 5, y: AVENUE_DY + 6, rotation: 0 }),
    ),
    // Cactus a los lados de la plaza
    f('cactus-1', { defId: 'saguaro', x: c.x - 11, y: c.y + 1, rotation: 0 }),
    f('cactus-2', { defId: 'saguaro', x: c.x + 12, y: c.y + 2, rotation: 0 }),
  ];
}

/**
 * Abre la plaza número p (y las anteriores, si faltan): su suelo y su
 * decoración. El mapa se ensancha (y se alarga) para que quepa, y la
 * carretera sigue hasta el final. Las parcelas se añaden luego.
 */
function ensurePlaza(state: GameState, p: number): GameState {
  if (state.furniture[`plaza-${p}:fountain`]) return state;
  const next = p > 1 ? ensurePlaza(state, p - 1) : state;
  const street = next.scenes[SCENES.street];
  const width = Math.max(street.width, plazaOrigin(p).x + PLAZA_WIDTH);
  const ground = streetGround(width, p);
  const furniture = { ...next.furniture };
  for (const item of plazaDecor(p)) furniture[item.id] = item;
  return {
    ...next,
    furniture,
    scenes: { ...next.scenes, [SCENES.street]: { ...street, width, depth: ground.length, ground } },
  };
}

/**
 * Da a un jugador su parcela: su caravana (con su puerta, que lleva a su
 * caravana por dentro; cualquiera puede entrar de visita) y, desde la segunda
 * parcela, un local nuevo. La primera está al principio de la Calle Mayor; las
 * demás, en las plazas (que se abren cuando hacen falta). Todo en el mismo
 * mapa. Se llama al entrar un jugador por primera vez (JOIN) y al cargar el
 * mundo guardado.
 */
export function addHome(state: GameState, playerId: string, slot: number): GameState {
  if (state.homes[playerId] !== undefined) return state;
  const p = plazaOfSlot(slot);
  const next = p > 0 ? ensurePlaza(state, p) : state;
  const layout = homeLayout(slot);

  const s = SCENES.street;
  const scene = next.scenes[s];
  const furniture = { ...next.furniture };
  const scenes = { ...next.scenes };
  const doors: Door[] = [
    ...scene.doors,
    {
      id: trailerDoorId(playerId),
      ...layout.trailerDoor,
      to: { sceneId: trailerSceneId(playerId), doorId: 'trailer-exit' },
      buildingId: trailerBuildingId(playerId),
    },
  ];
  furniture[trailerBuildingId(playerId)] = { id: trailerBuildingId(playerId), sceneId: s, defId: 'trailer', ...layout.trailer };
  let lots: Record<string, Lot> = next.lots;
  if (layout.lot && layout.lotDoor) {
    const n = BASE_LOT_XS.length + slot;
    const { x, y, rotation } = layout.lot;
    const building = lotBuilding(lotId(n), s, x, y, rotation);
    furniture[building.id] = building;
    doors.push(lotDoor(lotId(n), layout.lotDoor));
    scenes[lotId(n)] = lotInterior(lotId(n), `Local ${n}`, s);
    // Si el local ya existía (mundo guardado), se conserva tal cual.
    if (!lots[lotId(n)]) lots = { ...lots, [lotId(n)]: createLot(lotId(n), `Local ${n}`) };
  }
  scenes[s] = { ...scene, doors };
  return { ...next, scenes, furniture, lots, homes: { ...next.homes, [playerId]: slot } };
}

/** Primera parcela libre (la siguiente a la última dada). */
export function nextHomeSlot(state: GameState): number {
  const slots = Object.values(state.homes);
  return slots.length === 0 ? 0 : Math.max(...slots) + 1;
}

// --- El Ensanche: solares para construir locales ------------------------------------

/** Columna del primer solar (pasada la gasolinera) y distancia entre solares. */
const SOLAR_X0 = 45;
const SOLAR_STEP = 5;

/** Id del local construido en el solar k (empezando en 0), y del cartel del solar. */
export const builtLotId = (k: number) => `lot-e${k + 1}`;
const solarItemId = (k: number) => `solar-${k}`;

/** Número de solar de un cartel de solar (o null si el mueble no es uno). */
export function solarOf(itemId: string): number | null {
  const m = /^solar-(\d+)$/.exec(itemId);
  return m ? Number(m[1]) : null;
}

/** Número de solar de un local construido (o null si no lo es). */
export function solarOfLot(lotId: string): number | null {
  const m = /^lot-e(\d+)$/.exec(lotId);
  return m ? Number(m[1]) - 1 : null;
}

/** Plazas abiertas (para regenerar el suelo de la calle). */
function openPlazas(state: GameState): number {
  let p = 0;
  while (state.furniture[`plaza-${p + 1}:fountain`]) p++;
  return p;
}

/**
 * Pone los carteles de los solares libres: tantos como haga falta para que
 * haya ECONOMY.building.freeSolares a la venta (y los huecos que alguien se
 * haya saltado). La calle se alarga para que quepan.
 */
function ensureSolares(state: GameState): GameState {
  const built = Object.keys(state.lots)
    .map(solarOfLot)
    .filter((k): k is number => k !== null);
  const total = Math.max(built.length + ECONOMY.building.freeSolares, Math.max(-1, ...built) + 1);
  const furniture = { ...state.furniture };
  for (let k = 0; k < total; k++) {
    if (state.lots[builtLotId(k)] || furniture[solarItemId(k)]) continue;
    furniture[solarItemId(k)] = {
      id: solarItemId(k),
      sceneId: SCENES.street,
      defId: 'solar',
      x: SOLAR_X0 + k * SOLAR_STEP,
      y: 0,
      rotation: 1,
    };
  }
  const street = state.scenes[SCENES.street];
  const width = Math.max(street.width, SOLAR_X0 + total * SOLAR_STEP);
  const scenes =
    width === street.width
      ? state.scenes
      : { ...state.scenes, [SCENES.street]: { ...street, width, ground: streetGround(width, openPlazas(state)) } };
  return { ...state, furniture, scenes };
}

/**
 * Pone en el mapa el local construido en el solar k: su edificio (en obras
 * hasta readyAt), su puerta y su interior. Quita el cartel del solar y abre
 * otro solar si hace falta. Se usa al construir y al cargar el mundo guardado.
 */
export function addBuiltLot(state: GameState, k: number, builtBy: string, readyAt: number): GameState {
  const id = builtLotId(k);
  const label = `Ensanche ${k + 1}`;
  const x = SOLAR_X0 + k * SOLAR_STEP;
  const s = SCENES.street;
  const lot = state.lots[id] ?? { ...createLot(id, label), builtBy, readyAt };
  const furniture = { ...state.furniture };
  delete furniture[solarItemId(k)];
  furniture[`${id}-building`] = lotBuilding(id, s, x, 0, 1, buildingVariant(lot, state.tick));
  const street = state.scenes[s];
  const scenes = {
    ...state.scenes,
    [s]: { ...street, doors: [...street.doors.filter((d) => d.lotId !== id), lotDoor(id, baseLotSpot(x))] },
    [id]: lotInterior(id, label, s),
  };
  return ensureSolares({ ...state, furniture, scenes, lots: { ...state.lots, [id]: lot } });
}

/**
 * Construir un local en el solar k: se pagan el precio y los materiales de
 * ECONOMY.building, empieza la obra y el local será de quien lo construye.
 */
export function buildLot(state: GameState, avatarId: string, k: number): GameState {
  const avatar = state.avatars[avatarId];
  const { price, materials, seconds } = ECONOMY.building;
  const money = state.money[avatarId] ?? 0;
  const mine = state.materials[avatarId] ?? {};
  if (!avatar || avatar.isBot || !Number.isInteger(k) || !state.furniture[solarItemId(k)]) return state;
  if (money < price || !hasMaterials(mine, materials)) return state;

  let next: GameState = {
    ...state,
    money: { ...state.money, [avatarId]: money - price },
    materials: { ...state.materials, [avatarId]: addMaterials(mine, materials, -1) },
  };
  next = addBuiltLot(next, k, avatarId, state.tick + secondsToTicks(seconds));
  next = addNotice(next, avatarId, `¡Empieza la obra del Ensanche ${k + 1}! Estará lista en ${Math.round(seconds / 60)} minutos.`);
  return addXpFor(next, avatarId, 'build');
}

export function createInitialState(): GameState {
  // Las caravanas de los jugadores se crean al entrar cada uno (JOIN).
  const furniture = [...createStreetStructures(), ...createGasInterior()];
  const state: GameState = {
    scenes: Object.fromEntries(createScenes().map((s) => [s.id, s])),
    avatars: {},
    furniture: Object.fromEntries(furniture.map((f) => [f.id, f])),
    inventories: {},
    messages: [],
    lots: Object.fromEntries(LOT_IDS.map((id, i) => [id, createLot(id, `Local ${i + 1}`)])),
    money: {},
    materials: {},
    subsidies: {},
    lastPositions: {},
    homes: {},
    progress: {},
    mayors: [],
    orders: [],
    nextOrderAt: 0,
    gasPlayers: {},
    pinballRecord: null,
    nextBusAt: 0,
    tick: 0,
    seed: 20240917,
    npcs: {},
    vehicles: {},
    nextCarAt: 0,
    notices: [],
    nextId: 100,
  };
  // Las tiendas de los NPC abren desde el principio, los vecinos salen a la
  // calle y Hank se pone detrás de su mostrador.
  // Y al final de la calle, los solares del Ensanche.
  return ensureSolares(setupNeighbors(setupNpcStores(state)));
}
