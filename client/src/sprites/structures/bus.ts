// Autobús de turistas de tres baldosas de largo. Rotación 0: el morro mira a +x.
// La variante es el color de la carrocería (por ejemplo '#f2b134').
// Faros y pilotos dan luz de noche, como los del coche.
import { box, glow, type Box, type FurniModel } from '../furniture/model';

const TIRE = '#2a2a2a';
const GLASS = '#a6e3d4';

/** Fila de ventanillas en el lateral que se ve (y alta). */
function windows(): Box[] {
  const boxes: Box[] = [];
  for (let i = 0; i < 5; i++) boxes.push(box(5 + i * 8, 14, 13, 11 + i * 8, 15, 19, GLASS));
  return boxes;
}

export function bus(variant: string | undefined): FurniModel {
  const paint = variant ?? '#f2b134';
  return {
    light: { color: '#ffe14d', radius: 24, dx: 2.2 },
    boxes: [
      // Ruedas
      box(6, 1, 0, 11, 3, 5, TIRE),
      box(36, 1, 0, 41, 3, 5, TIRE),
      box(6, 13, 0, 11, 15, 5, TIRE),
      box(36, 13, 0, 41, 15, 5, TIRE),
      // Carrocería, techo y franja roja
      box(1, 2, 3, 47, 14, 22, paint),
      box(2, 3, 22, 46, 13, 24, '#f6e7c8'),
      box(1, 14, 8, 47, 15, 10, '#c83c3c'),
      ...windows(),
      // Parabrisas y puerta
      box(47, 3, 12, 48, 13, 20, GLASS),
      box(42, 14, 3, 46, 15, 19, '#3a3434'),
      // Faros y pilotos
      glow(47, 3, 5, 48, 5, 8, '#ffe14d'),
      glow(47, 11, 5, 48, 13, 8, '#ffe14d'),
      glow(0, 3, 5, 1, 5, 8, '#ff4f4f'),
      glow(0, 11, 5, 1, 13, 8, '#ff4f4f'),
    ],
  };
}
