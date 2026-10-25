// Máquina de discos con remate en arco (escalonado) y luces de colores.
// Rotación 0: el frontal mira a SE (+x).
import { box, glow, type FurniModel } from './model';
import { PALETTE } from '../palette';

const WOOD = '#8a3a2a';

export const jukebox: FurniModel = {
  // Ilumina el suelo delante del frontal.
  light: { color: PALETTE.neonCyan, radius: 14, dx: 0.7 },
  boxes: [
    box(3, 2, 0, 13, 14, 30, WOOD), // cuerpo
    // Arco: dos cajas cada vez más estrechas
    box(4, 3, 30, 12, 13, 34, WOOD),
    box(5, 4, 34, 11, 12, 37, WOOD),
    // Frontal: rejilla del altavoz, tiras de luz y ventanita de los discos
    box(13, 4, 4, 14, 12, 14, '#3a2a2a'),
    glow(13, 3, 16, 14, 13, 18, PALETTE.neonPink),
    glow(13, 3, 21, 14, 13, 23, PALETTE.neonCyan),
    box(13, 5, 24, 14, 11, 29, '#f6e7c8'),
    glow(12, 5, 31, 13, 11, 33, PALETTE.neonYellow),
  ],
};
