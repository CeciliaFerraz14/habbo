// Puesto de fruta (1x2): dos cajas de fruta delante y una balda con plátanos
// y tomates detrás. Rotación 0: el frente mira a +x.
import { box, type FurniModel } from '../furniture/model';

const CRATE = '#a07a50';

export const fruitStand: FurniModel = {
  boxes: [
    // Balda de atrás, más alta
    box(0, 1, 0, 4, 31, 20, '#8a5a34'),
    box(0, 3, 20, 3, 14, 23, '#f2d23a'),
    box(0, 18, 20, 3, 29, 23, '#c83c3c'),
    // Cajas con naranjas y manzanas
    box(4, 1, 0, 15, 15, 12, CRATE),
    box(4, 17, 0, 15, 31, 12, CRATE),
    box(5, 2, 12, 14, 14, 15, '#e8562e'),
    box(5, 18, 12, 14, 30, 15, '#7bb35b'),
    // Cartelito de precio
    box(14, 6, 15, 15, 10, 20, '#f6e7c8'),
  ],
};
