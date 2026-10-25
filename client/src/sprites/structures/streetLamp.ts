// Farola de la acera. El brazo apunta a +y (hacia la carretera con rotación 0).
import { box, glow, type FurniModel } from '../furniture/model';

const METAL = '#4a4a5a';

export const streetLamp: FurniModel = {
  // Charco de luz bajo la bombilla, que cuelga hacia +y.
  light: { color: '#ffd36e', radius: 32, dy: 0.5 },
  boxes: [
    box(6, 6, 0, 10, 10, 3, METAL),
    box(7, 7, 3, 9, 9, 52, METAL),
    box(7, 9, 50, 9, 15, 52, METAL),
    box(6, 12, 45, 10, 16, 50, METAL),
    // La bombilla: se encenderá de noche
    glow(7, 13, 43, 9, 15, 45, '#ffe14d'),
  ],
};
