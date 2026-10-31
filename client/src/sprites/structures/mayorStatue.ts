// Estatua del alcalde (2x2): una figura de bronce con sombrero de vaquero sobre
// un pedestal de piedra, con una placa dorada delante. Los nombres de los
// alcaldes los escribe la interfaz encima de la placa (ui/furniLabels.ts), con
// las medidas de STATUE_PLAQUE.
// Rotación 0: la placa mira a +x.
import { box, type FurniModel } from '../furniture/model';

const STONE = '#b8b0a0';
const BRONZE = '#b5832f';
const BRONZE_LIGHT = '#d9a55a';

/** Zona de la placa donde van los nombres (plano x = 29; y de 6 a 26; z de 2 a 11). */
export const STATUE_PLAQUE = { x: 29, y0: 6, y1: 26, z0: 2, z1: 11 };

export const mayorStatue: FurniModel = {
  boxes: [
    // Pedestal
    box(4, 4, 0, 28, 28, 12, STONE),
    box(6, 6, 12, 26, 26, 14, '#d8d0c0'),
    box(28, 6, 2, 29, 26, 11, '#c9851c'), // placa
    // Figura: piernas, cuerpo, brazo en alto y cabeza
    box(14, 12, 14, 18, 15, 26, BRONZE),
    box(14, 17, 14, 18, 20, 26, BRONZE),
    box(13, 11, 26, 19, 21, 38, BRONZE),
    box(15, 21, 32, 17, 23, 46, BRONZE_LIGHT),
    box(14, 13, 38, 18, 19, 43, BRONZE_LIGHT),
    // Sombrero: ala ancha y copa
    box(11, 10, 43, 21, 22, 44, BRONZE),
    box(14, 13, 44, 18, 19, 48, BRONZE),
  ],
};
