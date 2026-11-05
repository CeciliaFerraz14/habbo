// Estantería del minimarket (1x2): tres baldas llenas de productos de colores.
// Rotación 0: los productos miran a +x.
import { box, type Box, type FurniModel } from '../furniture/model';

const METAL = '#9aa3ad';
const SHELF = '#c8cdd2';
/** Colores de los paquetes, en el orden en que se colocan. */
const PRODUCTS = ['#c83c3c', '#f2b134', '#2f8f8a', '#6a4a8a', '#7bb35b', '#4a78ab'];

function products(): Box[] {
  const boxes: Box[] = [];
  [2, 13, 24].forEach((z, shelf) => {
    for (let i = 0; i < 5; i++) {
      const color = PRODUCTS[(i + shelf * 2) % PRODUCTS.length];
      // Alturas distintas para que no parezca un bloque.
      const height = 5 + ((i + shelf) % 3);
      boxes.push(box(4, 2 + i * 6, z + 2, 11, 6 + i * 6, z + 2 + height, color));
    }
  });
  return boxes;
}

export const minimartShelf: FurniModel = {
  boxes: [
    box(1, 1, 0, 3, 31, 34, METAL), // trasera
    box(3, 1, 2, 13, 31, 4, SHELF),
    box(3, 1, 13, 13, 31, 15, SHELF),
    box(3, 1, 24, 13, 31, 26, SHELF),
    ...products(),
  ],
};
