// Estantería con libros (1x2 baldosas). Rotación 0: mira a SE, fondo en x pequeña.
import { box, type FurniModel } from './model';

const WOOD = '#a0643c';
const BACK = '#6e4428';

export const shelf: FurniModel = {
  boxes: [
    box(0, 0, 0, 2, 32, 46, BACK), // fondo
    box(2, 0, 0, 8, 2, 46, WOOD), // lateral lejano
    box(2, 30, 0, 8, 32, 46, WOOD), // lateral cercano
    // Baldas
    box(2, 2, 0, 8, 30, 3, WOOD),
    box(2, 2, 14, 8, 30, 16, WOOD),
    box(2, 2, 29, 8, 30, 31, WOOD),
    box(2, 2, 43, 8, 30, 46, WOOD),
    // Libros de la balda de abajo
    box(3, 3, 3, 7, 6, 12, '#c83c3c'),
    box(3, 6, 3, 7, 8, 11, '#3c78c8'),
    box(3, 8, 3, 7, 11, 13, '#48a050'),
    box(3, 14, 3, 7, 17, 10, '#e0b040'),
    box(3, 22, 3, 7, 26, 12, '#8048b0'),
    // Libros de la balda del medio
    box(3, 4, 16, 7, 7, 26, '#48a050'),
    box(3, 7, 16, 7, 9, 25, '#e0b040'),
    box(3, 18, 16, 7, 21, 27, '#c83c3c'),
    box(3, 21, 16, 7, 24, 24, '#3c78c8'),
    // Libros de la balda de arriba
    box(3, 5, 31, 7, 8, 40, '#8048b0'),
    box(3, 24, 31, 7, 28, 41, '#48a050'),
  ],
};
