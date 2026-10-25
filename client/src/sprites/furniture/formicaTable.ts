// Mesa de formica turquesa con canto cromado y un solo pie central.
import { box, type FurniModel } from './model';

const CHROME = '#d8dde3';

export const formicaTable: FurniModel = {
  boxes: [
    box(4, 4, 0, 12, 12, 2, '#9aa3ad'), // base
    box(7, 7, 2, 9, 9, 16, CHROME), // pie
    box(1, 1, 16, 15, 15, 17, CHROME), // canto
    box(1, 1, 17, 15, 15, 19, '#5cc8bd'), // tablero de formica
  ],
};
