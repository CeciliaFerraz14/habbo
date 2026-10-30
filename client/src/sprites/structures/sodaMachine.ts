// Máquina de refrescos roja con el panel iluminado, botones y la ranura.
// Rotación 0: el frente mira a +x.
import { box, glow, type FurniModel } from '../furniture/model';
import { PALETTE } from '../palette';

export const sodaMachine: FurniModel = {
  // El panel ilumina el suelo de delante de noche.
  light: { color: '#ff8a8a', radius: 14, dx: 0.6 },
  boxes: [
    box(3, 2, 0, 13, 14, 40, '#c83c3c'), // cuerpo
    glow(13, 3, 24, 14, 13, 37, PALETTE.cream), // panel con el logo
    box(13, 6, 29, 14, 10, 32, '#c83c3c'), // logo (una lata)
    box(13, 10, 12, 14, 12, 22, '#3a3a3a'), // botones
    box(13, 3, 3, 14, 9, 8, '#1a1414'), // ranura de salida
  ],
};
