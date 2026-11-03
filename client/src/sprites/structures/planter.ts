// Bancal base de los productores vegetales (2x2): cajón de madera con tierra y
// cuatro matas. Cada negocio dibuja sus matas (frutas, capullos...).
import { box, type Box, type FurniModel } from '../furniture/model';

/** Verdes de las matas, compartidos por todos los bancales. */
export const LEAF = '#4f9a3a';
export const LEAF_DARK = '#3a7a2a';

/** Esquinas (x, y) de las cuatro matas dentro del cajón. */
const PLANT_SPOTS = [
  [5, 5],
  [17, 5],
  [5, 17],
  [17, 17],
] as const;

/** Cajón con tierra y una mata en cada esquina; `plant` dibuja la mata número `i`. */
export function planter(plant: (x: number, y: number, i: number) => Box[]): FurniModel {
  return {
    boxes: [
      box(2, 2, 0, 30, 30, 8, '#8a5a34'), // cajón
      box(4, 4, 8, 28, 28, 9, '#5a3a24'), // tierra
      ...PLANT_SPOTS.flatMap(([x, y], i) => plant(x, y, i)),
    ],
  };
}
