// Sombrero de vaquero (recompensa del rango Cowboy del asfalto).
//
// Se pinta encima de la cabeza del avatar: la copa asoma por encima del pelo y
// el ala cae a la altura de la frente. Es simétrico, así que vale para las
// cuatro direcciones. Lo usan el renderer y la vista previa del editor.
import { bakePixelArt } from './pixelArt';
import { PALETTE } from './palette';

export const HAT = bakePixelArt(
  [
    '.....OOOOOO.....',
    '....OHHHHHHO....',
    '....OHHHHHHO....',
    '....ObbbbbbO....',
    'OOOOOHHHHHHOOOOO',
    'OhHHHHHHHHHHHHhO',
    '.OOOOOOOOOOOOOO.',
  ],
  { O: PALETTE.outline, H: '#8a5a34', h: '#6e4428', b: '#3a2a20' },
);

/** Filas que sobresale el sombrero por encima de la cabeza (el ala va en la fila 5). */
export const HAT_RISE = 3;
