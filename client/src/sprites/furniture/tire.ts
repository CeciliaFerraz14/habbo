// Dos neumáticos viejos apilados. Vistos desde arriba, el de encima tiene un
// aro de banda blanca y el agujero central oscuro: así se lee como rueda
// aunque esté hecho solo con cajas.
import { box, type FurniModel } from './model';

export const tire: FurniModel = {
  boxes: [
    box(3, 3, 0, 13, 13, 5, '#3a3434'),
    box(3, 3, 5, 13, 13, 10, '#463e3e'),
    box(4, 4, 10, 12, 12, 11, '#cfc7bd'), // banda blanca
    box(6, 6, 11, 10, 10, 12, '#1a1414'), // agujero
  ],
};
