// Sprites del avatar, dibujados como matrices de caracteres.
//
// Leyenda de la paleta:
//   O contorno      E ojos
//   H pelo          h pelo (sombra)
//   S piel          s piel (sombra)
//   T camiseta      t camiseta (sombra)
//   P pantalón      p pantalón (sombra)
//   B zapatos       . transparente
//   G prenda        g prenda (sombra)
//
// Los colores de pelo, piel, camiseta y pantalón salen del AvatarLook, así que
// el mismo dibujo sirve para cualquier combinación del editor de avatar.
//
// Las prendas (look.outfit) son CAPAS: matrices más pequeñas que se hornean
// aparte con su propio color (G y g) y se apilan encima del cuerpo en este
// orden: cuerpo, torso, cabeza, pies. Donde la capa es transparente se ve lo
// de debajo.
//
// Solo dibujamos 2 vistas: de FRENTE (mirando a SE ↘) y de ESPALDAS (mirando a
// NE ↗). Las otras dos (SW ↙ y NW ↖) se obtienen reflejándolas en espejo.
//
// Cada fotograma = parte de arriba (cabeza y torso) + piernas. Así las
// piernas de la animación de caminar se dibujan una sola vez para las 2 vistas.
// Encima de la cabeza siempre hay HEADROOM filas vacías para los sombreros:
// así todos los fotogramas miden lo mismo con sombrero o sin él, y los pies y
// las caderas quedan en la misma fila del sprite.

import { garmentKey, type AvatarLook, type Direction, type Garment, type GarmentId, type GarmentSlot } from '@juego/shared';
import { stackSprites, type Sprite } from './canvas';
import { shade } from './color';
import { PALETTE } from './palette';
import { bakePixelArt, type Palette } from './pixelArt';

export const AVATAR_WIDTH = 16;

/** Filas vacías encima de la cabeza: las que necesita el sombrero más alto. */
const HEADROOM = 3;

// Cabeza de frente: los ojos están desplazados a la derecha para que se note
// que mira hacia la derecha (SE).
const HEAD_FRONT = [
  '....OOOOOOOO....',
  '...OHHHHHHHHO...',
  '..OHHHHHHHHHHO..',
  '..OHHHHHHHHHHO..',
  '..OHHSSSSSSHHO..',
  '..OHSSSSSSSSHO..',
  '..OSSSSSESSESO..',
  '..OSSSSSESSESO..',
  '..OsSSSSSSSSSO..',
  '...OsSSSSSSSO...',
  '....OOOSSOOO....',
];

// Cabeza de espaldas: solo se ve el pelo y la nuca.
const HEAD_BACK = [
  '....OOOOOOOO....',
  '...OHHHHHHHHO...',
  '..OHHHHHHHHHHO..',
  '..OHHHHHHHHHHO..',
  '..OHHHHHHHHHHO..',
  '..OHHHHHHHHHHO..',
  '..OHHHHHHHHHHO..',
  '..OhHHHHHHHHhO..',
  '..OShhhhhhhhSO..',
  '...OSSSSSSSSO...',
  '....OOOSSOOO....',
];

// Torso con los brazos a los lados (igual de frente y de espaldas).
const TORSO = [
  '...OOTTTTTTOO...',
  '..OTTTTTTTTTTO..',
  '.OTTOTTTTTTOTTO.',
  '.OTTOTTTTTTOTTO.',
  '.OTtOTTTTTTOTtO.',
  '.OSSOtTTTTtOSSO.',
  '.OOOOPPPPPPOOOO.',
];

// Piernas: de pie y los dos pasos de la animación de caminar.
// En cada paso, una pierna sube 1 píxel (está "en el aire").
const LEGS_STAND = [
  '....OPPPPPPO....',
  '....OPPOOPPO....',
  '....OPPOOPPO....',
  '....OpPOOpPO....',
  '...OBBBOOBBBO...',
  '...OOOOOOOOOO...',
];

const LEGS_STEP_A = [
  '....OPPPPPPO....',
  '....OPPOOPPO....',
  '....OpPOOPPO....',
  '...OBBBOOpPO....',
  '...OOOOOOBBBO...',
  '........OOOOO...',
];

const LEGS_STEP_B = [
  '....OPPPPPPO....',
  '....OPPOOPPO....',
  '....OPPOOpPO....',
  '....OpPOOBBBO...',
  '...OBBBOOOOOO...',
  '...OOOOO........',
];

// Sentado: los muslos van hacia delante, así que solo asoman los zapatos.
// Este fotograma es 2 píxeles más bajo que los demás.
const LEGS_SIT = [
  '....OPPPPPPO....',
  '...OPPPPPPPPO...',
  '...OBBBOOBBBO...',
  '...OOOOOOOOOO...',
];

const LEGS = [LEGS_STAND, LEGS_STEP_A, LEGS_STEP_B, LEGS_SIT];

/** Índices de fotograma. */
export const FRAME_STAND = 0;
export const FRAME_SIT = 3;
/** Fila del sprite donde empieza el torso (las dos cabezas miden lo mismo). */
const TORSO_ROW = HEADROOM + HEAD_FRONT.length;
/** Fila del sprite donde están las caderas: es la que se apoya en el asiento. */
export const HIP_ROW = TORSO_ROW + TORSO.length;
/** Secuencia de la animación de caminar: paso A, de pie, paso B, de pie... */
export const WALK_CYCLE = [1, 0, 2, 0];

// --- Prendas de la cabeza ---
// Empiezan en la fila 0 del sprite, es decir, en el hueco de HEADROOM.

// Sombrero de cowboy: copa con la hendidura arriba, cinta (g) y ala ancha con
// las puntas levantadas. Es simétrico, así que sirve de frente y de espaldas.
const COWBOY_HAT = [
  '.....OO..OO.....',
  '....OGGOOGGO....',
  '....OGGGGGGO....',
  '....OggggggO....',
  'OO..OGGGGGGO..OO',
  'OGOOGGGGGGGGOOGO',
  '.OgGGGGGGGGGGgO.',
  '..OOOOOOOOOOOO..',
];

// Gorra: la copa es igual de frente y de espaldas; solo cambia la última parte.
const CAP_CROWN = [
  '................',
  '................',
  '.....OOOOOO.....',
  '....OGGGGGGO....',
  '...OGGGGGGGGO...',
  '..OGGGGGGGGGGO..',
];

// De frente, la visera sale hacia la cara (a la derecha, como los ojos) y
// deja una raya de sombra sobre la frente.
const CAP_FRONT = [
  ...CAP_CROWN,
  '..OggggggggggOO.',
  '.........OGGGGGO',
  '..........OOOOO.',
];

// De espaldas, la cinta tiene la abertura del cierre, por la que asoma el pelo.
const CAP_BACK = [...CAP_CROWN, '..OgggO..OgggO..'];

// --- Prendas del torso ---
// Empiezan en TORSO_ROW. La última fila del torso (la cintura) no se tapa, y
// las manos (fila de 'SS' a los lados) tampoco.

// Chaqueta vaquera: mangas hasta las muñecas y, de frente, abierta con las
// solapas (g) a los lados de la camiseta.
const JACKET_FRONT = [
  '...OOGG..GGOO...',
  '..OGGGg..gGGGO..',
  '.OGGOGg..gGOGGO.',
  '.OGGOGG..GGOGGO.',
  '.OGgOGG..GGOGgO.',
  '....OgG..GgO....',
];

// De espaldas: entera, con la costura del canesú (g) a la altura de los hombros.
const JACKET_BACK = [
  '...OOGGGGGGOO...',
  '..OGGGGGGGGGGO..',
  '.OGGOggggggOGGO.',
  '.OGGOGGGGGGOGGO.',
  '.OGgOGGGGGGOGgO.',
  '....OgGGGGgO....',
];

// Chaleco: sin mangas (los brazos siguen con la camiseta) y, de frente,
// abierto: dos paneles con el borde de dentro en sombra.
const VEST_FRONT = [
  '................',
  '....GG....GG....',
  '.....Gg..gG.....',
  '.....Gg..gG.....',
  '.....Gg..gG.....',
  '.....GG..GG.....',
];

const VEST_BACK = [
  '................',
  '....GGGGGGGG....',
  '.....GGGGGG.....',
  '.....GGGGGG.....',
  '.....GGGGGG.....',
  '.....gGGGGg.....',
];

// --- Prendas de los pies ---

/**
 * Botas para unas piernas concretas (empiezan en HIP_ROW). En vez de dibujar
 * unas botas por cada fotograma, se sacan de las piernas: los zapatos (B) se
 * pintan del color de la bota y el píxel de pantalón justo encima de cada
 * zapato también (la caña), con su misma luz o sombra. Así las botas siguen
 * cualquier paso de la animación y la postura de sentado.
 */
function bootsFor(legs: readonly string[]): string[] {
  const shaft: Record<string, string> = { P: 'G', p: 'g' };
  return legs.map((row, y) =>
    [...row]
      .map((ch, x) => {
        if (ch === 'B') return 'G';
        if (legs[y + 1]?.[x] === 'B') return shaft[ch] ?? '.';
        return '.';
      })
      .join(''),
  );
}

type Facing = 'front' | 'back';

/** La capa de cada prenda según hacia dónde mira el avatar y qué piernas lleva. */
const GARMENT_LAYERS: Record<GarmentId, (facing: Facing, legs: readonly string[]) => readonly string[]> = {
  cowboy_hat: () => COWBOY_HAT,
  cap: (facing) => (facing === 'front' ? CAP_FRONT : CAP_BACK),
  denim_jacket: (facing) => (facing === 'front' ? JACKET_FRONT : JACKET_BACK),
  vest: (facing) => (facing === 'front' ? VEST_FRONT : VEST_BACK),
  boots: (_facing, legs) => bootsFor(legs),
};

/** Orden en que se apilan las prendas y fila del sprite donde empieza cada una. */
const SLOT_ORDER: GarmentSlot[] = ['torso', 'head', 'feet'];
const SLOT_ROW: Record<GarmentSlot, number> = { head: 0, torso: TORSO_ROW, feet: HIP_ROW };

const HEADS: Record<Facing, string[]> = { front: HEAD_FRONT, back: HEAD_BACK };
const EMPTY_HEADROOM = Array<string>(HEADROOM).fill('.'.repeat(AVATAR_WIDTH));

/** Para cada dirección: si se ve de frente o de espaldas y si hay que reflejar en espejo. */
const VIEWS: Record<Direction, { facing: Facing; flip: boolean }> = {
  SE: { facing: 'front', flip: false },
  SW: { facing: 'front', flip: true },
  NE: { facing: 'back', flip: false },
  NW: { facing: 'back', flip: true },
};

/** Fotogramas ya horneados de un look: frames[direccion][indice]. */
export type AvatarFrames = Record<Direction, Sprite[]>;

function lookPalette(look: AvatarLook): Palette {
  return {
    O: PALETTE.outline,
    E: PALETTE.outline,
    B: '#3a2a2a',
    H: look.hair,
    h: shade(look.hair, 0.7),
    S: look.skin,
    s: shade(look.skin, 0.82),
    T: look.shirt,
    t: shade(look.shirt, 0.72),
    P: look.pants,
    p: shade(look.pants, 0.72),
  };
}

/** Paleta de una capa de prenda: su color, su sombra y el contorno común. */
function garmentPalette(color: string): Palette {
  return { O: PALETTE.outline, G: color, g: shade(color, 0.72) };
}

// Caché: cada combinación de colores y prendas se hornea una sola vez.
const cache = new Map<string, AvatarFrames>();

export function getAvatarFrames(look: AvatarLook): AvatarFrames {
  const outfitKey = SLOT_ORDER.map((slot) => {
    const garment = look.outfit?.[slot];
    return garment ? garmentKey(garment) : '';
  }).join('|');
  const cacheKey = `${look.hair}|${look.skin}|${look.shirt}|${look.pants}|${outfitKey}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const palette = lookPalette(look);
  const frames = {} as AvatarFrames;
  for (const dir of Object.keys(VIEWS) as Direction[]) {
    const { facing, flip } = VIEWS[dir];
    frames[dir] = LEGS.map((legs) => {
      const body = bakePixelArt([...EMPTY_HEADROOM, ...HEADS[facing], ...TORSO, ...legs], palette, flip);
      const layers = SLOT_ORDER.flatMap((slot) => {
        const garment = look.outfit?.[slot];
        if (!garment) return [];
        const rows = GARMENT_LAYERS[garment.type](facing, legs);
        return [{ sprite: bakePixelArt(rows, garmentPalette(garment.color), flip), y: SLOT_ROW[slot] }];
      });
      return layers.length > 0 ? stackSprites(body, layers) : body;
    });
  }
  cache.set(cacheKey, frames);
  return frames;
}

// Iconos de prendas sueltas (inventario, tiendas, editor de avatar), también
// horneados una sola vez por tipo y color.
const garmentCache = new Map<string, Sprite>();

/**
 * Icono de una prenda suelta: su capa vista de frente (las botas, sobre las
 * piernas de pie), recortada a lo que ocupa y con contorno. Sobre el avatar
 * el contorno lo pone el cuerpo; suelta, sin él, el chaleco o las botas
 * serían manchas de color.
 */
export function getGarmentSprite(garment: Garment): Sprite {
  const key = garmentKey(garment);
  const cached = garmentCache.get(key);
  if (cached) return cached;
  const rows = outlined(trimmed(GARMENT_LAYERS[garment.type]('front', LEGS_STAND)));
  const sprite = bakePixelArt(rows, garmentPalette(garment.color));
  garmentCache.set(key, sprite);
  return sprite;
}

/** Recorta las filas y columnas transparentes de los bordes de una matriz. */
function trimmed(rows: readonly string[]): string[] {
  const used = rows.flatMap((row, y) => [...row].flatMap((ch, x) => (ch === '.' ? [] : [{ x, y }])));
  const xs = used.map((p) => p.x);
  const ys = used.map((p) => p.y);
  const [left, right] = [Math.min(...xs), Math.max(...xs)];
  return rows.slice(Math.min(...ys), Math.max(...ys) + 1).map((row) => row.slice(left, right + 1));
}

/**
 * Añade 1 px de margen alrededor y pinta de contorno (O) cada píxel
 * transparente que toca (arriba, abajo o a un lado) un píxel de la prenda.
 * Donde la prenda ya tiene contorno propio no cambia nada.
 */
function outlined(rows: readonly string[]): string[] {
  const empty = '.'.repeat(rows[0].length + 2);
  const padded = [empty, ...rows.map((row) => `.${row}.`), empty];
  const isGarment = (x: number, y: number) => /[Gg]/.test(padded[y]?.[x] ?? '');
  return padded.map((row, y) =>
    [...row]
      .map((ch, x) =>
        ch === '.' && (isGarment(x - 1, y) || isGarment(x + 1, y) || isGarment(x, y - 1) || isGarment(x, y + 1))
          ? 'O'
          : ch,
      )
      .join(''),
  );
}

/** Sombra ovalada bajo los pies. */
export const SHADOW = bakePixelArt(
  [
    '...xxxxxxxx...',
    '.xxxxxxxxxxxx.',
    'xxxxxxxxxxxxxx',
    '.xxxxxxxxxxxx.',
    '...xxxxxxxx...',
  ],
  { x: 'rgba(60, 30, 10, 0.28)' },
);
