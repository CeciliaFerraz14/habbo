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
//   y 11-14 [solar1] [solar2] ... [solar6]: arena con un cartel hasta que
//           alguien construye; entonces, un local con la fachada hacia +y
//   y 15    acera trasera con las puertas de los solares construidos
//   y 16-18 desierto con cactus y el cartel de bienvenida
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
const STREET_DEPTH = 19;

/** Coordenada x de cada uno de los 6 locales (todos en y = 0, de 4x4 baldosas). */
const LOT_XS = [8, 13, 18, 23, 28, 33];
/** Id del local número i (empezando en 1), que también es el id de su escena interior. */
export const lotId = (i: number) => `lot${i}`;
export const LOT_IDS = LOT_XS.map((_, i) => lotId(i + 1));

/** Fila de arriba de los solares (ocupan de y = 11 a y = 14). */
const PLOT_Y = 11;
/** Acera trasera de los solares, donde están sus puertas. */
const PLOT_DOOR_Y = 15;

/**
 * Solares: sitios fijos enfrente de los locales, en las mismas x y del mismo
 * tamaño. Sus ids siguen a los de los locales (lot7...lot12) porque, una vez
 * construidos, son locales como los demás. Un solar sin construir NO está en
 * `state.lots`: solo existe aquí y como un cartel en la calle.
 */
export const PLOT_SITES = LOT_XS.map((x, i) => ({
  lotId: lotId(LOT_XS.length + i + 1),
  label: `Solar ${i + 1}`,
  x,
}));

/** El sitio de un solar por su id, o undefined si no es un solar (el id viene del cliente). */
export const plotSite = (id: string) => PLOT_SITES.find((site) => site.lotId === id);

/** ¿Es el id de un solar? */
export const isPlotId = (id: string) => plotSite(id) !== undefined;

/** Id del cartel de un solar sin construir. */
const plotSignId = (id: string) => `${id}-sign`;

/** Si el mueble es el cartel de un solar, devuelve el id del solar. */
export const plotOfSign = (itemId: string) =>
  PLOT_SITES.find((site) => plotSignId(site.lotId) === itemId)?.lotId ?? null;

/** Genera el mapa de suelo de la calle, fila a fila. */
function streetGround(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < STREET_DEPTH; y++) {
    let tile: string;
    if ((y >= 4 && y <= 6) || y === 10 || y === PLOT_DOOR_Y) tile = 's'; // aceras
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
    // Cartel de "Se vende" en la esquina delantera de cada solar.
    ...PLOT_SITES.map(
      (site): FurniItem => ({
        id: plotSignId(site.lotId),
        sceneId: s,
        defId: 'plot_sign',
        x: site.x + 3,
        y: PLOT_Y + 3,
        rotation: 1,
      }),
    ),
  ];

  // Farolas a lo largo de las dos aceras, junto al bordillo.
  [6, 16, 26, 36].forEach((x, i) => {
    items.push({ id: `lamp-${i}`, sceneId: s, defId: 'street_lamp', x, y: 6, rotation: 0 });
    items.push({ id: `lamp-south-${i}`, sceneId: s, defId: 'street_lamp', x, y: 10, rotation: 0 });
  });

  // Cactus en los huecos entre edificios y en el desierto de detrás de los
  // solares (en y 17-18, para no tapar la salida de sus puertas en y = 16).
  const cacti = [
    [6, 2], [12, 2], [4, 18], [9, 17], [14, 18], [20, 17],
    [25, 18], [31, 17], [35, 18], [41, 17],
  ];
  cacti.forEach(([x, y], i) => {
    items.push({ id: `cactus-${i}`, sceneId: s, defId: 'saguaro', x, y, rotation: 0 });
  });

  return items;
}

/**
 * Pone en el mundo las piezas de un solar construido: su interior, el edificio
 * (con la variante que toca según el negocio), la puerta en la calle, y quita
 * el cartel. Es la ÚNICA función que crea esas piezas: la usan buildPlot al
 * construir y el servidor al cargar los solares guardados. Por eso es
 * idempotente: si una pieza ya está, la deja como está.
 */
export function restorePlot(state: GameState, lot: Lot): GameState {
  const site = plotSite(lot.id);
  if (!site) return state;
  const street = state.scenes[SCENES.street];

  const scenes = { ...state.scenes };
  scenes[lot.id] ??= lotInterior(lot.id, lotSceneName(lot));
  const door = lotStreetDoor(lot.id, site.x, PLOT_DOOR_Y, PLOT_DOOR_Y + 1);
  if (!street.doors.some((d) => d.id === door.id)) {
    scenes[street.id] = { ...street, doors: [...street.doors, door] };
  }

  const { [plotSignId(lot.id)]: _sign, ...furniture } = state.furniture;
  const building = lotBuilding(lot.id, site.x, PLOT_Y, buildingVariant(lot));
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
