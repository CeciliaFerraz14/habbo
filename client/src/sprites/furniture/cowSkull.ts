// Calavera de vaca sobre una piedra, con los cuernos hacia los lados.
// Rotación 0: el hocico mira a SE (+x).
import { box, type FurniModel } from './model';

const BONE = '#f3ead8';
const DARK = '#2a1a14';

export const cowSkull: FurniModel = {
  boxes: [
    box(2, 3, 0, 14, 13, 4, '#b8a088'), // piedra
    box(4, 5, 4, 11, 11, 11, BONE), // cráneo
    box(11, 6, 4, 14, 10, 8, BONE), // hocico
    // Cuernos: hacia fuera y luego hacia arriba
    box(6, 0, 9, 8, 5, 11, BONE),
    box(6, 11, 9, 8, 16, 11, BONE),
    box(6, 0, 11, 8, 2, 15, BONE),
    box(6, 14, 11, 8, 16, 15, BONE),
    // Cuencas de los ojos
    box(11, 6, 9, 12, 7, 10, DARK),
    box(11, 9, 9, 12, 10, 10, DARK),
  ],
};
