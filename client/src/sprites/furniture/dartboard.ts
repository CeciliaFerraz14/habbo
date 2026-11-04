// Diana redonda en un poste, con anillos alternos rojo y crema.
// Rotación 0: la cara de la diana mira a SE (+x).
import { box, type FurniModel } from './model';
import { PALETTE } from '../palette';

const POLE = '#5a3020';
const RED = '#c8384a';

export const dartboard: FurniModel = {
  boxes: [
    box(5, 5, 0, 11, 11, 2, POLE), // base
    box(7, 7, 2, 9, 9, 18, POLE), // poste
    // Disco escalonado: un octógono aproximado con tres cajas
    box(11, 4, 20, 12, 12, 28, '#3a2a2a'), // aro exterior (borde oscuro)
    box(11, 3, 21, 12, 13, 27, '#3a2a2a'),
    box(12, 5, 21, 13, 11, 27, PALETTE.cream), // anillo crema
    box(12, 4, 22, 13, 12, 26, PALETTE.cream),
    box(13, 6, 22, 14, 10, 26, RED), // anillo rojo
    box(13, 5, 23, 14, 11, 25, RED),
    box(14, 7, 23, 15, 9, 25, PALETTE.cream), // centro
  ],
};
