// Cartel de neón "OPEN" sobre un poste: marco rosa y letras cian.
// Rotación 0: el cartel mira a SE (+x).
import { box, glow, type FurniModel } from './model';
import { PALETTE } from '../palette';

const METAL = '#3a3440';

export const openSign: FurniModel = {
  light: { color: PALETTE.neonPink, radius: 16, dx: 0.5 },
  boxes: [
    box(5, 5, 0, 11, 11, 2, METAL), // base
    box(7, 7, 2, 9, 9, 14, METAL), // poste
    box(7, 2, 14, 9, 14, 28, '#1a1414'), // panel
    // Marco
    glow(9, 2, 27, 10, 14, 28, PALETTE.neonPink),
    glow(9, 2, 14, 10, 14, 15, PALETTE.neonPink),
    glow(9, 2, 15, 10, 3, 27, PALETTE.neonPink),
    glow(9, 13, 15, 10, 14, 27, PALETTE.neonPink),
    // Las cuatro letras, como trazos de neón
    glow(9, 4, 18, 10, 5, 24, PALETTE.neonCyan),
    glow(9, 6, 18, 10, 7, 24, PALETTE.neonCyan),
    glow(9, 8, 18, 10, 9, 24, PALETTE.neonCyan),
    glow(9, 10, 18, 10, 12, 24, PALETTE.neonCyan),
  ],
};
