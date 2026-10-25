// Sprites de la sala (suelo, bordes y paredes), generados por código.
//
// No dibujamos rombos con ctx.lineTo() porque canvas suaviza los bordes de
// los paths. En su lugar calculamos qué píxeles forman cada fila del rombo
// y los pintamos uno a uno: bordes duros, como el pixel art de verdad.

import { TILE_HEIGHT, TILE_WIDTH } from '../engine/iso';
import { createSprite, type Sprite } from './canvas';
import { PALETTE } from './palette';

/** Altura de las paredes en píxeles. */
export const WALL_HEIGHT = 72;
/** Grosor del borde del suelo (el "canto" de la plataforma). */
export const FLOOR_THICKNESS = 4;

const HALF_W = TILE_WIDTH / 2;
const HALF_H = TILE_HEIGHT / 2;

// Suelo de baldosa de barro cocido y paredes de adobe con rodapié turquesa.
const C = {
  outline: PALETTE.outline,
  floorA: '#d9895b',
  floorB: '#c97a4e',
  floorLine: '#a85f3a',
  sideLeft: PALETTE.ochre,
  sideRight: '#a86f2c',
  wallLeft: PALETTE.adobe,
  wallLeftSeam: '#d2a26c',
  wallRight: PALETTE.adobeLight,
  wallRightSeam: '#dfb47f',
  wallCap: PALETTE.cream,
  baseboard: PALETTE.turquoise,
  hover: PALETTE.neonYellow,
  selected: PALETTE.neonCyan,
  valid: '#7be35b',
  invalid: '#ff4f4f',
  sandLine: '#c99a5c',
  door: PALETTE.turquoise,
  doorFrame: '#8a5a34',
  doorGlass: '#a6e3d4',
  doorKnob: '#f2b134',
  sidewalk: '#cdbb9c',
  sidewalkLine: '#a8987c',
  asphalt: '#5e5450',
  asphaltLine: '#574d49',
  roadPaint: PALETTE.neonYellow,
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
function floorTile(fill: string, line: string = C.floorLine): Sprite {
  return createSprite(TILE_WIDTH, TILE_HEIGHT, (px) => {
    for (let row = 0; row < TILE_HEIGHT; row++) {
      const [x0, x1] = diamondRow(row);
      for (let x = x0; x <= x1; x++) {
        const isEdge = x <= x0 + 1 || x >= x1 - 1 || row === 0 || row === TILE_HEIGHT - 1;
        px(x, row, isEdge ? line : fill);
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

/** Altura de las puertas de los interiores, en píxeles. */
const DOOR_HEIGHT = 46;

/**
 * Puerta pintada sobre un trozo de pared. Usa la misma geometría que
 * wallSegment() (mismo tamaño y misma inclinación), así que se dibuja en la
 * misma posición, encima de la pared.
 *
 * Es una puerta de madera turquesa con ventanuco y pomo, como las de las
 * caravanas antiguas.
 */
function doorSegment(side: 'left' | 'right'): Sprite {
  return createSprite(HALF_W, WALL_HEIGHT + HALF_H, (px) => {
    const first = 2;
    const last = HALF_W - 3;
    // El pomo va en el lado contrario a las bisagras.
    const knobColumn = side === 'left' ? last - 2 : first + 2;
    for (let c = first; c <= last; c++) {
      const edgeRow = side === 'left' ? HALF_H - 1 - Math.floor(c / 2) : Math.floor(c / 2);
      const top = WALL_HEIGHT - DOOR_HEIGHT; // índice i donde empieza la puerta
      for (let i = top; i < WALL_HEIGHT - 1; i++) {
        const fromTop = i - top;
        let color: string;
        if (c === first || c === last || fromTop === 0) color = C.outline; // marco exterior
        else if (c === first + 1 || c === last - 1 || fromTop === 1) color = C.doorFrame;
        else if (fromTop >= 5 && fromTop <= 14 && c >= first + 3 && c <= last - 3) {
          // Ventanuco con su propio borde.
          const border = fromTop === 5 || fromTop === 14 || c === first + 3 || c === last - 3;
          color = border ? C.outline : C.doorGlass;
        } else if (c === knobColumn && fromTop === 26) color = C.doorKnob;
        else color = C.door;
        px(c, edgeRow + i, color);
      }
    }
  });
}

/**
 * Asfalto con un trozo de la línea central amarilla. La línea va en la
 * dirección del eje X, que en pantalla baja 1 píxel por cada 2 hacia la
 * derecha: la dibujamos de 2 píxeles de grosor, atravesando el centro del rombo.
 */
function roadLineTile(): Sprite {
  const base = floorTile(C.asphalt, C.asphaltLine);
  return createSprite(TILE_WIDTH, TILE_HEIGHT, (px) => {
    // Copiamos el asfalto y pintamos la raya encima.
    const data = base.canvas.getContext('2d')!.getImageData(0, 0, TILE_WIDTH, TILE_HEIGHT).data;
    for (let i = 0; i < TILE_WIDTH * TILE_HEIGHT; i++) {
      if (data[i * 4 + 3] === 0) continue;
      const [r, g, b] = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
      px(i % TILE_WIDTH, Math.floor(i / TILE_WIDTH), `rgb(${r},${g},${b})`);
    }
    for (let t = 0; t < 10; t++) {
      px(11 + t, 6 + Math.floor(t / 2), C.roadPaint);
      px(11 + t, 7 + Math.floor(t / 2), C.roadPaint);
    }
  });
}

export interface RoomSprites {
  floorA: Sprite;
  floorB: Sprite;
  sandA: Sprite;
  sandB: Sprite;
  doorLeft: Sprite;
  doorRight: Sprite;
  sidewalk: Sprite;
  asphalt: Sprite;
  asphaltLine: Sprite;
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
    sandA: floorTile(PALETTE.sand, C.sandLine),
    sandB: floorTile(PALETTE.sandDark, C.sandLine),
    doorLeft: doorSegment('left'),
    doorRight: doorSegment('right'),
    sidewalk: floorTile(C.sidewalk, C.sidewalkLine),
    asphalt: floorTile(C.asphalt, C.asphaltLine),
    asphaltLine: roadLineTile(),
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
