// Sprites de la sala (suelo, bordes y paredes), generados por código.
//
// No dibujamos rombos con ctx.lineTo() porque canvas suaviza los bordes de
// los paths. En su lugar calculamos qué píxeles forman cada fila del rombo
// y los pintamos uno a uno: bordes duros, como el pixel art de verdad.

import { TILE_HEIGHT, TILE_WIDTH } from '../engine/iso';
import { createSprite, type Sprite } from './canvas';

/** Altura de las paredes en píxeles. */
export const WALL_HEIGHT = 72;
/** Grosor del borde del suelo (el "canto" de la plataforma). */
export const FLOOR_THICKNESS = 4;

const HALF_W = TILE_WIDTH / 2;
const HALF_H = TILE_HEIGHT / 2;

const C = {
  outline: '#141428',
  floorA: '#e0c088',
  floorB: '#d2ae74',
  floorLine: '#a8844e',
  sideLeft: '#8a6a3a',
  sideRight: '#6e5230',
  wallLeft: '#4a78ab',
  wallLeftSeam: '#3f6896',
  wallRight: '#6fa3d8',
  wallRightSeam: '#5f92c6',
  wallCap: '#b8d8f4',
  baseboard: '#2e4a6e',
  hover: '#ffcc33',
  selected: '#5ce1e6',
  valid: '#6be36b',
  invalid: '#ff5050',
};

/**
 * Para la fila `row` (0..TILE_HEIGHT-1) del rombo, devuelve la primera y la
 * última columna rellenas.
 *
 * Las líneas isométricas 2:1 avanzan 2 píxeles en horizontal por cada píxel
 * en vertical, así que cada fila es 4 píxeles más ancha que la anterior
 * (2 por cada lado) hasta la mitad, y luego se estrecha igual.
 *
 *   fila 0:            ....XXXX....         (4 px)
 *   fila 1:          ..XXXXXXXXXX..         (8 px)
 *   ...
 *   fila 7:  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (32 px)
 *   fila 8:  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
 *   ...
 */
function diamondRow(row: number): [number, number] {
  const halfWidth = row < HALF_H ? (row + 1) * 2 : (TILE_HEIGHT - row) * 2;
  return [HALF_W - halfWidth, HALF_W + halfWidth - 1];
}

/** Rombo de suelo. Los 2 píxeles de cada extremo de fila forman el borde. */
function floorTile(fill: string): Sprite {
  return createSprite(TILE_WIDTH, TILE_HEIGHT, (px) => {
    for (let row = 0; row < TILE_HEIGHT; row++) {
      const [x0, x1] = diamondRow(row);
      for (let x = x0; x <= x1; x++) {
        const isEdge = x <= x0 + 1 || x >= x1 - 1 || row === 0 || row === TILE_HEIGHT - 1;
        px(x, row, isEdge ? C.floorLine : fill);
      }
    }
  });
}

/** Contorno de color sobre una baldosa (ratón encima, selección, colocar mueble...). */
function outlineTile(color: string): Sprite {
  return createSprite(TILE_WIDTH, TILE_HEIGHT, (px) => {
    for (let row = 0; row < TILE_HEIGHT; row++) {
      const [x0, x1] = diamondRow(row);
      for (let x = x0; x <= x1; x++) {
        const isEdge = x <= x0 + 1 || x >= x1 - 1 || row === 0 || row === TILE_HEIGHT - 1;
        if (isEdge) px(x, row, color);
      }
    }
  });
}

/**
 * Canto del suelo bajo un borde delantero de la sala.
 * side = 'left'  → bajo la arista inferior-izquierda (baldosas con y = depth-1)
 * side = 'right' → bajo la arista inferior-derecha  (baldosas con x = width-1)
 */
function floorSide(side: 'left' | 'right'): Sprite {
  return createSprite(TILE_WIDTH, TILE_HEIGHT + FLOOR_THICKNESS, (px) => {
    const fromX = side === 'left' ? 0 : HALF_W;
    for (let x = fromX; x < fromX + HALF_W; x++) {
      // Fila de la arista inferior en esta columna: baja 1 píxel cada 2 columnas.
      const edgeRow =
        side === 'left'
          ? HALF_H + Math.floor(x / 2)
          : TILE_HEIGHT - 1 - Math.floor((x - HALF_W) / 2);
      for (let i = 1; i <= FLOOR_THICKNESS; i++) {
        const isBottom = i === FLOOR_THICKNESS;
        px(x, edgeRow + i, isBottom ? C.outline : side === 'left' ? C.sideLeft : C.sideRight);
      }
    }
  });
}

/**
 * Trozo de pared que se levanta sobre la arista superior de una baldosa.
 *
 * side = 'left'  → pared sobre la arista superior-izquierda (baldosas con x = 0)
 * side = 'right' → pared sobre la arista superior-derecha  (baldosas con y = 0)
 *
 * El sprite mide HALF_W de ancho y WALL_HEIGHT + HALF_H de alto. Se dibuja
 * con su parte superior WALL_HEIGHT píxeles por encima de la esquina superior
 * de la baldosa.
 *
 * `end` = true añade un contorno vertical en el extremo libre de la pared.
 */
function wallSegment(side: 'left' | 'right', end: boolean): Sprite {
  return createSprite(HALF_W, WALL_HEIGHT + HALF_H, (px) => {
    for (let c = 0; c < HALF_W; c++) {
      // Fila (dentro del rombo) de la arista superior en esta columna.
      // Izquierda: sube de la fila 7 (c=0) a la fila 0 (c=15).
      // Derecha: baja de la fila 0 (c=0) a la fila 7 (c=15).
      const edgeRow = side === 'left' ? HALF_H - 1 - Math.floor(c / 2) : Math.floor(c / 2);
      const isSeam = side === 'left' ? c === 0 : c === HALF_W - 1;
      const isEnd = end && isSeam;

      // La columna de pared ocupa WALL_HEIGHT píxeles justo encima de la arista.
      for (let i = 0; i < WALL_HEIGHT; i++) {
        const row = edgeRow + i;
        let color: string;
        if (i === 0 || isEnd) color = C.outline; // borde superior
        else if (i <= 2) color = C.wallCap; // remate claro
        else if (i === WALL_HEIGHT - 1) color = C.outline; // línea del suelo
        else if (i >= WALL_HEIGHT - 4) color = C.baseboard; // rodapié
        else if (isSeam) color = side === 'left' ? C.wallLeftSeam : C.wallRightSeam;
        else color = side === 'left' ? C.wallLeft : C.wallRight;
        px(c, row, color);
      }
    }
  });
}

export interface RoomSprites {
  floorA: Sprite;
  floorB: Sprite;
  hover: Sprite;
  selected: Sprite;
  valid: Sprite;
  invalid: Sprite;
  sideLeft: Sprite;
  sideRight: Sprite;
  wallLeft: Sprite;
  wallLeftEnd: Sprite;
  wallRight: Sprite;
  wallRightEnd: Sprite;
}

export function buildRoomSprites(): RoomSprites {
  return {
    floorA: floorTile(C.floorA),
    floorB: floorTile(C.floorB),
    hover: outlineTile(C.hover),
    selected: outlineTile(C.selected),
    valid: outlineTile(C.valid),
    invalid: outlineTile(C.invalid),
    sideLeft: floorSide('left'),
    sideRight: floorSide('right'),
    wallLeft: wallSegment('left', false),
    wallLeftEnd: wallSegment('left', true),
    wallRight: wallSegment('right', false),
    wallRightEnd: wallSegment('right', true),
  };
}
