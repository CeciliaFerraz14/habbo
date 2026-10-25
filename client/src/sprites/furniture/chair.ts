// Silla de madera con cojín. Rotación 0: mira a SE, respaldo en el lado de x pequeña.
import { backrest, box, type FurniModel } from './model';

const WOOD = '#a0643c';
const CUSHION = '#d94a5a';

export const chair: FurniModel = {
  seatHeight: 12,
  boxes: [
    // Patas (x0, y0, z0, x1, y1, z1)
    box(4, 4, 0, 6, 6, 8, WOOD),
    box(10, 4, 0, 12, 6, 8, WOOD),
    box(4, 10, 0, 6, 12, 8, WOOD),
    box(10, 10, 0, 12, 12, 8, WOOD),
    // Asiento y cojín
    box(3, 3, 8, 13, 13, 10, WOOD),
    box(5, 4, 10, 12, 12, 12, CUSHION),
    // Respaldo
    backrest(3, 3, 10, 5, 13, 26, WOOD),
  ],
};
