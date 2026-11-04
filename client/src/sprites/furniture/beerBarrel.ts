// Barril de madera en pie: silueta escalonada, más ancha en el centro, con dos
// aros oscuros, tapa y un grifo en el frontal.
// Rotación 0: el frontal (y el grifo) mira a SE (+x).
import { box, type FurniModel } from './model';
import { PALETTE } from '../palette';

const WOOD = '#a8683a';
const WOOD_DARK = '#7a4630';
const HOOP = '#3a2a2a';

export const beerBarrel: FurniModel = {
  boxes: [
    box(4, 4, 0, 12, 12, 4, WOOD), // base, más estrecha
    box(3, 3, 4, 13, 13, 14, WOOD), // panza
    box(2, 2, 5, 14, 14, 6, HOOP), // aro bajo
    box(2, 2, 12, 14, 14, 13, HOOP), // aro alto
    box(4, 4, 14, 12, 12, 18, WOOD), // cuello
    box(5, 5, 18, 11, 11, 19, WOOD_DARK), // tapa
    box(14, 7, 7, 16, 9, 10, PALETTE.ochre), // grifo
  ],
};
