// Sofá de dos plazas (1x2) de terciopelo mostaza, con brazos y dos cojines.
// Rotación 0: mira a SE, respaldo en el lado de x pequeña.
import { backrest, box, type FurniModel } from './model';

const VELVET = '#c9851c';
const VELVET_LIGHT = '#f2b134';
const CUSHION = '#ffd36e';

export const sofa: FurniModel = {
  seatHeight: 12,
  boxes: [
    box(2, 1, 0, 14, 31, 9, VELVET), // base
    // Respaldo bajo, para que asome la cabeza de quien se sienta mirando al fondo
    backrest(1, 1, 9, 5, 31, 22, VELVET_LIGHT),
    // Brazos
    box(5, 1, 9, 14, 4, 15, VELVET_LIGHT),
    box(5, 28, 9, 14, 31, 15, VELVET_LIGHT),
    // Dos cojines
    box(5, 4, 9, 14, 16, 12, CUSHION),
    box(5, 16, 9, 14, 28, 12, CUSHION),
  ],
};
