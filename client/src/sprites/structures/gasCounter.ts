// Mostrador de Hank en la gasolinera (1x2): rojo con encimera crema, caja
// registradora, tarro de caramelos y el expositor de rasca y gana.
// Rotación 0: el frente mira a +x (hacia los clientes).
import { box, glow, type FurniModel } from '../furniture/model';
import { PALETTE } from '../palette';

const RED = '#c83c3c';

export const gasCounter: FurniModel = {
  boxes: [
    box(3, 1, 0, 14, 31, 16, RED), // cuerpo
    box(14, 1, 6, 15, 31, 8, '#d8dde3'), // franja cromada
    box(1, 0, 16, 16, 32, 19, PALETTE.cream), // encimera
    // Caja registradora con su pantallita verde
    box(4, 18, 19, 10, 27, 26, '#3a3440'),
    glow(10, 19, 22, 11, 26, 25, '#7be35b'),
    // Tarro de caramelos
    box(6, 3, 19, 10, 8, 25, '#a6e3d4'),
    box(7, 4, 25, 9, 7, 26, RED),
    // Expositor de boletos de rasca y gana
    box(11, 10, 19, 13, 16, 25, PALETTE.neonYellow),
  ],
};
