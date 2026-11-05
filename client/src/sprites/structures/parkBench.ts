// Banco de la plaza (1x2): tablas de madera sobre patas de hierro, con respaldo.
// Rotación 0: mira a SE, respaldo en el lado de x pequeña.
import { backrest, box, type FurniModel } from '../furniture/model';

const WOOD = '#a0703f';
const IRON = '#3a3440';

export const parkBench: FurniModel = {
  seatHeight: 10,
  boxes: [
    // Patas
    box(4, 2, 0, 12, 4, 8, IRON),
    box(4, 28, 0, 12, 30, 8, IRON),
    // Asiento
    box(3, 1, 8, 13, 31, 10, WOOD),
    // Respaldo de dos tablas
    backrest(2, 1, 12, 4, 31, 15, WOOD),
    backrest(2, 1, 17, 4, 31, 20, WOOD),
    backrest(2, 2, 8, 3, 4, 20, IRON),
    backrest(2, 28, 8, 3, 30, 20, IRON),
  ],
};
