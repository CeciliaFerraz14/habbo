// Alfombra de 2x2. Es "walkable": se dibuja a ras de suelo y se puede pisar.
import { box, type FurniModel } from './model';

export const rug: FurniModel = {
  // Las cajas solapadas se pintan en el orden de la lista: cada una encima de la anterior.
  boxes: [
    box(1, 1, 0, 31, 31, 1, '#b03a48'),
    box(4, 4, 0, 28, 28, 1, '#e0b040'),
    box(10, 10, 0, 22, 22, 1, '#b03a48'),
  ],
};
