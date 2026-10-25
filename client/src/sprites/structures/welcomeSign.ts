// Cartel de bienvenida al pueblo, sobre dos postes. 1x2 baldosas.
import { box, type FurniModel } from '../furniture/model';

const WOOD = '#8a5a34';
const RED = '#c0503a';

export const welcomeSign: FurniModel = {
  boxes: [
    box(6, 4, 0, 8, 6, 26, WOOD),
    box(6, 26, 0, 8, 28, 26, WOOD),
    box(5, 0, 26, 8, 32, 46, '#f3e6c8'),
    box(8, 1, 27, 9, 31, 28, RED),
    box(8, 1, 44, 9, 31, 45, RED),
    box(8, 2, 32, 9, 30, 38, '#2f8f8a'),
  ],
};
