// Mesa cuadrada de madera.
import { box, type FurniModel } from './model';

const TOP = '#b87848';
const LEGS = '#7a4a2a';

export const table: FurniModel = {
  boxes: [
    box(2, 2, 0, 4, 4, 14, LEGS),
    box(12, 2, 0, 14, 4, 14, LEGS),
    box(2, 12, 0, 4, 14, 14, LEGS),
    box(12, 12, 0, 14, 14, 14, LEGS),
    box(1, 1, 14, 15, 15, 17, TOP),
  ],
};
