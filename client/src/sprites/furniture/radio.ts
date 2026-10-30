// Radio de válvulas de pie, de madera, con tela del altavoz y dial iluminado.
// Rotación 0: el frontal mira a SE (+x).
import { box, glow, type FurniModel } from './model';

const WOOD = '#7a4a2a';
const AMBER = '#ffb347';

export const radio: FurniModel = {
  // El dial da una luz cálida delante de la radio.
  light: { color: AMBER, radius: 10, dx: 0.6 },
  boxes: [
    box(4, 3, 0, 12, 13, 22, WOOD), // mueble
    box(5, 4, 22, 11, 12, 25, WOOD), // remate (escalón)
    box(12, 4, 4, 13, 12, 14, '#d8c8a0'), // tela del altavoz
    glow(12, 5, 16, 13, 11, 19, AMBER), // dial
    box(12, 5, 20, 13, 7, 22, '#3a2a2a'), // botón izquierdo
    box(12, 9, 20, 13, 11, 22, '#3a2a2a'), // botón derecho
  ],
};
