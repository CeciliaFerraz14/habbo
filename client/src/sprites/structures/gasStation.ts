// Gasolinera de Hank. 4x5 baldosas.
// En rotación 0: surtidores y marquesina delante (x alta), caseta detrás (el
// minimarket, con su puerta y su escaparate iluminado).
import { box, glow, type FurniModel } from '../furniture/model';
import { PALETTE } from '../palette';

const RED = '#c83c3c';
const CREAM = '#f3e6c8';
const POST = '#d8d0c0';

export const gasStation: FurniModel = {
  // El escaparate y el cartel iluminan la acera de noche.
  light: { color: '#ffe9b0', radius: 30, dx: 0.6, dy: 1.2 },
  boxes: [
    // Isla de los surtidores
    box(42, 6, 0, 60, 36, 2, '#b8b0a0'),
    box(48, 10, 2, 54, 16, 20, RED),
    box(48, 24, 2, 54, 30, 20, RED),
    box(48, 10, 20, 54, 16, 23, CREAM),
    box(48, 24, 20, 54, 30, 23, CREAM),
    // Postes y marquesina
    box(44, 4, 0, 47, 7, 46, POST),
    box(44, 33, 0, 47, 36, 46, POST),
    box(58, 4, 0, 61, 7, 46, POST),
    box(58, 33, 0, 61, 36, 46, POST),
    box(40, 0, 46, 64, 40, 52, RED),
    box(40, 0, 52, 64, 40, 54, CREAM),
    // Caseta con puerta, escaparate polvoriento y franja roja
    box(4, 44, 0, 34, 78, 34, CREAM),
    box(4, 44, 34, 36, 78, 38, RED),
    box(34, 48, 0, 35, 56, 24, '#7a5234'),
    glow(34, 60, 10, 35, 76, 26, '#ffe9b0'),
    // Neón "OPEN" sobre la puerta
    glow(35, 47, 27, 36, 57, 31, PALETTE.neonPink),
    // Poste con el cartel de precios
    box(54, 66, 0, 56, 68, 64, '#8a8a8a'),
    box(54, 60, 64, 56, 74, 80, RED),
    glow(56, 62, 67, 57, 72, 77, CREAM),
  ],
};
