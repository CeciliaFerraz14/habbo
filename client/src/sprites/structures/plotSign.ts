// Cartel de madera "Se vende" de un solar sin construir, sobre un poste. 1x1.
// Rotación 0: el cartel mira a +x; en la calle se pone con rotación 1 (hacia
// la cámara). Las rayas de la cara hacen de letras a esta escala.
import { box, type FurniModel } from '../furniture/model';
import { PALETTE } from '../palette';

export const plotSign: FurniModel = {
  boxes: [
    box(7, 7, 0, 9, 9, 18, PALETTE.wood), // poste
    box(6, 2, 18, 9, 14, 30, PALETTE.cream), // tablero
    box(9, 3, 26, 10, 13, 28, PALETTE.terracotta), // "SE VENDE"
    box(9, 5, 21, 10, 11, 23, PALETTE.terracottaDark),
  ],
};
