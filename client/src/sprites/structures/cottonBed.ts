// Algodonal: el puesto de trabajo del campo de algodón (2x2). Cajón de madera
// con tierra y cuatro matas con capullos blancos.
import { box, type Box } from '../furniture/model';
import { PALETTE } from '../palette';
import { LEAF, LEAF_DARK, planter } from './planter';

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

export const cottonBed = planter(plant);
