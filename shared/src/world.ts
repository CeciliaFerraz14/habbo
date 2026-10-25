// Mundo inicial de Pixel Springs: qué escenas hay, cómo se conectan y qué
// muebles tienen al empezar. En la fase 2 el servidor creará el mundo con
// esta misma función (o lo cargará de la base de datos).
import type { Scene } from './scene';
import type { FurniItem, GameState } from './types';

/** Ids de las escenas fijas del mundo. */
export const SCENES = {
  street: 'street',
  trailer: 'trailer',
} as const;

/** Escena en la que aparece un jugador nuevo, y en qué baldosa. */
export const START_SCENE = SCENES.trailer;
export const START_TILE = { x: 4, y: 4 };

function createScenes(): Scene[] {
  return [
    {
      // Provisional: en el paso 2b se convierte en la calle del pueblo.
      id: SCENES.street,
      name: 'Calle',
      kind: 'street',
      width: 14,
      depth: 10,
      doors: [
        {
          id: 'street-trailer',
          x: 4,
          y: 3,
          spawn: { x: 4, y: 4 },
          to: { sceneId: SCENES.trailer, doorId: 'trailer-exit' },
        },
      ],
    },
    {
      // La caravana del jugador (la sala del prototipo).
      id: SCENES.trailer,
      name: 'Caravana',
      kind: 'interior',
      width: 10,
      depth: 10,
      doors: [
        {
          // Puerta en la pared izquierda (x = 0).
          id: 'trailer-exit',
          x: 0,
          y: 7,
          spawn: { x: 1, y: 7 },
          to: { sceneId: SCENES.street, doorId: 'street-trailer' },
        },
      ],
    },
  ];
}

/** Muebles con los que empieza la caravana. */
function createFurniture(): FurniItem[] {
  const s = SCENES.trailer;
  return [
    { id: 'f1', sceneId: s, defId: 'lamp', x: 0, y: 0, rotation: 0 },
    { id: 'f2', sceneId: s, defId: 'shelf', x: 2, y: 0, rotation: 1 },
    { id: 'f3', sceneId: s, defId: 'bed', x: 6, y: 0, rotation: 1 },
    { id: 'f4', sceneId: s, defId: 'plant', x: 9, y: 0, rotation: 0 },
    { id: 'f5', sceneId: s, defId: 'sofa', x: 0, y: 3, rotation: 0 },
    { id: 'f6', sceneId: s, defId: 'table', x: 2, y: 4, rotation: 0 },
    { id: 'f7', sceneId: s, defId: 'chair', x: 3, y: 4, rotation: 2 },
    { id: 'f8', sceneId: s, defId: 'rug', x: 5, y: 5, rotation: 0 },
    { id: 'f9', sceneId: s, defId: 'plant', x: 0, y: 9, rotation: 0 },
  ];
}

export function createInitialState(): GameState {
  return {
    scenes: Object.fromEntries(createScenes().map((s) => [s.id, s])),
    avatars: {},
    furniture: Object.fromEntries(createFurniture().map((f) => [f.id, f])),
    inventories: {},
    messages: [],
    nextId: 100,
  };
}
