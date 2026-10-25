// Sprites del avatar, dibujados como matrices de caracteres.
//
// Leyenda de la paleta:
//   O contorno      E ojos
//   H pelo          h pelo (sombra)
//   S piel          s piel (sombra)
//   T camiseta      t camiseta (sombra)
//   P pantalón      p pantalón (sombra)
//   B zapatos       . transparente
//
// Los colores de pelo, piel, camiseta y pantalón salen del AvatarLook, así que
// el mismo dibujo sirve para cualquier combinación del editor de avatar.
//
// Solo dibujamos 2 vistas: de FRENTE (mirando a SE ↘) y de ESPALDAS (mirando a
// NE ↗). Las otras dos (SW ↙ y NW ↖) se obtienen reflejándolas en espejo.
//
// Cada fotograma = parte de arriba (cabeza y torso) + piernas. Así las
// piernas de la animación de caminar se dibujan una sola vez para las 2 vistas.

import type { AvatarLook, Direction } from '@juego/shared';
import type { Sprite } from './canvas';
import { shade } from './color';
import { bakePixelArt, type Palette } from './pixelArt';

export const AVATAR_WIDTH = 16;
export const AVATAR_HEIGHT = 24;

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

const LEGS = [LEGS_STAND, LEGS_STEP_A, LEGS_STEP_B];

/** Índices de fotograma. */
export const FRAME_STAND = 0;
/** Secuencia de la animación de caminar: paso A, de pie, paso B, de pie... */
export const WALK_CYCLE = [1, 0, 2, 0];

/** Para cada dirección: qué cabeza usar y si hay que reflejar en espejo. */
const VIEWS: Record<Direction, { head: string[]; flip: boolean }> = {
  SE: { head: HEAD_FRONT, flip: false },
  SW: { head: HEAD_FRONT, flip: true },
  NE: { head: HEAD_BACK, flip: false },
  NW: { head: HEAD_BACK, flip: true },
};

/** Fotogramas ya horneados de un look: frames[direccion][indice]. */
export type AvatarFrames = Record<Direction, Sprite[]>;

function lookPalette(look: AvatarLook): Palette {
  return {
    O: '#141428',
    E: '#141428',
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

// Caché: cada combinación de colores se hornea una sola vez.
const cache = new Map<string, AvatarFrames>();

export function getAvatarFrames(look: AvatarLook): AvatarFrames {
  const cacheKey = `${look.hair}|${look.skin}|${look.shirt}|${look.pants}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const palette = lookPalette(look);
  const frames = {} as AvatarFrames;
  for (const dir of Object.keys(VIEWS) as Direction[]) {
    const { head, flip } = VIEWS[dir];
    frames[dir] = LEGS.map((legs) => bakePixelArt([...head, ...TORSO, ...legs], palette, flip));
  }
  cache.set(cacheKey, frames);
  return frames;
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
  { x: 'rgba(20, 20, 40, 0.3)' },
);
