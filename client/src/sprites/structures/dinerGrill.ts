// Plancha del diner (1x2): mueble cromado con la plancha, dos hamburguesas,
// botes de kétchup y mostaza, y la pizarra del menú detrás.
// Rotación 0: el frente mira a +x (hacia los clientes).
import { box, glow, type FurniModel } from '../furniture/model';
import { PALETTE } from '../palette';

const PATTY = '#7a4a2a';

export const dinerGrill: FurniModel = {
  boxes: [
    // Pizarra del menú en la pared de atrás, con letras de neón
    box(0, 4, 20, 2, 28, 42, '#3a3434'),
    glow(2, 8, 36, 3, 24, 38, PALETTE.neonYellow),
    glow(2, 8, 30, 3, 20, 32, PALETTE.neonPink),
    // Cuerpo cromado, zócalo rojo y encimera
    box(3, 1, 0, 14, 31, 16, '#d8dde3'),
    box(14, 1, 0, 15, 31, 3, '#c83c3c'),
    box(2, 0, 16, 16, 32, 19, PALETTE.cream),
    // Plancha con dos hamburguesas
    box(4, 3, 19, 13, 20, 20, '#3a3434'),
    box(6, 6, 20, 10, 10, 22, PATTY),
    box(6, 13, 20, 10, 17, 22, PATTY),
    // Kétchup y mostaza
    box(5, 24, 19, 7, 26, 26, '#d94040'),
    box(9, 24, 19, 11, 26, 26, '#f2b134'),
  ],
};
