// Lámpara de pie: base, barra y pantalla.
import { box, type FurniModel } from './model';

export const lamp: FurniModel = {
  boxes: [
    box(5, 5, 0, 11, 11, 2, '#4a4a5a'), // base
    box(7, 7, 2, 9, 9, 30, '#c0c0c8'), // barra
    box(3, 3, 30, 13, 13, 42, '#ffe08a'), // pantalla
  ],
};
