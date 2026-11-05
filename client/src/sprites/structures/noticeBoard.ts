// Tablón de anuncios de corcho sobre dos patas, con papeles clavados.
// Rotación 0: el corcho mira a +x.
import { box, type FurniModel } from '../furniture/model';

const WOOD = '#8a5a34';

export const noticeBoard: FurniModel = {
  boxes: [
    // Patas
    box(7, 2, 0, 9, 4, 20, WOOD),
    box(7, 12, 0, 9, 14, 20, WOOD),
    // Marco y corcho
    box(7, 1, 18, 9, 15, 42, WOOD),
    box(9, 2, 19, 10, 14, 41, '#c8a070'),
    // Papeles
    box(10, 3, 31, 11, 7, 38, '#f6e7c8'),
    box(10, 8, 25, 11, 12, 33, '#fff6a0'),
    box(10, 3, 21, 11, 7, 28, '#a6e3d4'),
    box(10, 9, 34, 11, 13, 39, '#ff9fc8'),
  ],
};
