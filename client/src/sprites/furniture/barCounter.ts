// Barra de bar (1x2): mostrador de madera oscura con tapa clara y reposapiés metálico.
// Rotación 0: el frontal mira a SE (+x); el lado del barman está en x pequeña.
import { box, type FurniModel } from './model';
import { PALETTE } from '../palette';

const WOOD_DARK = '#5a3020';
const WOOD_PANEL = '#7a4630';
const CHROME = '#d8dde3';

export const barCounter: FurniModel = {
  boxes: [
    box(3, 1, 0, 14, 31, 16, WOOD_DARK), // cuerpo del mostrador
    box(13, 2, 5, 14, 30, 14, WOOD_PANEL), // panel del frontal
    box(2, 0, 16, 15, 32, 19, PALETTE.cream), // tapa clara
    box(14, 1, 2, 16, 31, 3, CHROME), // reposapiés metálico
    box(14, 1, 0, 16, 2, 3, CHROME), // soporte del reposapiés
    box(14, 30, 0, 16, 31, 3, CHROME), // soporte del reposapiés
  ],
};
