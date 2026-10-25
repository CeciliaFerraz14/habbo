// Taburete de barra: pie cromado y asiento de vinilo rojo.
import { box, type FurniModel } from './model';

const CHROME = '#d8dde3';

export const barStool: FurniModel = {
  seatHeight: 18,
  boxes: [
    box(5, 5, 0, 11, 11, 2, '#9aa3ad'), // base
    box(7, 7, 2, 9, 9, 13, CHROME), // barra
    box(4, 4, 13, 12, 12, 14, CHROME), // aro bajo el asiento
    box(4, 4, 14, 12, 12, 18, '#c8384a'), // asiento
  ],
};
