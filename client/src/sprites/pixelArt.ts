// Sistema de sprites definidos como matrices de texto.
//
// Cada sprite es un array de strings: una string por fila y un carácter por
// píxel. Cada carácter se busca en una paleta para saber su color. El punto
// '.' es transparente. Ejemplo (un corazón de 5x4):
//
//   rows:    ['.R.R.',
//             'RRRRR',
//             '.RRR.',
//             '..R..']
//   palette: { R: '#e03030' }
//
// Al arrancar, cada matriz se "hornea" (bake) en un canvas offscreen una sola
// vez. Después, dibujarla en pantalla es un único drawImage(), muy rápido.

import { createSprite, type Sprite } from './canvas';

/** Relaciona cada carácter de la matriz con un color CSS. */
export type Palette = Record<string, string>;

const TRANSPARENT = '.';

/**
 * Convierte una matriz de caracteres en un sprite.
 * @param flipX si es true, genera la imagen reflejada en horizontal (espejo).
 *              Así un avatar mirando a la derecha nos sirve también para la izquierda.
 */
export function bakePixelArt(rows: readonly string[], palette: Palette, flipX = false): Sprite {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;

  // Comprobamos la matriz para detectar errores al dibujar sprites a mano.
  rows.forEach((row, i) => {
    if (row.length !== width) {
      throw new Error(`Sprite mal formado: la fila ${i} mide ${row.length} y debería medir ${width}`);
    }
  });

  return createSprite(width, height, (px) => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const ch = rows[y][x];
        if (ch === TRANSPARENT) continue;
        const color = palette[ch];
        if (!color) throw new Error(`Sprite: el carácter '${ch}' no está en la paleta`);
        // En espejo, la columna x se pinta en la posición simétrica.
        px(flipX ? width - 1 - x : x, y, color);
      }
    }
  });
}
