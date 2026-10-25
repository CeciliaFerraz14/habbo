// Sillón de diner de dos plazas (1x2), de vinilo rojo con zócalo cromado.
// Rotación 0: mira a SE, respaldo en el lado de x pequeña.
import { backrest, box, type FurniModel } from './model';

const VINYL = '#b82e3e';
const VINYL_LIGHT = '#d8485a';
const CUSHION = '#e05868';
const CHROME = '#d8dde3';

export const dinerBooth: FurniModel = {
  seatHeight: 13,
  boxes: [
    box(2, 1, 0, 14, 31, 10, VINYL), // base
    box(14, 1, 0, 15, 31, 4, CHROME), // zócalo cromado
    // Respaldo con su rulo superior. No muy alto: si el sillón mira al fondo,
    // el respaldo tapa al avatar sentado y tiene que asomar su cabeza.
    backrest(1, 1, 10, 5, 31, 22, VINYL_LIGHT),
    backrest(1, 1, 22, 5, 31, 25, CUSHION),
    // Dos cojines
    box(5, 2, 10, 14, 16, 13, CUSHION),
    box(5, 16, 10, 14, 30, 13, CUSHION),
  ],
};
