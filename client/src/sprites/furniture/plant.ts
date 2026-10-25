// Planta en maceta. La maceta son cajas; las hojas, una matriz de píxeles.
import { box, type FurniModel } from './model';

export const plant: FurniModel = {
  boxes: [
    box(4, 4, 0, 12, 12, 10, '#c86a3a'), // maceta
    box(3, 3, 10, 13, 13, 12, '#d8804a'), // borde
  ],
  decals: [
    {
      // G hoja, g hoja oscura, L brillo
      rows: [
        '.......GG.......',
        '....GG.GLG.GG...',
        '...GLGGGgGGLGG..',
        '..GGGgGGGGGgGGG.',
        '.GLGGGGgGLGGGgG.',
        '.GGGgGGGGgGGGGG.',
        'GGgGGLGgGGGGgGLG',
        'GGGGgGGGGGgGGGGg',
        '.GGgGGGgGGGGGgG.',
        '..GGGGGGGgGGGG..',
        '...GgGGGGGGgG...',
        '....GGGgGGGG....',
        '......GgGG......',
        '.......gg.......',
      ],
      palette: { G: '#4caf50', g: '#2e7d32', L: '#9be15d' },
      // Anclado en el centro de la maceta, encima del borde.
      x: 0.5,
      y: 0.5,
      z: 12,
    },
  ],
};
