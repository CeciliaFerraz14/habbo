// Máquina recreativa morada con pantalla cian, cartel rosa y panel de mandos.
// Rotación 0: la pantalla mira a +x.
import { box, glow, type FurniModel } from '../furniture/model';
import { PALETTE } from '../palette';

export const arcadeCabinet: FurniModel = {
  light: { color: PALETTE.neonCyan, radius: 14, dx: 0.6 },
  boxes: [
    box(3, 3, 0, 13, 13, 38, '#3a2a6a'), // mueble
    glow(13, 4, 22, 14, 12, 32, PALETTE.neonCyan), // pantalla
    glow(12, 3, 34, 14, 13, 38, PALETTE.neonPink), // cartel de arriba
    // Panel de mandos con dos botones
    box(12, 3, 16, 15, 13, 19, '#2a2a2a'),
    box(13, 5, 19, 14, 7, 20, '#c83c3c'),
    box(13, 9, 19, 14, 11, 20, PALETTE.neonYellow),
  ],
};
