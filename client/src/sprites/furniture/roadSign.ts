// Señal de tráfico amarilla con una flecha negra, en su poste.
// La placa mira a SE (+x) en rotación 0.
import { box, type FurniModel } from './model';

const BLACK = '#2a1a14';

export const roadSign: FurniModel = {
  boxes: [
    box(7, 7, 0, 9, 9, 30, '#9aa3ad'), // poste
    box(9, 2, 22, 10, 14, 34, '#f2b134'), // placa
    // Flecha: palo horizontal y punta
    box(10, 4, 27, 11, 11, 29, BLACK),
    box(10, 9, 25, 11, 11, 31, BLACK),
  ],
};
