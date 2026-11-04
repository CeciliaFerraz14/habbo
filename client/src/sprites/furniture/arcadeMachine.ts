// Máquina recreativa: mueble alto con pantalla emisiva, panel de mandos y luz cian.
// Rotación 0: la pantalla y los mandos miran a SE (+x).
import { box, glow, type FurniModel } from './model';
import { PALETTE } from '../palette';

const CABINET = '#2e3a8a';
const CABINET_DARK = '#232c68';
const PANEL = '#3a2a2a';

export const arcadeMachine: FurniModel = {
  // Ilumina el suelo delante de la pantalla.
  light: { color: PALETTE.neonCyan, radius: 14, dx: 0.7 },
  boxes: [
    box(3, 2, 0, 13, 14, 12, CABINET_DARK), // zócalo
    box(3, 2, 12, 13, 14, 20, CABINET), // cuerpo bajo, con el panel de mandos
    box(13, 3, 14, 15, 13, 16, PANEL), // panel de mandos que sale al frente
    box(14, 5, 16, 15, 6, 18, PALETTE.neonPink), // palanca
    box(14, 9, 16, 15, 10, 17, PALETTE.neonYellow), // botón
    box(3, 2, 20, 11, 14, 34, CABINET), // cuerpo alto, retranqueado
    glow(11, 3, 22, 12, 13, 31, PALETTE.neonCyan), // pantalla
    box(3, 2, 34, 12, 14, 38, CABINET_DARK), // remate
    glow(12, 3, 34, 13, 13, 37, PALETTE.neonPink), // rótulo luminoso
  ],
};
