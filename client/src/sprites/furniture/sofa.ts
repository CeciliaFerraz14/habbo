// Sofá de dos plazas (1x2 baldosas). Rotación 0: mira a SE, respaldo en x pequeña.
import { box, type FurniModel } from './model';

const BASE = '#a83850';
const FABRIC = '#c84860';
const CUSHION = '#e06a80';

export const sofa: FurniModel = {
  boxes: [
    box(2, 1, 0, 15, 31, 8, BASE),
    // Respaldo
    box(1, 1, 8, 5, 31, 22, FABRIC),
    // Reposabrazos
    box(5, 1, 8, 15, 4, 15, FABRIC),
    box(5, 28, 8, 15, 31, 15, FABRIC),
    // Dos cojines
    box(5, 4, 8, 15, 16, 11, CUSHION),
    box(5, 16, 8, 15, 28, 11, CUSHION),
  ],
};
