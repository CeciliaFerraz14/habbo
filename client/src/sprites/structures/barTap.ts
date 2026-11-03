// Barra con grifo (1x2): mostrador de madera con dos grifos cromados y una
// jarra de cerveza. Rotación 0: el frente mira a +x (hacia los clientes).
import { box, glow, type FurniModel } from '../furniture/model';
import { PALETTE } from '../palette';

const CHROME = '#d8dde3';

export const barTap: FurniModel = {
  boxes: [
    // Cuerpo de madera, zócalo oscuro y encimera
    box(3, 1, 0, 14, 31, 16, '#a0703c'),
    box(14, 1, 0, 15, 31, 3, '#5a3a24'),
    box(2, 0, 16, 16, 32, 19, '#5a3a24'),
    // Dos grifos: columna cromada y pico hacia los clientes
    box(5, 6, 19, 8, 9, 27, CHROME),
    box(8, 6, 24, 12, 9, 27, CHROME),
    box(5, 22, 19, 8, 25, 27, CHROME),
    box(8, 22, 24, 12, 25, 27, CHROME),
    // Jarra con cerveza y espuma
    box(9, 13, 19, 14, 19, 25, PALETTE.ochre),
    box(9, 13, 25, 14, 19, 27, PALETTE.cream),
    // Letrero de neón en la pared de atrás
    glow(2, 8, 32, 3, 24, 36, PALETTE.neonYellow),
  ],
};
