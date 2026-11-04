// Barril tumbado sobre un caballete, con aros metálicos y un grifo en el frontal.
// Rotación 0: el frontal (y el grifo) mira a SE (+x).
import { box, type FurniModel } from './model';

const WOOD = '#a8683a';
const WOOD_DARK = '#7a4630';
const IRON = '#6b747e';

export const beerBarrel: FurniModel = {
  boxes: [
    box(2, 3, 0, 4, 13, 7, WOOD_DARK), // caballete, lado de atrás
    box(12, 3, 0, 14, 13, 7, WOOD_DARK), // caballete, lado del frontal
    // Barril: tres cajas, más estrecho en los extremos para dar panza
    box(3, 4, 7, 13, 12, 14, WOOD),
    box(4, 3, 8, 12, 13, 13, WOOD),
    box(5, 3, 7, 6, 13, 14, IRON), // aro
    box(10, 3, 7, 11, 13, 14, IRON), // aro
    box(13, 7, 9, 15, 9, 11, IRON), // grifo
    box(14, 7, 7, 15, 9, 9, IRON), // pico del grifo
  ],
};
