// Mecedora de porche de madera, con patines largos y cojín rojo.
// Rotación 0: mira a SE, respaldo en el lado de x pequeña.
import { backrest, box, type FurniModel } from './model';

const WOOD = '#a07a50';
const WOOD_DARK = '#7a5234';

export const rockingChair: FurniModel = {
  seatHeight: 11,
  boxes: [
    // Patines (más largos que la silla, como los de una mecedora)
    box(1, 3, 0, 15, 5, 2, WOOD_DARK),
    box(1, 11, 0, 15, 13, 2, WOOD_DARK),
    // Patas
    box(4, 3, 2, 6, 5, 8, WOOD),
    box(10, 3, 2, 12, 5, 8, WOOD),
    box(4, 11, 2, 6, 13, 8, WOOD),
    box(10, 11, 2, 12, 13, 8, WOOD),
    box(4, 3, 8, 12, 13, 10, WOOD), // asiento
    box(5, 4, 10, 12, 12, 11, '#c8384a'), // cojín
    backrest(3, 3, 10, 5, 13, 26, WOOD), // respaldo
  ],
};
