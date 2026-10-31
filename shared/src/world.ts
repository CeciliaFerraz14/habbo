// Mundo inicial de Pixel Springs: qué escenas hay, cómo se conectan y qué
// muebles y edificios tienen al empezar. En la fase 2 el servidor creará el
// mundo con esta misma función (o lo cargará de la base de datos).
//
// Plano de la calle (x hacia la derecha, y hacia abajo; en pantalla la
// carretera queda en diagonal):
//
//   y 0-3   [caravana]  [local1] [local2] ... [local6]  [gasolinera]
//   y 4     acera con las puertas (D) de los edificios (la de la gasolinera, en x = 39)
//   y 5-6   acera (con farolas en y = 6)
//   y 7-9   carretera, con la línea central en y = 8
//   y 10-13 desierto con cactus y el cartel de bienvenida
import { createLot, setupNpcStores } from './economy';
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


const STREET_WIDTH = 44;
const STREET_DEPTH = 14;

/** Coordenada x de cada uno de los 6 locales (todos en y = 0, de 4x4 baldosas). */
const LOT_XS = [8, 13, 18, 23, 28, 33];
/** Id del local número i (empezando en 1), que también es el id de su escena interior. */
export const lotId = (i: number) => `lot${i}`;
export const LOT_IDS = LOT_XS.map((_, i) => lotId(i + 1));

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

function createScenes(): Scene[] {
  const s = SCENES.street;

  // Puertas de la calle: la de la caravana y una por local.
  const streetDoors: Door[] = [
    {
      id: 'street-trailer',
      x: 3,
      y: 4,
      spawn: { x: 3, y: 5 },
      // 'trailer' es un alias: cada uno entra en SU caravana (ver updateDoors).
      to: { sceneId: SCENES.trailer, doorId: 'trailer-exit' },
      buildingId: 'trailer-building',
    },
    {
      id: 'street-gas',
      x: 39,
      y: 4,
      spawn: { x: 39, y: 5 },
      to: { sceneId: SCENES.gas, doorId: 'gas-exit' },
      buildingId: 'gas-station',
    },
    ...LOT_XS.map((x, i): Door => {
      const id = lotId(i + 1);
      return {
        id: `street-${id}`,
        // La puerta está en la fachada, frente a la tercera baldosa del local.
        x: x + 2,
        y: 4,
        spawn: { x: x + 2, y: 5 },
        to: { sceneId: id, doorId: `${id}-exit` },
        buildingId: `${id}-building`,
        lotId: id,
      };
    }),
  ];

  // Interior de cada local: una sala vacía de 8x8 con la puerta en la pared izquierda.
  const lotInteriors = LOT_XS.map((_, i): Scene => {
    const id = lotId(i + 1);
    return {
      id,
      name: `Local ${i + 1}`,
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
          to: { sceneId: s, doorId: `street-${id}` },
        },
      ],
    };
  });

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
    { id: 'trailer-building', sceneId: s, defId: 'trailer', x: 1, y: 1, rotation: 1 },
    { id: 'gas-station', sceneId: s, defId: 'gas_station', x: 38, y: 0, rotation: 1 },
    { id: 'welcome-sign', sceneId: s, defId: 'welcome_sign', x: 1, y: 11, rotation: 1 },
    ...LOT_XS.map(
      (x, i): FurniItem => ({
        id: `${lotId(i + 1)}-building`,
        sceneId: s,
        defId: 'shop',
        x,
        y: 0,
        rotation: 1,
        variant: 'closed',
      }),
    ),
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
        to: { sceneId: SCENES.street, doorId: 'street-trailer' },
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
