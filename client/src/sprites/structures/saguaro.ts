// Cactus saguaro del desierto, con sus dos brazos y una flor.
import { box, type FurniModel } from '../furniture/model';

const GREEN = '#4c9a4c';

export const saguaro: FurniModel = {
  boxes: [
    box(6, 6, 0, 10, 10, 36, GREEN), // tronco
    box(2, 7, 12, 6, 9, 16, GREEN), // brazo izquierdo (codo)
    box(2, 7, 16, 4, 9, 28, GREEN), // brazo izquierdo (hacia arriba)
    box(10, 7, 18, 14, 9, 22, GREEN), // brazo derecho (codo)
    box(12, 7, 22, 14, 9, 32, GREEN), // brazo derecho (hacia arriba)
    box(7, 7, 36, 9, 9, 38, '#ff4fa3'), // flor
  ],
};
