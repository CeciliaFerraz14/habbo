// Mundo inicial de Pixel Springs: qué escenas hay, cómo se conectan y qué
// muebles y edificios tienen al empezar. En la fase 2 el servidor creará el
// mundo con esta misma función (o lo cargará de la base de datos).
//
// Plano de la calle (x hacia la derecha, y hacia abajo; en pantalla la
// carretera queda en diagonal):
//
//   y 0-3   [caravana 1]  [local1] ... [local6]  [gasolinera]  [caravana 2][local7]  [caravana 3][local8] ...
//   y 4     acera con las puertas (D) de los edificios (la de la gasolinera, en x = 39)
//   y 5-6   acera (con farolas en y = 6)
//   y 7-9   carretera, con la línea central en y = 8
//   y 10-13 desierto con cactus, el cartel de bienvenida y la estatua del alcalde
//
// La calle CRECE con el pueblo: cada jugador nuevo recibe una parcela al final
// (su caravana y, desde el segundo, un local nuevo) y la calle se alarga. El
// primero ocupa la caravana del principio. Ver addHome.
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


/** Ancho de la calle del pueblo original (hasta la gasolinera). */
const STREET_BASE_WIDTH = 44;
const STREET_DEPTH = 14;
/** Ancho de la parcela de cada jugador nuevo: su caravana (5) y su local (4), con huecos. */
const HOME_WIDTH = 11;

/** Coordenada x de los 6 locales del pueblo original (todos en y = 0, de 4x4 baldosas). */
const BASE_LOT_XS = [8, 13, 18, 23, 28, 33];
/** Id del local número i (empezando en 1), que también es el id de su escena interior. */
export const lotId = (i: number) => `lot${i}`;
export const LOT_IDS = BASE_LOT_XS.map((_, i) => lotId(i + 1));

/** Ids del edificio y de la puerta de la caravana de un jugador en la calle. */
export const trailerBuildingId = (ownerId: string) => `trailer-building:${ownerId}`;
const trailerDoorId = (ownerId: string) => `street-trailer:${ownerId}`;

/** Genera el mapa de suelo de la calle, fila a fila. */
function streetGround(width: number): string[] {
  const rows: string[] = [];
  for (let y = 0; y < STREET_DEPTH; y++) {
    let tile: string;
    if (y >= 4 && y <= 6) tile = 's'; // acera
    else if (y === 7 || y === 9) tile = 'r'; // carriles
    else if (y === 8) tile = '-'; // línea central (con raya cada dos baldosas)
    else tile = '.'; // arena
    let row = '';
    for (let x = 0; x < width; x++) {
      row += tile === '-' && x % 2 === 1 ? 'r' : tile;
    }
    rows.push(row);
  }
  return rows;
}

/** Puerta de la calle del local número n, en la fachada frente a su tercera baldosa. */
function lotDoor(n: number, x: number): Door {
  const id = lotId(n);
  return {
    id: `street-${id}`,
    x: x + 2,
    y: 4,
    spawn: { x: x + 2, y: 5 },
    to: { sceneId: id, doorId: `${id}-exit` },
    buildingId: `${id}-building`,
    lotId: id,
  };
}

/** Interior del local número n: una sala vacía de 8x8 con la puerta en la pared izquierda. */
function lotInterior(n: number): Scene {
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
        to: { sceneId: SCENES.street, doorId: `street-${id}` },
      },
    ],
  };
}

/** Edificio del local número n en la calle (con tablones mientras está en alquiler). */
function lotBuilding(n: number, x: number): FurniItem {
  return { id: `${lotId(n)}-building`, sceneId: SCENES.street, defId: 'shop', x, y: 0, rotation: 1, variant: 'closed' };
}

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
    ...BASE_LOT_XS.map((x, i) => lotDoor(i + 1, x)),
  ];
  const lotInteriors = BASE_LOT_XS.map((_, i) => lotInterior(i + 1));

  return [
    {
      id: s,
      name: 'Calle Mayor',
      kind: 'street',
      width: STREET_BASE_WIDTH,
      depth: STREET_DEPTH,
      doors: streetDoors,
      ground: streetGround(STREET_BASE_WIDTH),
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
    ...BASE_LOT_XS.map((x, i) => lotBuilding(i + 1, x)),
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

/** Dónde va la parcela número `slot` (0 = la caravana del principio de la calle). */
function homeLayout(slot: number) {
  if (slot === 0) return { trailerX: 1, lotX: null, end: STREET_BASE_WIDTH };
  const start = STREET_BASE_WIDTH + (slot - 1) * HOME_WIDTH;
  return { trailerX: start + 1, lotX: start + 7, end: start + HOME_WIDTH };
}

/**
 * Da a un jugador su parcela en la calle: su caravana (con su puerta, que
 * lleva a su caravana por dentro; cualquiera puede entrar de visita) y, desde
 * la segunda parcela, un local nuevo. La calle se alarga para que quepa, con
 * una farola y un cactus más. Se llama al entrar un jugador por primera vez
 * (JOIN) y al cargar el mundo guardado.
 */
export function addHome(state: GameState, playerId: string, slot: number): GameState {
  if (state.homes[playerId] !== undefined) return state;
  const street = state.scenes[SCENES.street];
  const { trailerX, lotX, end } = homeLayout(slot);
  const furniture = { ...state.furniture };
  const scenes = { ...state.scenes };
  const doors: Door[] = [
    ...street.doors,
    {
      id: trailerDoorId(playerId),
      x: trailerX + 2,
      y: 4,
      spawn: { x: trailerX + 2, y: 5 },
      to: { sceneId: trailerSceneId(playerId), doorId: 'trailer-exit' },
      buildingId: trailerBuildingId(playerId),
    },
  ];
  furniture[trailerBuildingId(playerId)] = {
    id: trailerBuildingId(playerId),
    sceneId: SCENES.street,
    defId: 'trailer',
    x: trailerX,
    y: 1,
    rotation: 1,
  };
  let lots: Record<string, Lot> = state.lots;
  if (lotX !== null) {
    const n = BASE_LOT_XS.length + slot;
    const building = lotBuilding(n, lotX);
    furniture[building.id] = building;
    doors.push(lotDoor(n, lotX));
    scenes[lotId(n)] = lotInterior(n);
    lots = { ...lots, [lotId(n)]: createLot(lotId(n), `Local ${n}`) };
    // Farola delante de la parcela y un cactus enfrente, en el desierto.
    const s = SCENES.street;
    furniture[`lamp-home-${slot}`] = { id: `lamp-home-${slot}`, sceneId: s, defId: 'street_lamp', x: end - HOME_WIDTH + 5, y: 6, rotation: 0 };
    furniture[`cactus-home-${slot}`] = { id: `cactus-home-${slot}`, sceneId: s, defId: 'saguaro', x: end - 3, y: 12, rotation: 0 };
  }
  const width = Math.max(street.width, end);
  scenes[SCENES.street] = { ...street, width, doors, ground: streetGround(width) };
  return { ...state, scenes, furniture, lots, homes: { ...state.homes, [playerId]: slot } };
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
