// Mundo inicial de Pixel Springs: qué escenas hay, cómo se conectan y qué
// muebles y edificios tienen al empezar. En la fase 2 el servidor creará el
// mundo con esta misma función (o lo cargará de la base de datos).
//
// Plano de la calle (x hacia la derecha, y hacia abajo; en pantalla la
// carretera queda en diagonal):
//
//   y 0-3   [caravana 1]  [local1] ... [local6]  [gasolinera] [señal]
//   y 4     acera con las puertas (D) de los edificios (la de la gasolinera, en x = 39)
//   y 5-6   acera (con farolas en y = 6); al final, en x = 43, el paso a la plaza
//   y 7-9   carretera, con la línea central en y = 8
//   y 10-13 desierto con cactus, el cartel de bienvenida y la estatua del alcalde
//
// El pueblo CRECE con los jugadores. El primero ocupa la caravana del principio
// de la calle. Los demás reciben su parcela (su caravana y un local nuevo) en
// las PLAZAS: escenas cuadradas, al final de la calle, con edificios en los dos
// lados que se ven de frente (arriba y a la izquierda) y una fuente en medio.
// Caben 4 parcelas por plaza; cuando se llena, se abre la siguiente, a la que
// se llega por el sur. Ver addHome.
import { createLot, setupNpcStores } from './economy';
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

/** Genera el mapa de suelo de la calle, fila a fila. */
function streetGround(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < STREET_DEPTH; y++) {
    let tile: string;
    if (y >= 4 && y <= 6) tile = 's'; // acera
    else if (y === 7 || y === 9) tile = 'r'; // carriles
    else if (y === 8) tile = '-'; // línea central (con raya cada dos baldosas)
    else tile = '.'; // arena
    let row = '';
    for (let x = 0; x < STREET_WIDTH; x++) {
      row += tile === '-' && x % 2 === 1 ? 'r' : tile;
    }
    rows.push(row);
  }
  return rows;
}

/** Puerta del local número n en la escena de fuera (calle o plaza). */
function lotDoor(n: number, spot: DoorSpot): Door {
  const id = lotId(n);
  return {
    id: `door-${id}`,
    ...spot,
    to: { sceneId: id, doorId: `${id}-exit` },
    buildingId: `${id}-building`,
    lotId: id,
  };
}

/** Interior del local número n: una sala vacía de 8x8 con la puerta en la pared izquierda. */
function lotInterior(n: number, outsideSceneId: string): Scene {
  const id = lotId(n);
  return {
    id,
    name: `Local ${n}`,
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

/** Edificio del local número n (con tablones mientras está en alquiler). */
function lotBuilding(n: number, sceneId: string, x: number, y: number, rotation: 0 | 1): FurniItem {
  return { id: `${lotId(n)}-building`, sceneId, defId: 'shop', x, y, rotation, variant: 'closed' };
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
    ...BASE_LOT_XS.map((x, i) => lotDoor(i + 1, baseLotSpot(x))),
  ];
  const lotInteriors = BASE_LOT_XS.map((_, i) => lotInterior(i + 1, s));

  return [
    {
      id: s,
      name: 'Calle Mayor',
      kind: 'street',
      width: STREET_WIDTH,
      depth: STREET_DEPTH,
      doors: streetDoors,
      ground: streetGround(),
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
    { id: 'welcome-sign', sceneId: s, defId: 'welcome_sign', x: 1, y: 11, rotation: 1 },
    ...BASE_LOT_XS.map((x, i) => lotBuilding(i + 1, s, x, 0, 1)),
  ];

  // Farolas a lo largo de la acera, junto al bordillo.
  [6, 16, 26, 36].forEach((x, i) => {
    items.push({ id: `lamp-${i}`, sceneId: s, defId: 'street_lamp', x, y: 6, rotation: 0 });
  });

  // Cactus en el desierto y en los huecos entre edificios.
  const cacti = [
    [6, 2], [12, 2], [2, 12], [9, 11], [14, 13], [20, 11],
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
export function createTrailer(ownerId: string, ownerName: string, outsideSceneId: string = SCENES.street) {
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
        to: { sceneId: outsideSceneId, doorId: trailerDoorId(ownerId) },
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

// --- Plazas y parcelas --------------------------------------------------------------

/** Lado de cada plaza (cuadrada) y parcelas que caben en ella. */
const PLAZA_SIZE = 27;
const HOMES_PER_PLAZA = 4;
/** Nombres de las plazas, en el orden en que se abren (luego, "Plaza 7", "Plaza 8"...). */
const PLAZA_NAMES = [
  'Plaza del Pueblo',
  'Plaza del Cactus',
  'Plaza del Pozo',
  'Plaza de la Diligencia',
  'Plaza del Coyote',
  'Plaza del Sol',
];

/** Id de la escena de la plaza número p (empezando en 1). */
export const plazaId = (p: number) => `plaza-${p}`;

/** Paso de la calle a la primera plaza: en la acera, al final, pasada la gasolinera. */
const STREET_TO_PLAZA: DoorSpot = { x: STREET_WIDTH - 1, y: 5, spawn: { x: STREET_WIDTH - 2, y: 5 } };
/** Entrada de cada plaza (borde derecho, abajo) y salida a la siguiente (borde de abajo). */
const PLAZA_ENTRANCE: DoorSpot = { x: PLAZA_SIZE - 1, y: 22, spawn: { x: PLAZA_SIZE - 2, y: 22 } };
const PLAZA_EXIT: DoorSpot = { x: 13, y: PLAZA_SIZE - 1, spawn: { x: 13, y: PLAZA_SIZE - 2 } };

/**
 * Las 4 parcelas de una plaza: dos arriba (fachada hacia +y, rotación 1) y dos
 * a la izquierda (fachada hacia +x, rotación 0), que son los lados que la
 * cámara ve de frente. Cada una: caravana (5x3 o 3x5) y local (4x4), con sus puertas.
 */
const PLAZA_HOMES: {
  trailer: { x: number; y: number; rotation: 0 | 1 };
  trailerDoor: DoorSpot;
  lot: { x: number; y: number; rotation: 0 | 1 };
  lotDoor: DoorSpot;
}[] = [
  {
    trailer: { x: 5, y: 1, rotation: 1 },
    trailerDoor: { x: 7, y: 4, spawn: { x: 7, y: 5 } },
    lot: { x: 11, y: 0, rotation: 1 },
    lotDoor: { x: 13, y: 4, spawn: { x: 13, y: 5 } },
  },
  {
    trailer: { x: 16, y: 1, rotation: 1 },
    trailerDoor: { x: 18, y: 4, spawn: { x: 18, y: 5 } },
    lot: { x: 22, y: 0, rotation: 1 },
    lotDoor: { x: 24, y: 4, spawn: { x: 24, y: 5 } },
  },
  {
    trailer: { x: 1, y: 5, rotation: 0 },
    trailerDoor: { x: 4, y: 7, spawn: { x: 5, y: 7 } },
    lot: { x: 0, y: 11, rotation: 0 },
    lotDoor: { x: 4, y: 13, spawn: { x: 5, y: 13 } },
  },
  {
    trailer: { x: 1, y: 16, rotation: 0 },
    trailerDoor: { x: 4, y: 18, spawn: { x: 5, y: 18 } },
    lot: { x: 0, y: 22, rotation: 0 },
    lotDoor: { x: 4, y: 24, spawn: { x: 5, y: 24 } },
  },
];

/** Escena donde está la caravana de la parcela `slot` (0 = la calle). */
export function homeSceneId(slot: number): string {
  return slot === 0 ? SCENES.street : plazaId(Math.floor((slot - 1) / HOMES_PER_PLAZA) + 1);
}

/** Suelo de la plaza: losas y, alrededor de la fuente, un círculo de barro cocido. */
function plazaGround(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < PLAZA_SIZE; y++) {
    let row = '';
    for (let x = 0; x < PLAZA_SIZE; x++) {
      row += Math.hypot(x - 13.5, y - 13.5) < 5 ? 'c' : 'p';
    }
    rows.push(row);
  }
  return rows;
}

/** Fuente, bancos, farolas y cactus de una plaza. */
function plazaDecor(sceneId: string): FurniItem[] {
  const f = (id: string, item: Omit<FurniItem, 'id' | 'sceneId'>): FurniItem => ({ id: `${sceneId}:${id}`, sceneId, ...item });
  return [
    f('fountain', { defId: 'fountain', x: 13, y: 13, rotation: 0 }),
    // Bancos mirando a la fuente
    f('bench-w', { defId: 'park_bench', x: 10, y: 13, rotation: 0 }),
    f('bench-n', { defId: 'park_bench', x: 13, y: 10, rotation: 1 }),
    f('bench-e', { defId: 'park_bench', x: 17, y: 13, rotation: 2 }),
    f('bench-s', { defId: 'park_bench', x: 13, y: 17, rotation: 3 }),
    // Farolas en las cuatro esquinas del centro
    f('lamp-1', { defId: 'street_lamp', x: 9, y: 9, rotation: 0 }),
    f('lamp-2', { defId: 'street_lamp', x: 18, y: 9, rotation: 0 }),
    f('lamp-3', { defId: 'street_lamp', x: 9, y: 18, rotation: 0 }),
    f('lamp-4', { defId: 'street_lamp', x: 18, y: 18, rotation: 0 }),
    // Cactus en la esquina del fondo y junto a los bordes abiertos
    f('cactus-1', { defId: 'saguaro', x: 1, y: 1, rotation: 0 }),
    f('cactus-2', { defId: 'saguaro', x: 3, y: 3, rotation: 0 }),
    f('cactus-3', { defId: 'saguaro', x: 22, y: 25, rotation: 0 }),
    f('cactus-4', { defId: 'saguaro', x: 25, y: 9, rotation: 0 }),
  ];
}

/**
 * Abre la plaza número p (si no existe): su escena, su decoración y el camino
 * desde la anterior (la calle, para la primera). Las parcelas se añaden luego.
 */
function ensurePlaza(state: GameState, p: number): GameState {
  const id = plazaId(p);
  if (state.scenes[id]) return state;
  // Si falta la anterior, se abre antes (para que el camino exista).
  let next = p > 1 ? ensurePlaza(state, p - 1) : state;
  const prevId = p === 1 ? SCENES.street : plazaId(p - 1);
  const prevDoorId = p === 1 ? 'door-to-plaza-1' : `${prevId}-exit`;
  const prevSpot = p === 1 ? STREET_TO_PLAZA : PLAZA_EXIT;

  const plaza: Scene = {
    id,
    name: PLAZA_NAMES[p - 1] ?? `Plaza ${p}`,
    kind: 'street',
    width: PLAZA_SIZE,
    depth: PLAZA_SIZE,
    ground: plazaGround(),
    doors: [{ id: `${id}-entrance`, ...PLAZA_ENTRANCE, to: { sceneId: prevId, doorId: prevDoorId } }],
  };
  const prev = next.scenes[prevId];
  const prevDoor: Door = { id: prevDoorId, ...prevSpot, to: { sceneId: id, doorId: `${id}-entrance` } };
  const furniture = { ...next.furniture };
  for (const item of plazaDecor(id)) furniture[item.id] = item;
  // Una señal junto al paso, para que se vea que por ahí se va a la plaza.
  const signId = `${prevId}:sign-to-${id}`;
  furniture[signId] =
    p === 1
      ? { id: signId, sceneId: prevId, defId: 'road_sign', x: STREET_WIDTH - 1, y: 3, rotation: 1 }
      : { id: signId, sceneId: prevId, defId: 'road_sign', x: PLAZA_EXIT.x + 1, y: PLAZA_SIZE - 1, rotation: 1 };
  next = {
    ...next,
    furniture,
    scenes: { ...next.scenes, [id]: plaza, [prevId]: { ...prev, doors: [...prev.doors, prevDoor] } },
  };
  return next;
}

/**
 * Da a un jugador su parcela: su caravana (con su puerta, que lleva a su
 * caravana por dentro; cualquiera puede entrar de visita) y, desde la segunda
 * parcela, un local nuevo. La primera está al principio de la Calle Mayor; las
 * demás, en las plazas (que se abren cuando hacen falta). Se llama al entrar un
 * jugador por primera vez (JOIN) y al cargar el mundo guardado.
 */
export function addHome(state: GameState, playerId: string, slot: number): GameState {
  if (state.homes[playerId] !== undefined) return state;
  const sceneId = homeSceneId(slot);
  let next = slot === 0 ? state : ensurePlaza(state, Math.floor((slot - 1) / HOMES_PER_PLAZA) + 1);
  const layout =
    slot === 0
      ? {
          trailer: { x: 1, y: 1, rotation: 1 as const },
          trailerDoor: { x: 3, y: 4, spawn: { x: 3, y: 5 } },
          lot: null,
          lotDoor: null,
        }
      : PLAZA_HOMES[(slot - 1) % HOMES_PER_PLAZA];

  const scene = next.scenes[sceneId];
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
  furniture[trailerBuildingId(playerId)] = { id: trailerBuildingId(playerId), sceneId, defId: 'trailer', ...layout.trailer };
  let lots: Record<string, Lot> = next.lots;
  if (layout.lot && layout.lotDoor) {
    const n = BASE_LOT_XS.length + slot;
    const building = lotBuilding(n, sceneId, layout.lot.x, layout.lot.y, layout.lot.rotation);
    furniture[building.id] = building;
    doors.push(lotDoor(n, layout.lotDoor));
    scenes[lotId(n)] = lotInterior(n, sceneId);
    // Si el local ya existía (mundo guardado), se conserva tal cual.
    if (!lots[lotId(n)]) lots = { ...lots, [lotId(n)]: createLot(lotId(n), `Local ${n}`) };
  }
  scenes[sceneId] = { ...scene, doors };
  // Si su caravana ya existe (mundo guardado o recién creada), su puerta lleva aquí.
  const trailer = scenes[trailerSceneId(playerId)];
  if (trailer) scenes[trailer.id] = withTrailerExit(trailer, playerId, sceneId);
  return { ...next, scenes, furniture, lots, homes: { ...next.homes, [playerId]: slot } };
}

/** La puerta de una caravana, apuntando a la escena donde está aparcada. */
function withTrailerExit(trailer: Scene, ownerId: string, outsideSceneId: string): Scene {
  return {
    ...trailer,
    doors: trailer.doors.map((d) =>
      d.id === 'trailer-exit' ? { ...d, to: { sceneId: outsideSceneId, doorId: trailerDoorId(ownerId) } } : d,
    ),
  };
}

/** Primera parcela libre (la siguiente a la última dada). */
export function nextHomeSlot(state: GameState): number {
  const slots = Object.values(state.homes);
  return slots.length === 0 ? 0 : Math.max(...slots) + 1;
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
  return setupNeighbors(setupNpcStores(state));
}
