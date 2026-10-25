// Lámpara de pie con dos tubos de neón (rosa y cian).
import { box, glow, type FurniModel } from './model';
import { PALETTE } from '../palette';

const BASE = '#3a3440';

export const neonLamp: FurniModel = {
  light: { color: PALETTE.neonPink, radius: 20 },
  boxes: [
    box(5, 5, 0, 11, 11, 3, BASE),
    glow(7, 7, 3, 9, 9, 34, PALETTE.neonPink),
    glow(7, 10, 6, 9, 12, 28, PALETTE.neonCyan),
    box(6, 6, 34, 10, 10, 36, BASE),
  ],
};
