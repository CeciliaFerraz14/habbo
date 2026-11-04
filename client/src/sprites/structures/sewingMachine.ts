// Máquina de coser: el puesto de la tienda de ropa (1x2).
// Rotación 0: el frente mira a +x. Mesa de patas de hierro con pedal y, encima,
// la máquina de perfil (a lo largo de y) y un rollo de tela.
import { box, type FurniModel } from '../furniture/model';
import { PALETTE } from '../palette';

const IRON = '#3a3434';
const WOOD = '#8a5a34';
const CHROME = '#d8dde3';

export const sewingMachine: FurniModel = {
  boxes: [
    // Patas de hierro y pedal
    box(3, 2, 0, 5, 4, 14, IRON),
    box(3, 28, 0, 5, 30, 14, IRON),
    box(11, 2, 0, 13, 4, 14, IRON),
    box(11, 28, 0, 13, 30, 14, IRON),
    box(5, 10, 1, 12, 20, 3, IRON),
    // Tablero
    box(2, 1, 14, 14, 31, 17, WOOD),
    // Máquina: base, columna de la derecha, brazo y cabezal con la aguja
    box(5, 4, 17, 11, 20, 19, PALETTE.cream),
    box(6, 15, 19, 10, 20, 30, PALETTE.turquoise),
    box(6, 6, 26, 10, 15, 30, PALETTE.turquoise),
    box(6, 5, 19, 10, 9, 30, PALETTE.turquoise),
    box(7, 6, 19, 9, 7, 21, CHROME),
    // Volante a un lado del brazo
    box(10, 16, 23, 11, 19, 28, CHROME),
    // Rollo de tela
    box(5, 23, 17, 11, 30, 22, PALETTE.terracotta),
  ],
};
