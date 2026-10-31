// Jukebox dorada (recompensa del rango Leyenda de la Ruta): la máquina de
// discos de siempre, pero de oro, con luces más vivas.
// Rotación 0: el frontal mira a SE (+x).
import { box, glow, type FurniModel } from './model';
import { PALETTE } from '../palette';

const GOLD = '#d4a017';
const GOLD_DARK = '#a87a10';

export const goldenJukebox: FurniModel = {
  light: { color: PALETTE.neonYellow, radius: 18, dx: 0.7 },
  boxes: [
    box(3, 2, 0, 13, 14, 30, GOLD), // cuerpo
    // Arco: dos cajas cada vez más estrechas
    box(4, 3, 30, 12, 13, 34, GOLD),
    box(5, 4, 34, 11, 12, 37, GOLD_DARK),
    // Frontal: rejilla, tiras de luz y ventanita de los discos
    box(13, 4, 4, 14, 12, 14, GOLD_DARK),
    glow(13, 3, 16, 14, 13, 18, PALETTE.neonPink),
    glow(13, 3, 21, 14, 13, 23, PALETTE.neonYellow),
    box(13, 5, 24, 14, 11, 29, '#fff6e0'),
    glow(12, 5, 31, 13, 11, 33, PALETTE.neonCyan),
  ],
};
