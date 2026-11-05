// Cama individual (1x2) con cabecero de madera, colchón y colcha turquesa.
// Rotación 0: el lado largo mira a SE (+x); el cabecero está en y pequeña.
import { box, type FurniModel } from './model';

const WOOD = '#8a5a34';
const SHEET = '#f6e7c8';
const QUILT = '#2f8f8a';

export const bed: FurniModel = {
  seatHeight: 12,
  boxes: [
    box(1, 1, 0, 15, 31, 8, WOOD), // somier
    box(1, 0, 0, 15, 3, 17, WOOD), // cabecero
    box(2, 3, 8, 14, 30, 12, SHEET), // colchón
    box(3, 4, 12, 13, 10, 15, '#fff6e0'), // almohada
    box(2, 12, 12, 14, 30, 13, QUILT), // colcha
    box(14, 12, 6, 15, 30, 13, QUILT), // colcha que cae por el lado
  ],
};
