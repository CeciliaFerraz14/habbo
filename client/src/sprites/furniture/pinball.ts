// Pinball (1x2): mesa inclinada sobre patas, tablero emisivo y cabecera alta con luz rosa.
// Rotación 0: el jugador está en el lado de x grande; la cabecera, en x pequeña.
import { box, glow, type FurniModel } from './model';
import { PALETTE } from '../palette';

const BODY = '#8a1f3a';
const LEG = '#d8dde3';

export const pinball: FurniModel = {
  // Ilumina el suelo delante del jugador.
  light: { color: PALETTE.neonPink, radius: 16, dx: 0.6 },
  boxes: [
    box(2, 2, 0, 4, 4, 10, LEG), // patas
    box(2, 28, 0, 4, 30, 10, LEG),
    box(12, 2, 0, 14, 4, 8, LEG),
    box(12, 28, 0, 14, 30, 8, LEG),
    // Mesa inclinada: más alta en la cabecera (x pequeña) que en el frontal
    box(2, 1, 10, 7, 31, 16, BODY),
    box(7, 1, 8, 15, 31, 14, BODY),
    glow(7, 3, 14, 14, 29, 15, PALETTE.neonCyan), // tablero emisivo
    glow(11, 7, 15, 12, 10, 16, PALETTE.neonYellow), // bumper
    glow(11, 22, 15, 12, 25, 16, PALETTE.neonYellow), // bumper
    // Cabecera alta
    box(1, 1, 16, 4, 31, 38, BODY),
    glow(4, 3, 24, 5, 29, 36, PALETTE.neonPink), // marcador
  ],
};
