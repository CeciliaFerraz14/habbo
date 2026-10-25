// Cama individual (2x1 baldosas). Rotación 0: mira a SE, cabecero en x pequeña.
import { box, type FurniModel } from './model';

const WOOD = '#8a5a34';

export const bed: FurniModel = {
  boxes: [
    box(0, 1, 0, 3, 15, 22, '#6e4428'), // cabecero
    box(3, 1, 0, 31, 15, 7, WOOD), // estructura
    box(3, 2, 7, 30, 14, 11, '#f0ece0'), // colchón
    box(4, 3, 11, 10, 13, 14, '#ffffff'), // almohada
    box(12, 2, 11, 30, 14, 12, '#4878c8'), // manta
  ],
};
