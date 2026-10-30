// Máquina de batidos cromada sobre un mueble crema con franja roja, con dos
// vasos (rosa y turquesa) bajo las varillas.
// Rotación 0: el frontal mira a SE (+x).
import { box, type FurniModel } from './model';

const CHROME = '#d8dde3';
const RED = '#c83c3c';

export const milkshakeMachine: FurniModel = {
  boxes: [
    box(3, 2, 0, 13, 14, 16, '#f6e7c8'), // mueble
    box(13, 2, 6, 14, 14, 9, RED), // franja
    box(5, 4, 16, 10, 12, 30, CHROME), // cuerpo de la máquina
    box(4, 3, 30, 11, 13, 32, RED), // tapa
    // Varillas
    box(10, 5, 22, 12, 6, 26, CHROME),
    box(10, 10, 22, 12, 11, 26, CHROME),
    // Vasos
    box(10, 4, 16, 12, 7, 21, '#ff4fa3'),
    box(10, 9, 16, 12, 12, 21, '#5cc8bd'),
  ],
};
