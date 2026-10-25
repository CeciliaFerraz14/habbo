// Nevera de los años 50 color menta, con tirador y placa cromados.
// La puerta mira a SE (+x) en rotación 0.
import { box, type FurniModel } from './model';

const MINT = '#a8e0c8';
const CHROME = '#d8dde3';

export const vintageFridge: FurniModel = {
  boxes: [
    box(3, 3, 0, 13, 13, 38, MINT), // cuerpo
    box(4, 4, 38, 12, 12, 41, MINT), // remate redondeado (escalón)
    box(13, 4, 24, 14, 12, 25, '#7fb8a0'), // separación entre puertas
    box(13, 10, 14, 14, 11, 32, CHROME), // tirador
    box(13, 5, 33, 14, 9, 35, CHROME), // placa de la marca
  ],
};
