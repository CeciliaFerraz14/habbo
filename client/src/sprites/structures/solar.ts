// Solar en venta del Ensanche (4x4): tierra removida, estacas con cuerda en
// las esquinas y un cartel de "Se vende" de cara a la calle. En rotación 0 el
// cartel mira a +x; en la calle se pone con rotación 1, de cara a la carretera.
// El texto del cartel lo escribe la interfaz (ui/furniLabels.ts) en SOLAR_SIGN.
import { box, type Box, type FurniModel } from '../furniture/model';

const DIRT = '#b48a5c';
const DIRT_DARK = '#9a7448';
const WOOD = '#8a5a34';
const ROPE = '#ecdcb4';
const CREAM = '#f6e7c8';
const RED = '#c0503a';
const ROCK = '#9a8a78';

/** Panel crema del cartel donde va el texto (plano x = 58, como OWNER_PLATE en shop.ts). */
export const SOLAR_SIGN = { x: 58, y0: 8, y1: 56, z0: 27, z1: 45 };

/** Estaca en (x, y) y cuerda hasta la siguiente. */
const stake = (x: number, y: number): Box => box(x, y, 0, x + 2, y + 2, 10, WOOD);

export const solar: FurniModel = {
  boxes: [
    // Tierra removida, con algún montoncito
    box(1, 1, 0, 63, 63, 1, DIRT),
    box(14, 34, 1, 26, 46, 3, DIRT_DARK),
    box(30, 10, 1, 38, 18, 2, DIRT_DARK),
    box(36, 44, 1, 41, 49, 4, ROCK),
    box(10, 12, 1, 14, 16, 3, ROCK),
    // Estacas en las esquinas y la cuerda que marca la parcela
    stake(2, 2),
    stake(2, 60),
    stake(60, 2),
    stake(60, 60),
    box(3, 3, 8, 61, 4, 9, ROPE),
    box(3, 60, 8, 61, 61, 9, ROPE),
    box(3, 3, 8, 4, 61, 9, ROPE),
    box(60, 3, 8, 61, 61, 9, ROPE),
    // Cartel de "Se vende" sobre dos postes, de cara a la calle
    box(54, 14, 0, 56, 16, 50, WOOD),
    box(54, 48, 0, 56, 50, 50, WOOD),
    box(56, 6, 22, 58, 58, 50, CREAM),
    box(58, 6, 47, 59, 58, 50, RED),
    box(58, 6, 22, 59, 58, 25, RED),
  ],
};
