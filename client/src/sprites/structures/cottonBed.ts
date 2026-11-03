// Algodonal: el puesto de trabajo del campo de algodón (2x2). Cajón de madera
// con tierra y cuatro matas con capullos blancos.
import { box, type Box, type FurniModel } from '../furniture/model';
import { PALETTE } from '../palette';

const LEAF = '#4f9a3a';
const LEAF_DARK = '#3a7a2a';

/** Una mata en (x, y) con tres capullos de algodón. */
function plant(x: number, y: number): Box[] {
  return [
    box(x, y, 9, x + 8, y + 8, 16, LEAF_DARK),
    box(x + 1, y + 1, 16, x + 7, y + 7, 20, LEAF),
    box(x, y + 1, 18, x + 4, y + 5, 23, PALETTE.cream),
    box(x + 4, y + 3, 19, x + 8, y + 7, 24, PALETTE.cream),
    box(x + 2, y + 5, 20, x + 6, y + 8, 25, PALETTE.cream),
  ];
}

export const cottonBed: FurniModel = {
  boxes: [
    box(2, 2, 0, 30, 30, 8, '#8a5a34'), // cajón
    box(4, 4, 8, 28, 28, 9, '#5a3a24'), // tierra
    ...plant(5, 5),
    ...plant(17, 5),
    ...plant(5, 17),
    ...plant(17, 17),
  ],
};
