// Mundo inicial de Pixel Springs: qué escenas hay, cómo se conectan y qué
// muebles y edificios tienen al empezar. En la fase 2 el servidor creará el
// mundo con esta misma función (o lo cargará de la base de datos).
//
// Plano de la calle (x hacia la derecha, y hacia abajo; en pantalla la
// carretera queda en diagonal):
//
//   y 0-3   [caravana]  [local1] [local2] ... [local6]  [gasolinera]
//   y 4     acera con las puertas (D) de los edificios
//   y 5-6   acera (con farolas en y = 6)
//   y 7-9   carretera, con la línea central en y = 8
//   y 10    acera sur (con farolas), junto a la carretera
//   y 11-14 fila A de solares: [solar1] [solar2] [solar3] (x 8, 20, 32)
//   y 15    acera con las puertas de la fila A
//   y 16    arena, donde aparece quien sale de esas puertas
//   y 17-20 fila B de solares: [solar4] [solar5] [solar6] (x 15, 27, 39)
//   y 21    acera con las puertas de la fila B
//   y 22-24 desierto, donde aparece quien sale de ellas
//
// Un solar es una estructura fija con losa y valla hasta que alguien construye;
// entonces, un local con la fachada hacia +y. La fila B está 7 baldosas
// desplazada para que sus edificios no tapen las fachadas de la fila A. Los
// cactus y las farolas ocupan los huecos, sin cortar el paso entre filas.
import { buildingVariant, createLot, lotSceneName, type Lot } from './economy';
import { setupNeighbors } from './npcs';
import type { Door, Scene } from './scene';
import type { FurniItem, GameState } from './types';

import { lotBuildingId, SCENES, trailerSceneId } from './world.ids';

export { SCENES, trailerSceneId };

/**
 * Escena en la que aparece un jugador al entrar: su propia caravana (el alias
 * 'trailer' se resuelve a `trailer:<id>` en el reducer), y en qué baldosa.
 */
export const START_SCENE = SCENES.trailer;
export const START_TILE = { x: 6, y: 3 };


const STREET_WIDTH = 44;
const STREET_DEPTH = 25;

/** Coordenada x de cada uno de los 6 locales (todos en y = 0, de 4x4 baldosas). */
const LOT_XS = [8, 13, 18, 23, 28, 33];
/** Id del local número i (empezando en 1), que también es el id de su escena interior. */
export const lotId = (i: number) => `lot${i}`;
export const LOT_IDS = LOT_XS.map((_, i) => lotId(i + 1));

/** Esquina (x, y) de cada solar, de 4x4 baldosas: tres en la fila A y tres en la fila B. */
const PLOT_CORNERS = [
  [8, 11],
  [20, 11],
  [32, 11],
  [15, 17],
  [27, 17],
  [39, 17],
];

/**
 * Solares: sitios fijos al otro lado de la carretera. Sus ids siguen a los de
 * los locales (lot7...lot12) porque, una vez construidos, son locales como los
 * demás. Un solar sin construir NO está en `state.lots`: solo existe aquí y
 * como una estructura fija en la calle.
 */
export const PLOT_SITES = PLOT_CORNERS.map(([x, y], i) => ({
  lotId: lotId(LOT_XS.length + i + 1),
  label: `Solar ${i + 1}`,
  x,
  y,
}));

/** La acera con la puerta de un solar está justo delante de su fachada. */
const plotDoorY = (site: { y: number }) => site.y + 4;

/** El sitio de un solar por su id, o undefined si no es un solar (el id viene del cliente). */
export const plotSite = (id: string) => PLOT_SITES.find((site) => site.lotId === id);

/** ¿Es el id de un solar? */
export const isPlotId = (id: string) => plotSite(id) !== undefined;

/** Id de la estructura de un solar sin construir. */
const plotSiteItemId = (id: string) => `${id}-site`;

/** Si el mueble es la estructura de un solar sin construir, devuelve el id del solar. */
export const plotOfSiteItem = (itemId: string) =>
  PLOT_SITES.find((site) => plotSiteItemId(site.lotId) === itemId)?.lotId ?? null;

/** Genera el mapa de suelo de la calle, fila a fila. */
function streetGround(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < STREET_DEPTH; y++) {
    let tile: string;
    if ((y >= 4 && y <= 6) || y === 10 || PLOT_SITES.some((site) => plotDoorY(site) === y)) tile = 's'; // aceras
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

/**
 * Puerta de la calle de un local: en la fila `y`, frente a la tercera baldosa
 * del edificio, y quien sale aparece en `spawnY` (la baldosa de fuera).
 */
function lotStreetDoor(id: string, x: number, y: number, spawnY: number): Door {
  return {
    id: `street-${id}`,
    x: x + 2,
    y,
    spawn: { x: x + 2, y: spawnY },
    to: { sceneId: id, doorId: `${id}-exit` },
    buildingId: lotBuildingId(id),
    lotId: id,
  };
}

/** Interior de un local: una sala vacía de 8x8 con la puerta en la pared izquierda. */
function lotInterior(id: string, name: string): Scene {
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
        to: { sceneId: SCENES.street, doorId: `street-${id}` },
      },
    ],
  };
}

/** Edificio de un local en la calle. Con rotación 1 la fachada mira a +y. */
function lotBuilding(id: string, x: number, y: number, variant: string): FurniItem {
  return { id: lotBuildingId(id), sceneId: SCENES.street, defId: 'shop', x, y, rotation: 1, variant };
}

function createScenes(): Scene[] {
  // Puertas de la calle: la de la caravana y una por local. Las de los
  // solares se añaden al construirlos (restorePlot).
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
    ...LOT_XS.map((x, i) => lotStreetDoor(lotId(i + 1), x, 4, 5)),
  ];

  return [
    {
      id: SCENES.street,
      name: 'Calle Mayor',
      kind: 'street',
      width: STREET_WIDTH,
      depth: STREET_DEPTH,
      doors: streetDoors,
      ground: streetGround(),
    },
    ...LOT_XS.map((_, i) => lotInterior(lotId(i + 1), `Local ${i + 1}`)),
  ];
}

/** Edificios y decoración fija de la calle. */
function createStreetStructures(): FurniItem[] {
  const s = SCENES.street;
  const items: FurniItem[] = [
    // Con rotación 1 la fachada mira a la carretera (+y).
    { id: 'trailer-building', sceneId: s, defId: 'trailer', x: 1, y: 1, rotation: 1 },
    { id: 'gas-station', sceneId: s, defId: 'gas_station', x: 38, y: 0, rotation: 1 },
    { id: 'welcome-sign', sceneId: s, defId: 'welcome_sign', x: 1, y: 17, rotation: 1 },
    ...LOT_XS.map((x, i) => lotBuilding(lotId(i + 1), x, 0, 'closed')),
    // Los solares sin construir: restorePlot los cambia por el edificio.
    ...PLOT_SITES.map(
      (site): FurniItem => ({
        id: plotSiteItemId(site.lotId),
        sceneId: s,
        defId: 'plot_site',
        x: site.x,
        y: site.y,
        rotation: 1,
      }),
    ),
  ];

  const lamp = (id: string, x: number, y: number) =>
    items.push({ id, sceneId: s, defId: 'street_lamp', x, y, rotation: 0 });
  // Farolas a lo largo de las aceras, junto al bordillo y en la de la fila A,
  // donde estas x caen en los huecos entre puertas.
  [6, 16, 26, 36].forEach((x, i) => {
    lamp(`lamp-${i}`, x, 6);
    lamp(`lamp-south-${i}`, x, 10);
    lamp(`lamp-row-a-${i}`, x, 15);
  });
  // En la acera de la fila B, solo en los huecos: delante de una fachada la taparían.
  [8, 23, 35].forEach((x, i) => lamp(`lamp-row-b-${i}`, x, 21));

  // Cactus en los huecos entre edificios y en el desierto. Nunca en las líneas
  // de vista de las fachadas (estarían delante en pantalla) ni en x = 43, que
  // es el paso de una baldosa al lado de la fila B.
  const cacti = [
    [6, 2], [12, 2],
    [3, 13], [14, 12], [18, 14], [26, 12], [29, 14], [38, 12], [42, 14],
    [4, 19], [10, 18], [7, 20], [20, 18], [23, 19], [33, 18], [36, 20],
    [4, 23], [11, 24], [13, 22], [22, 22], [25, 24], [35, 23], [38, 22], [37, 24], [40, 24],
  ];
  cacti.forEach(([x, y], i) => {
    items.push({ id: `cactus-${i}`, sceneId: s, defId: 'saguaro', x, y, rotation: 0 });
  });

  return items;
}

/**
 * Pone en el mundo las piezas de un solar construido: su interior, el edificio
 * (con la variante que toca según el negocio), la puerta en la calle, y quita
 * la estructura del solar sin construir. Es la ÚNICA función que crea esas
 * piezas: la usan buildPlot al construir y el servidor al cargar los solares
 * guardados. Por eso es idempotente: el interior y la puerta se dejan como
 * estén si ya existen, y el edificio se regenera a partir del Lot (sale igual).
 */
export function restorePlot(state: GameState, lot: Lot): GameState {
  const site = plotSite(lot.id);
  if (!site) return state;
  const street = state.scenes[SCENES.street];

  const scenes = { ...state.scenes };
  scenes[lot.id] ??= lotInterior(lot.id, lotSceneName(lot));
  const doorY = plotDoorY(site);
  const door = lotStreetDoor(lot.id, site.x, doorY, doorY + 1);
  if (!street.doors.some((d) => d.id === door.id)) {
    scenes[street.id] = { ...street, doors: [...street.doors, door] };
  }

  const { [plotSiteItemId(lot.id)]: _site, ...furniture } = state.furniture;
  const building = lotBuilding(lot.id, site.x, site.y, buildingVariant(lot));
  furniture[building.id] = building;

  return { ...state, scenes, furniture };
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
  const furniture = createStreetStructures();
  const state: GameState = {
    scenes: Object.fromEntries(createScenes().map((s) => [s.id, s])),
    avatars: {},
    furniture: Object.fromEntries(furniture.map((f) => [f.id, f])),
    inventories: {},
    messages: [],
    lots: Object.fromEntries(LOT_IDS.map((id, i) => [id, createLot(id, `Local ${i + 1}`)])),
    money: {},
    materials: {},
    tick: 0,
    seed: 20240917,
    npcs: {},
    vehicles: {},
    nextCarAt: 0,
    notices: [],
    nextId: 100,
  };
  // Todos los locales empiezan en alquiler y los vecinos salen a la calle.
  return setupNeighbors(state);
}
