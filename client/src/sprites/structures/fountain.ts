// Fuente de la plaza (2x2): pilón de piedra con agua, una columna en medio y
// una taza arriba de la que cae el agua.
import { box, glow, type FurniModel } from '../furniture/model';

const STONE = '#c9b99a';
const STONE_DARK = '#a8987a';
const WATER = '#4fa3ff';
const WATER_LIGHT = '#8ccaff';

export const fountain: FurniModel = {
  // De noche, el agua refleja un poco de luz.
  light: { color: WATER_LIGHT, radius: 26 },
  boxes: [
    // Pilón y el agua dentro
    box(2, 2, 0, 30, 30, 8, STONE),
    box(4, 4, 8, 28, 28, 9, WATER),
    // Columna y taza
    box(14, 14, 9, 18, 18, 22, STONE_DARK),
    box(10, 10, 22, 22, 22, 25, STONE),
    box(11, 11, 25, 21, 21, 26, WATER_LIGHT),
    // Chorro que sale de arriba
    glow(15, 15, 26, 17, 17, 32, WATER_LIGHT),
  ],
};
