// Pozo: el puesto de trabajo del pozo (2x2). Brocal de piedra con agua, dos
// postes con tejadillo y un cubo colgando.
import { box, type FurniModel } from '../furniture/model';

const STONE = '#9a8f84';
const WOOD = '#8a5a34';

export const waterWell: FurniModel = {
  boxes: [
    // Brocal de piedra (cuatro muros) y el agua dentro
    box(4, 4, 0, 28, 7, 14, STONE),
    box(4, 25, 0, 28, 28, 14, STONE),
    box(4, 7, 0, 7, 25, 14, STONE),
    box(25, 7, 0, 28, 25, 14, STONE),
    box(7, 7, 0, 25, 25, 10, '#3f7fbf'),
    // Postes, travesaño y tejadillo
    box(5, 14, 14, 7, 18, 40, WOOD),
    box(25, 14, 14, 27, 18, 40, WOOD),
    box(5, 15, 36, 27, 17, 38, '#6e4428'),
    box(2, 8, 40, 30, 24, 44, '#b5532f'),
    // Cubo colgando de la cuerda
    box(15, 15, 30, 17, 17, 36, '#c9a77a'),
    box(13, 13, 22, 19, 19, 30, '#9aa3ad'),
  ],
};
