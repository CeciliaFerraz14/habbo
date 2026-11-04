// Diana redonda en un poste: un tablero de anillos concéntricos escalonados.
// Rotación 0: la cara de la diana mira a SE (+x).
//
// Cada anillo sobresale 1 unidad hacia +x del anterior y es 2 unidades más
// pequeño por cada lado: así queda al descubierto una franja de su color que
// el contorno de 1 px de bake.ts no se come.
import { box, type FurniModel } from './model';
import { PALETTE } from '../palette';

const POLE = '#5a3020';
const RIM = '#3a2a2a';
const RED = '#c8384a';

export const dartboard: FurniModel = {
  boxes: [
    box(6, 5, 0, 12, 11, 2, POLE), // base
    box(9, 7, 2, 11, 9, 22, POLE), // poste: atraviesa la placa trasera
    box(10, 1, 13, 11, 15, 31, RIM), // placa trasera fina
    box(11, 2, 14, 12, 14, 30, PALETTE.cream), // anillo exterior
    box(12, 4, 16, 13, 12, 28, RED),
    box(13, 6, 19, 14, 10, 25, PALETTE.cream),
    box(14, 7, 21, 15, 9, 23, RED), // diana
  ],
};
