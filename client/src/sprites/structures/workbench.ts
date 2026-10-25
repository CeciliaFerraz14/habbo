// Banco de trabajo: el puesto del taller de muebles (1x2).
// Rotación 0: el frente mira a +x; detrás tiene un panel con herramientas.
import { box, type FurniModel } from '../furniture/model';

const LEG = '#6e4428';
const TOOL = '#9aa3ad';

export const workbench: FurniModel = {
  boxes: [
    // Panel de herramientas en la parte de atrás
    box(0, 1, 14, 2, 31, 40, '#c9a77a'),
    box(2, 6, 24, 3, 8, 34, TOOL),
    box(2, 12, 26, 3, 14, 36, TOOL),
    box(2, 20, 22, 3, 26, 24, '#c83c3c'),
    // Patas, balda inferior y tablero
    box(3, 2, 0, 5, 4, 14, LEG),
    box(3, 28, 0, 5, 30, 14, LEG),
    box(11, 2, 0, 13, 4, 14, LEG),
    box(11, 28, 0, 13, 30, 14, LEG),
    box(3, 5, 5, 13, 27, 6, '#8a5a34'),
    box(2, 1, 14, 14, 31, 17, '#a0643c'),
    // Encima: un tornillo de banco, un tablón y una caja de herramientas
    box(10, 4, 17, 13, 8, 21, '#5a5a6a'),
    box(4, 10, 17, 10, 24, 18, '#d8b07a'),
    box(4, 26, 17, 8, 29, 20, '#c83c3c'),
  ],
};
