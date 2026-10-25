// Cactus pequeño en maceta de barro, con un brazo y una flor amarilla.
import { box, type FurniModel } from './model';

const GREEN = '#5aa85a';

export const pottedCactus: FurniModel = {
  boxes: [
    box(4, 4, 0, 12, 12, 8, '#c86a3a'), // maceta
    box(3, 3, 8, 13, 13, 10, '#d8804a'), // borde
    box(6, 6, 10, 10, 10, 26, GREEN), // tronco
    box(10, 7, 14, 13, 9, 17, GREEN), // brazo (codo)
    box(11, 7, 17, 13, 9, 23, GREEN), // brazo (hacia arriba)
    box(7, 7, 26, 9, 9, 28, '#ffe14d'), // flor
  ],
};
