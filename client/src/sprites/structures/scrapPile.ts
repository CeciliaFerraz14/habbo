// Montón de chatarra: el puesto de trabajo de la chatarrería (2x2).
// Chapas, tablones viejos y neumáticos sobre una base de tierra.
import { box, type FurniModel } from '../furniture/model';

export const scrapPile: FurniModel = {
  boxes: [
    box(2, 2, 0, 30, 30, 6, '#7a6a5a'), // base de tierra y trastos
    // Chapas (una oxidada)
    box(4, 4, 6, 18, 14, 10, '#9aa3ad'),
    box(18, 4, 6, 28, 12, 9, '#a8582a'),
    box(8, 10, 10, 20, 18, 13, '#b8c0c8'),
    // Tablones
    box(4, 18, 6, 19, 22, 8, '#8a6a48'),
    box(6, 22, 8, 19, 26, 10, '#a07a50'),
    // Neumáticos apilados
    box(20, 18, 6, 28, 26, 11, '#3a3434'),
    box(20, 18, 11, 28, 26, 16, '#463e3e'),
    box(23, 21, 16, 25, 23, 17, '#1a1414'),
  ],
};
