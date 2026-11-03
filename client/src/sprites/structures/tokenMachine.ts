// Cambio de fichas (1x2): máquina oscura con ranura, una ficha dorada y una
// pantallita encendida. Rotación 0: el frente mira a +x (hacia los clientes).
import { box, glow, type FurniModel } from '../furniture/model';
import { PALETTE } from '../palette';

export const tokenMachine: FurniModel = {
  boxes: [
    // Cuerpo de la máquina y remate
    box(3, 2, 0, 14, 30, 36, '#2a2a3a'),
    box(2, 1, 36, 15, 31, 40, PALETTE.neonPink),
    // Pantallita
    glow(14, 6, 26, 15, 26, 34, PALETTE.neonCyan),
    // Ranura de las fichas y bandeja
    box(14, 12, 16, 15, 20, 18, PALETTE.outline),
    box(14, 8, 6, 17, 24, 9, '#9aa3ad'),
    // Ficha dorada en la bandeja (mismo color que el cuadradito de las fichas en la interfaz)
    box(15, 14, 9, 17, 18, 13, '#f2b134'),
  ],
};
