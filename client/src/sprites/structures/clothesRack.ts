// Burro de ropa (1x1): el expositor de una prenda a la venta en la tienda de ropa.
// La variante es el color de la prenda (como el color del coche); la prenda
// cuelga de una percha en la barra. Rotación 0: el frente mira a +x.
import { GARMENT_COLORS } from '@juego/shared';
import { box, type FurniModel } from '../furniture/model';
import { PALETTE } from '../palette';

export function clothesRack(variant: string | undefined): FurniModel {
  const cloth = variant ?? GARMENT_COLORS[0];
  return {
    boxes: [
      // Pies, postes y barra
      box(3, 1, 0, 13, 3, 2, PALETTE.metal),
      box(3, 13, 0, 13, 15, 2, PALETTE.metal),
      box(7, 1, 2, 9, 3, 30, PALETTE.metal),
      box(7, 13, 2, 9, 15, 30, PALETTE.metal),
      box(7, 1, 30, 9, 15, 32, PALETTE.chrome),
      // Percha y prenda: hombros anchos y cuerpo más estrecho
      box(7, 7, 27, 9, 9, 30, PALETTE.chrome),
      box(5, 4, 22, 11, 12, 27, cloth),
      box(5, 5, 10, 11, 11, 22, cloth),
    ],
  };
}
