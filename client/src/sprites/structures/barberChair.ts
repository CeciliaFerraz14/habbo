// Sillón de barbero (1x2): espejo en la pared de atrás, sillón rojo sobre pie
// cromado y el poste de rayas de las barberías.
// Rotación 0: el sillón mira a +x.
import { box, type FurniModel } from '../furniture/model';

const RED = '#c83c3c';
const CHROME = '#d8dde3';

export const barberChair: FurniModel = {
  boxes: [
    // Espejo con marco
    box(0, 4, 14, 2, 26, 44, '#c9a77a'),
    box(2, 6, 18, 3, 24, 40, '#a6e3d4'),
    // Pie, asiento, respaldo y reposabrazos
    box(7, 12, 0, 11, 18, 8, CHROME),
    box(5, 9, 8, 14, 21, 13, RED),
    box(4, 9, 13, 6, 21, 30, RED),
    box(5, 8, 13, 14, 9, 17, CHROME),
    box(5, 21, 13, 14, 22, 17, CHROME),
    // Poste de barbero: blanco con franjas roja y azul
    box(6, 27, 0, 9, 30, 32, '#f6e7c8'),
    box(6, 27, 6, 9, 30, 9, RED),
    box(6, 27, 14, 9, 30, 17, '#4a78ab'),
    box(6, 27, 22, 9, 30, 25, RED),
    box(5, 26, 32, 10, 31, 34, CHROME),
  ],
};
