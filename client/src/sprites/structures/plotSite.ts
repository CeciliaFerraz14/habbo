// Solar sin construir: losa de cimentación marcada, valla baja de madera y
// cartel de "Se vende". 4x4 baldosas, como el local que se construirá encima.
// Rotación 0: el frente mira a +x; en la calle se pone con rotación 1 (hacia la
// cámara), y entonces la esquina x alto, y bajo es la más cercana a la cámara.
// Ahí va el cartel. Las rayas de la cara hacen de letras a esta escala.
import { box, type Box, type FurniModel } from '../furniture/model';
import { PALETTE } from '../palette';

const SIZE = 64;
/** Grosor de la valla y altura de su listón, en las unidades del modelo. */
const FENCE = 2;
const RAIL_BOTTOM = 6;
const RAIL_TOP = 8;
const POST_TOP = 11;
/** Dónde van los postes en cada lado de la valla. */
const POST_AT = [0, 20, 42, SIZE - FENCE];

/** Un lado de la valla en la x indicada, de y = 0 a y = SIZE. */
const fenceAlongY = (x: number): Box[] => [
  box(x, 0, RAIL_BOTTOM, x + FENCE, SIZE, RAIL_TOP, PALETTE.wood),
  ...POST_AT.map((y) => box(x, y, 0, x + FENCE, y + FENCE, POST_TOP, PALETTE.wood)),
];

/** Un lado de la valla en la y indicada, de x = 0 a x = SIZE. */
const fenceAlongX = (y: number): Box[] => [
  box(0, y, RAIL_BOTTOM, SIZE, y + FENCE, RAIL_TOP, PALETTE.wood),
  ...POST_AT.map((x) => box(x, y, 0, x + FENCE, y + FENCE, POST_TOP, PALETTE.wood)),
];

export const plotSite: FurniModel = {
  boxes: [
    // Losa y, encima, el rectángulo marcado del edificio.
    box(0, 0, 0, SIZE, SIZE, 2, PALETTE.sandDark),
    box(6, 6, 2, 58, 8, 3, PALETTE.ochre),
    box(6, 56, 2, 58, 58, 3, PALETTE.ochre),
    box(6, 8, 2, 8, 56, 3, PALETTE.ochre),
    box(56, 8, 2, 58, 56, 3, PALETTE.ochre),
    // Valla por los cuatro lados.
    ...fenceAlongY(0),
    ...fenceAlongX(SIZE - FENCE),
    ...fenceAlongX(0),
    ...fenceAlongY(SIZE - FENCE),
    // Cartel de "Se vende" sobre su poste, en la esquina delantera.
    box(55, 7, 0, 57, 9, 22, PALETTE.wood),
    box(54, 2, 22, 57, 14, 34, PALETTE.cream),
    box(57, 3, 30, 58, 13, 32, PALETTE.terracotta),
    box(57, 5, 25, 58, 11, 27, PALETTE.terracottaDark),
  ],
};
