// Mostrador de la tienda (1x2): turquesa con encimera crema y caja registradora.
// Rotación 0: el frente mira a +x (hacia los clientes).
import { box, glow, type FurniModel } from '../furniture/model';
import { PALETTE } from '../palette';

export const shopCounter: FurniModel = {
  boxes: [
    box(3, 1, 0, 14, 31, 16, '#2f8f8a'), // cuerpo
    box(14, 1, 0, 15, 31, 3, '#d8dde3'), // zócalo cromado
    box(1, 0, 16, 16, 32, 19, PALETTE.cream), // encimera
    // Caja registradora con su pantallita
    box(4, 18, 19, 10, 26, 26, '#9aa3ad'),
    glow(10, 19, 22, 11, 25, 25, PALETTE.neonCyan),
  ],
};
