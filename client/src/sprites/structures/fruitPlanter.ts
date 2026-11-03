// Bancal: el puesto de trabajo del invernadero (2x2). Cajón de madera con
// tierra y cuatro matas cargadas de fruta.
import { box, type Box } from '../furniture/model';
import { LEAF, LEAF_DARK, planter } from './planter';

const FRUITS = ['#e8562e', '#f2b134', '#c83c3c', '#e8562e'];

/** Una mata en (x, y) con dos frutas. */
function plant(x: number, y: number, fruit: string): Box[] {
  return [
    box(x, y, 9, x + 8, y + 8, 18, LEAF_DARK),
    box(x + 1, y + 1, 18, x + 7, y + 7, 24, LEAF),
    box(x + 6, y + 2, 14, x + 9, y + 5, 17, fruit),
    box(x + 2, y + 6, 20, x + 5, y + 9, 23, fruit),
  ];
}

export const fruitPlanter = planter((x, y, i) => plant(x, y, FRUITS[i]));
