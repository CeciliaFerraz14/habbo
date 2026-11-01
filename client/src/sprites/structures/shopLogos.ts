// Logos de neón de los carteles de los locales, uno por negocio.
//
// Cada logo es un dibujo de píxeles (como los sprites de matriz): una string
// por fila, de arriba abajo, y un carácter por píxel. Cada píxel se convierte
// en un tubito de neón en el plano del cartel (ver shop.ts). '.' = apagado.
// Colores: 'n' es siempre el neón del negocio (ECONOMY.businesses[...].neon);
// los demás caracteres, los de su paleta.
//
// Caben 12 filas y hasta 28 columnas (en el cartel se dibujan al doble de
// tamaño). Se centran solos.
import type { BusinessType } from '@juego/shared';
import { PALETTE } from '../palette';

export interface ShopLogo {
  rows: string[];
  /** Colores de los caracteres que no son 'n' ni '.'. */
  palette: Record<string, string>;
}

const WHITE = '#fff6e0';

export const SHOP_LOGOS: Record<BusinessType, ShopLogo> = {
  // Chatarrería: un neumático y una llave inglesa.
  scrapyard: {
    rows: [
      '....nnnn..........ww.',
      '..nnnnnnnn.......w..w',
      '.nnn....nnn.......w.w',
      '.nn..ww..nn......www.',
      'nn..w..w..nn....ww...',
      'nn.w.ww.w.nn...ww....',
      'nn.w.ww.w.nn..ww.....',
      'nn..w..w..nn.ww......',
      '.nn..ww..nn.ww.......',
      '.nnn....nnnw.w.......',
      '..nnnnnnnn.w..w......',
      '....nnnn....ww.......',
    ],
    palette: { w: WHITE },
  },

  // Pozo: el pozo con su tejadillo y el cubo, y una gota de agua.
  well: {
    rows: [
      '.rrrrrrrrrrrr........n....',
      'rr..........rr.......n....',
      '..w...n....w........nnn...',
      '..w...n....w........nnn...',
      '..w..nnn...w.......nnnnn..',
      '..w..nnn...w.......nnnnn..',
      '..w........w......nnnnwnn.',
      '.nnnnnnnnnnnn.....nnnwnnn.',
      '.n..........n.....nnnnnnn.',
      '.n.nnnnnnnn.n......nnnnn..',
      '.n..........n.......nnn...',
      '.nnnnnnnnnnnn.............',
    ],
    palette: { w: WHITE, r: '#ff5a3c' },
  },

  // Invernadero: un brote con dos hojas en su maceta, bajo un sol.
  greenhouse: {
    rows: [
      '.....nn........y.y.y.',
      '....n..n........yyy..',
      '..nn.nn.nn.....yyyyy.',
      '.n..nnnn..n.....yyy..',
      '.n...nn...n....y.y.y.',
      '..nn.nn.nn...........',
      '.....nn..............',
      '.....nn..............',
      '.oooooooooo..........',
      '..oooooooo...........',
      '..oooooooo...........',
      '...oooooo............',
    ],
    palette: { o: '#ff7a3c', y: PALETTE.neonYellow },
  },

  // Taller de muebles: un martillo y un serrucho.
  workshop: {
    rows: [
      '.nnnnnnnnn.................',
      'nnnnnnnnnnn................',
      'nnnnnnn..nn................',
      '....ww.........ww..........',
      '....ww.........wwnnnnnnnnnn',
      '....ww.........w.wnnnnnnnnn',
      '....ww.........wwwnnnnnnnn.',
      '....ww.........ww.nnnnnnn..',
      '....ww............n.n.n.n..',
      '....ww.....................',
      '...wwww....................',
      '...wwww....................',
    ],
    palette: { w: WHITE },
  },

  // Tienda de decoración: una bolsa de la compra con el símbolo del dólar.
  store: {
    rows: [
      '....wwwwww....',
      '...w......w...',
      '...w......w...',
      'nnnnnnnnnnnnnn',
      'n......y.....n',
      'n.....yyyy...n',
      'n....y.y.....n',
      'n.....yyy....n',
      'n......y.y...n',
      'n....yyyy....n',
      'n......y.....n',
      'nnnnnnnnnnnnnn',
    ],
    palette: { w: WHITE, y: PALETTE.neonYellow },
  },

  // Diner: una hamburguesa y una taza de café humeante.
  diner: {
    rows: [
      '....yyyyyy.........w..w...',
      '..yyyyyyyyyy......w..w....',
      '.yy.w..w..wyy......w..w...',
      'yyyyyyyyyyyyyy............',
      '..............nnnnnnnn....',
      '.gggggggggggg.n......nnn..',
      'nnnnnnnnnnnnnnn......n.n..',
      'nnnnnnnnnnnnnnn......nnn..',
      '..............n......n....',
      'yyyyyyyyyyyyyy.nnnnnn.....',
      '.yyyyyyyyyyyy.............',
      '..........................',
    ],
    palette: { w: WHITE, y: PALETTE.neonYellow, g: '#7be35b' },
  },

  // Peluquería: unas tijeras y el poste de barbero de rayas.
  barber: {
    rows: [
      'n.........n.....wwww.',
      '.n.......n.....w....w',
      '..n.....n.......rrww.',
      '...n...n........rwwr.',
      '....n.n.........wwrr.',
      '.....n..........wrrw.',
      '....n.n.........rrww.',
      '..ww...ww.......rwwr.',
      '.w..w.w..w......wwrr.',
      '.w..w.w..w......wrrw.',
      '..ww...ww......w....w',
      '................wwww.',
    ],
    palette: { w: WHITE, r: '#ff4f4f' },
  },

  // Frutería: una manzana y una zanahoria.
  greengrocer: {
    rows: [
      '.....w.nn.......n.n....',
      '.....wnn.........nn....',
      '..rrr.rrr.......oooo...',
      '.rrrrrrrrr......oooo...',
      'rrrrrrrrrrr.....ooo....',
      'rrwrrrrrrrr.....ooo....',
      'rrwrrrrrrrr......oo....',
      'rrrrrrrrrrr......oo....',
      '.rrrrrrrrr.......o.....',
      '.rrrrrrrrr.......o.....',
      '..rrr.rrr..............',
      '.......................',
    ],
    palette: { w: WHITE, r: '#ff4f4f', o: '#ff9f3c' },
  },
};
