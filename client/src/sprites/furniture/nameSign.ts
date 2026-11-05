// Cartel de neón con el nombre de su dueño (recompensa del rango Tendero).
// Marco cian sobre un panel oscuro y un poste. El nombre lo escribe la interfaz
// encima del panel (ui/furniLabels.ts), con las medidas de NAME_SIGN_TEXT.
// Rotación 0: el panel mira a +x.
import { box, glow, type FurniModel } from './model';
import { PALETTE } from '../palette';

const METAL = '#3a3440';

/** Zona del panel donde va el nombre (plano x = 11; y de 2 a 14; z de 18 a 32). */
export const NAME_SIGN_TEXT = { x: 11, y0: 2, y1: 14, z0: 18, z1: 32 };

export const nameSign: FurniModel = {
  light: { color: PALETTE.neonCyan, radius: 18, dx: 0.5 },
  boxes: [
    box(5, 5, 0, 11, 11, 2, METAL), // base
    box(7, 7, 2, 9, 9, 16, METAL), // poste
    box(7, 1, 16, 10, 15, 34, '#1a1414'), // panel
    // Marco de neón
    glow(10, 1, 33, 11, 15, 34, PALETTE.neonCyan),
    glow(10, 1, 16, 11, 15, 17, PALETTE.neonCyan),
    glow(10, 1, 17, 11, 2, 33, PALETTE.neonCyan),
    glow(10, 14, 17, 11, 15, 33, PALETTE.neonCyan),
  ],
};
