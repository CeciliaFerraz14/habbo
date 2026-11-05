// Decoración propia de cada negocio (ver ECONOMY.businessDecor): tres muebles
// por negocio, que compra su dueño para decorar su local.
// Rotación 0: el frontal mira a SE (+x).
import { backrest, box, glow, type FurniModel } from './model';
import { PALETTE } from '../palette';

const METAL = '#8a8f96';
const METAL_DARK = '#5a5f66';
const WOOD = '#a07a50';
const WOOD_DARK = '#7a5234';
const RUST = '#b5532f';
const BLACK = '#2a2430';
const CREAM = '#f6e7c8';

// --- Chatarrería ---------------------------------------------------------------

/** Bidón de aceite rojo, con sus aros y una mancha en el suelo. */
export const oilDrum: FurniModel = {
  boxes: [
    box(2, 2, 0, 14, 14, 1, '#3a3036'), // mancha de aceite
    box(4, 4, 1, 12, 12, 22, '#c83c3c'), // bidón
    box(3, 3, 6, 13, 13, 8, '#a02c2c'), // aro de abajo
    box(3, 3, 15, 13, 13, 17, '#a02c2c'), // aro de arriba
    box(5, 5, 22, 11, 11, 23, '#a02c2c'), // tapa
    box(8, 8, 23, 10, 10, 24, METAL_DARK), // tapón
  ],
};

/** Motor viejo sobre unos tablones, con sus cilindros y el escape. */
export const engineBlock: FurniModel = {
  boxes: [
    box(2, 3, 0, 14, 13, 2, WOOD_DARK), // tablones
    box(3, 4, 2, 13, 12, 12, METAL_DARK), // bloque
    box(4, 4, 12, 6, 12, 16, METAL), // cilindros
    box(7, 4, 12, 9, 12, 16, METAL),
    box(10, 4, 12, 12, 12, 16, METAL),
    box(13, 6, 4, 15, 10, 10, RUST), // volante
    box(5, 12, 6, 7, 15, 8, BLACK), // escape
  ],
};

/** Robot hecho de chatarra: cuerpo de bidón, cabeza de lata y ojos que brillan. */
export const scrapRobot: FurniModel = {
  light: { color: PALETTE.neonCyan, radius: 10, dx: 0.5 },
  boxes: [
    box(4, 4, 0, 7, 7, 10, METAL_DARK), // pierna
    box(4, 9, 0, 7, 12, 10, METAL_DARK), // pierna
    box(3, 3, 10, 11, 13, 24, RUST), // cuerpo
    box(11, 6, 14, 12, 10, 20, METAL), // panel del pecho
    box(5, 1, 14, 8, 3, 23, METAL), // brazo
    box(5, 13, 14, 8, 15, 23, METAL), // brazo
    box(4, 5, 24, 10, 11, 31, METAL), // cabeza
    glow(10, 6, 27, 11, 7, 29, PALETTE.neonCyan), // ojos
    glow(10, 9, 27, 11, 10, 29, PALETTE.neonCyan),
    box(7, 8, 31, 8, 9, 35, METAL_DARK), // antena
    glow(6, 7, 35, 9, 10, 37, PALETTE.neonPink),
  ],
};

// --- Pozo ----------------------------------------------------------------------

/** Cubo de madera lleno de agua. */
export const waterBucket: FurniModel = {
  boxes: [
    box(4, 4, 0, 12, 12, 10, WOOD), // cubo
    box(4, 4, 3, 12, 12, 4, METAL_DARK), // aros
    box(4, 4, 8, 12, 12, 9, METAL_DARK),
    box(5, 5, 9, 11, 11, 10, '#4fa3ff'), // agua
    box(7, 4, 10, 9, 5, 16, METAL_DARK), // asa
    box(7, 11, 10, 9, 12, 16, METAL_DARK),
    box(7, 4, 16, 9, 12, 17, METAL_DARK),
  ],
};

/** Bomba de agua de mano, verde, con su palanca y su cubo debajo del caño. */
export const handPump: FurniModel = {
  boxes: [
    box(3, 3, 0, 13, 13, 2, '#9a9a90'), // losa
    box(5, 6, 2, 9, 10, 24, '#3f7f4a'), // cuerpo
    box(9, 7, 16, 13, 9, 18, '#3f7f4a'), // caño
    box(4, 7, 24, 6, 9, 26, '#3f7f4a'), // eje
    box(1, 7, 25, 5, 9, 27, METAL_DARK), // palanca
    box(10, 5, 2, 15, 11, 8, WOOD), // cubo
    box(11, 6, 8, 14, 10, 9, '#4fa3ff'),
  ],
};

/** Molino de viento de granja: torre de hierro y rueda de aspas. */
export const windmill: FurniModel = {
  boxes: [
    box(4, 4, 0, 5, 5, 40, METAL_DARK), // patas de la torre
    box(11, 4, 0, 12, 5, 40, METAL_DARK),
    box(4, 11, 0, 5, 12, 40, METAL_DARK),
    box(11, 11, 0, 12, 12, 40, METAL_DARK),
    box(4, 4, 20, 12, 12, 21, METAL), // travesaños
    box(5, 5, 40, 11, 11, 42, METAL), // plataforma
    box(11, 7, 42, 12, 9, 46, METAL), // eje
    // Rueda de aspas (en el plano y-z, mirando a +x): ocho aspas alrededor del eje.
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const a = (i / 8) * Math.PI * 2;
      const y = Math.round(8 + Math.cos(a) * 6);
      const z = Math.round(45 + Math.sin(a) * 9);
      return box(12, y - 1, z - 2, 13, y + 2, z + 2, i % 2 ? '#c83c3c' : CREAM);
    }),
    box(12, 7, 43, 14, 10, 47, METAL_DARK), // buje
    box(3, 7, 42, 5, 9, 46, '#c83c3c'), // veleta
  ],
};

// --- Invernadero ---------------------------------------------------------------

/** Dos sacos de semillas de arpillera, uno abierto. */
export const seedSacks: FurniModel = {
  boxes: [
    box(2, 2, 0, 8, 9, 14, '#c9b07a'), // saco de atrás
    box(3, 3, 14, 7, 8, 16, '#b09860'), // nudo
    box(7, 7, 0, 14, 14, 11, '#d8c08a'), // saco de delante (abierto)
    box(8, 8, 11, 13, 13, 12, '#7a5a30'), // semillas
    box(13, 9, 3, 14, 12, 7, '#5aa85a'), // dibujo de la hoja
  ],
};

/** Jardinera de madera con flores de colores. */
export const flowerBox: FurniModel = {
  boxes: [
    box(3, 1, 0, 13, 15, 8, WOOD), // jardinera
    box(4, 2, 8, 12, 14, 9, '#6a4a30'), // tierra
    box(6, 3, 9, 7, 4, 15, '#5aa85a'), // tallos
    box(8, 7, 9, 9, 8, 16, '#5aa85a'),
    box(6, 11, 9, 7, 12, 14, '#5aa85a'),
    box(5, 2, 15, 8, 5, 18, PALETTE.neonPink), // flores
    box(7, 6, 16, 10, 9, 19, PALETTE.neonYellow),
    box(5, 10, 14, 8, 13, 17, '#ff7a3d'),
  ],
};

/** Espantapájaros con sombrero de paja y camisa de cuadros. */
export const scarecrow: FurniModel = {
  boxes: [
    box(7, 7, 0, 9, 9, 22, WOOD_DARK), // palo
    box(7, 1, 22, 9, 15, 24, WOOD_DARK), // travesaño de los brazos
    box(5, 4, 14, 11, 12, 28, '#c83c3c'), // camisa
    box(11, 4, 18, 12, 12, 19, '#7a2a2a'), // cuadros
    box(11, 4, 23, 12, 12, 24, '#7a2a2a'),
    box(6, 2, 22, 10, 4, 25, '#c83c3c'), // mangas
    box(6, 12, 22, 10, 14, 25, '#c83c3c'),
    box(6, 6, 28, 10, 10, 34, '#e8d090'), // cabeza de saco
    box(4, 4, 34, 12, 12, 35, '#d8b050'), // ala del sombrero
    box(6, 6, 35, 10, 10, 38, '#d8b050'), // copa
  ],
};

// --- Taller --------------------------------------------------------------------

/** Caja de herramientas roja, abierta, con un martillo encima. */
export const toolbox: FurniModel = {
  boxes: [
    box(5, 2, 0, 11, 14, 8, '#c83c3c'), // caja
    box(5, 2, 8, 11, 14, 9, '#a02c2c'), // borde
    box(7, 3, 9, 9, 13, 10, METAL), // bandeja
    box(7, 7, 9, 8, 8, 13, METAL_DARK), // asa
    box(6, 9, 10, 10, 10, 11, WOOD), // mango del martillo
    box(9, 8, 10, 11, 11, 12, METAL_DARK), // cabeza del martillo
  ],
};

/** Caballete de carpintero (se puede uno sentar). */
export const sawhorse: FurniModel = {
  seatHeight: 14,
  boxes: [
    box(3, 2, 0, 5, 4, 12, WOOD_DARK), // patas
    box(11, 2, 0, 13, 4, 12, WOOD_DARK),
    box(3, 12, 0, 5, 14, 12, WOOD_DARK),
    box(11, 12, 0, 13, 14, 12, WOOD_DARK),
    box(6, 1, 12, 10, 15, 14, WOOD), // viga
    box(8, 5, 14, 9, 9, 15, '#d8b050'), // serrín
  ],
};

/** Panel de herramientas de pie: tablero perforado con llaves, sierra y martillo. */
export const toolRack: FurniModel = {
  boxes: [
    box(3, 1, 0, 6, 15, 2, WOOD_DARK), // pies
    box(4, 1, 2, 5, 15, 34, '#d8b07a'), // tablero
    box(5, 2, 24, 6, 4, 32, METAL), // llave
    box(5, 6, 20, 6, 12, 30, '#c8c8d0'), // sierra
    box(5, 6, 30, 6, 7, 32, WOOD),
    box(5, 13, 22, 6, 14, 32, WOOD), // martillo
    box(5, 12, 30, 6, 15, 32, METAL_DARK),
    box(5, 3, 8, 6, 13, 12, '#c83c3c'), // estante con cajas
  ],
};

// --- Tienda --------------------------------------------------------------------

/** Caja registradora antigua de latón sobre un pie. */
export const cashRegister: FurniModel = {
  boxes: [
    box(4, 4, 0, 12, 12, 14, WOOD_DARK), // pie
    box(3, 3, 14, 13, 13, 22, '#d4a017'), // caja
    box(13, 4, 15, 14, 12, 18, '#a87a10'), // cajón
    box(9, 4, 22, 12, 12, 24, '#a87a10'), // teclas
    box(4, 5, 22, 8, 11, 30, '#d4a017'), // visor
    box(8, 6, 25, 9, 10, 29, CREAM),
  ],
};

/** Pila de cajas de regalo con lazos. */
export const giftBoxes: FurniModel = {
  boxes: [
    box(2, 2, 0, 14, 14, 10, '#4a78ab'), // caja grande
    box(7, 2, 0, 9, 14, 10, PALETTE.neonYellow), // cinta
    box(4, 4, 10, 12, 12, 18, PALETTE.neonPink), // caja mediana
    box(4, 7, 10, 12, 9, 18, CREAM),
    box(6, 6, 18, 10, 10, 23, '#5aa85a'), // caja pequeña
    box(7, 7, 23, 9, 9, 25, '#c83c3c'), // lazo
  ],
};

/** Maniquí de tienda con un vestido. */
export const mannequin: FurniModel = {
  boxes: [
    box(5, 5, 0, 11, 11, 2, BLACK), // base
    box(7, 7, 2, 9, 9, 12, BLACK), // pie
    box(5, 4, 12, 11, 12, 24, '#b98cff'), // falda
    box(6, 5, 24, 10, 11, 32, '#b98cff'), // cuerpo
    box(7, 3, 25, 9, 5, 31, '#e8d0b8'), // brazos
    box(7, 11, 25, 9, 13, 31, '#e8d0b8'),
    box(7, 7, 32, 9, 9, 34, '#e8d0b8'), // cuello
    box(6, 6, 34, 10, 10, 39, '#e8d0b8'), // cabeza
  ],
};

// --- Diner ---------------------------------------------------------------------

/** Pizarra del menú en un caballete. */
export const menuBoard: FurniModel = {
  boxes: [
    box(3, 3, 0, 5, 5, 26, WOOD_DARK), // patas
    box(3, 11, 0, 5, 13, 26, WOOD_DARK),
    box(5, 2, 8, 7, 14, 28, WOOD), // marco
    box(7, 3, 9, 8, 13, 27, '#2a3a30'), // pizarra
    box(8, 4, 23, 9, 11, 24, CREAM), // "MENU"
    box(8, 4, 19, 9, 9, 20, CREAM), // platos
    box(8, 4, 15, 9, 10, 16, CREAM),
    box(8, 4, 11, 9, 8, 12, CREAM),
  ],
};

/** Vitrina de cristal con tartas en dos pisos. */
export const pieStand: FurniModel = {
  boxes: [
    box(3, 3, 0, 13, 13, 12, '#c83c3c'), // mueble
    box(3, 3, 12, 13, 13, 13, METAL), // borde cromado
    box(4, 4, 13, 12, 12, 28, '#cfeee8'), // cristal
    box(5, 5, 14, 11, 11, 17, '#e8b060'), // tarta de abajo
    box(5, 5, 17, 11, 11, 18, '#c83c3c'),
    box(4, 4, 20, 12, 12, 21, METAL), // balda
    box(6, 6, 21, 10, 10, 24, '#e8b060'), // tarta de arriba
    box(6, 6, 24, 10, 10, 25, CREAM),
    box(3, 3, 28, 13, 13, 29, METAL), // tapa
  ],
};

/** Letrero de neón con forma de hamburguesa. */
export const neonBurger: FurniModel = {
  light: { color: '#ffb347', radius: 18 },
  boxes: [
    box(5, 5, 0, 11, 11, 3, BLACK), // peana
    box(7, 7, 3, 9, 9, 12, BLACK), // palo
    glow(7, 2, 12, 9, 14, 15, '#e8a040'), // pan de abajo
    glow(7, 1, 15, 9, 15, 17, '#c83c3c'), // carne
    glow(7, 1, 17, 9, 15, 18, '#7cff6b'), // lechuga
    glow(7, 2, 18, 9, 14, 23, '#ffb347'), // pan de arriba
    glow(7, 4, 23, 9, 12, 25, '#ffb347'),
  ],
};

// --- Peluquería ----------------------------------------------------------------

/** Poste de barbero con sus rayas rojas, blancas y azules (da luz). */
export const barberPole: FurniModel = {
  light: { color: '#ff6a6a', radius: 12 },
  boxes: [
    box(5, 5, 0, 11, 11, 3, METAL), // base
    glow(6, 6, 3, 10, 10, 7, CREAM), // rayas
    glow(6, 6, 7, 10, 10, 11, '#ff4f4f'),
    glow(6, 6, 11, 10, 10, 15, CREAM),
    glow(6, 6, 15, 10, 10, 19, '#4f7fff'),
    glow(6, 6, 19, 10, 10, 23, CREAM),
    glow(6, 6, 23, 10, 10, 27, '#ff4f4f'),
    glow(6, 6, 27, 10, 10, 31, CREAM),
    box(5, 5, 31, 11, 11, 34, METAL), // remate
  ],
};

/** Espejo de pie con marco dorado. */
export const standingMirror: FurniModel = {
  boxes: [
    box(5, 3, 0, 9, 13, 2, WOOD_DARK), // pie
    box(6, 2, 2, 8, 14, 36, '#d4a017'), // marco
    box(8, 3, 4, 9, 13, 34, '#cfeee8'), // espejo
    box(8, 4, 26, 9, 6, 32, '#ffffff'), // brillo
  ],
};

/** Silla con secador de casco, como en las peluquerías de antes (se puede uno sentar). */
export const hairDryer: FurniModel = {
  seatHeight: 10,
  boxes: [
    box(4, 4, 0, 12, 12, 2, METAL), // base
    box(4, 3, 2, 12, 13, 10, '#e8a0b4'), // asiento
    backrest(2, 3, 10, 5, 13, 22, '#e8a0b4'), // respaldo
    box(2, 7, 22, 4, 9, 30, METAL), // brazo del secador
    box(3, 3, 30, 11, 13, 37, '#b98cff'), // casco
    box(4, 4, 28, 10, 12, 30, '#9a70e0'), // borde del casco
  ],
};

// --- Frutería ------------------------------------------------------------------

/** Caja de madera llena de naranjas. */
export const orangeCrate: FurniModel = {
  boxes: [
    box(2, 2, 0, 14, 14, 9, WOOD), // caja
    box(2, 2, 4, 14, 14, 5, WOOD_DARK), // listón
    box(3, 3, 9, 7, 7, 12, '#ff8a2a'), // naranjas
    box(8, 3, 9, 12, 7, 12, '#ff9a3a'),
    box(3, 8, 9, 7, 12, 12, '#ff9a3a'),
    box(8, 8, 9, 12, 12, 12, '#ff8a2a'),
    box(6, 6, 12, 10, 10, 15, '#ff8a2a'),
    box(7, 7, 15, 8, 8, 16, '#5aa85a'), // hojita
  ],
};

/** Montón de sandías. */
export const watermelons: FurniModel = {
  boxes: [
    box(1, 1, 0, 8, 8, 6, '#3f8f3a'),
    box(8, 1, 0, 15, 8, 6, '#4aa044'),
    box(1, 8, 0, 8, 15, 6, '#4aa044'),
    box(8, 8, 0, 15, 15, 6, '#3f8f3a'),
    box(4, 4, 6, 11, 11, 12, '#4aa044'), // la de arriba
    box(11, 5, 7, 12, 10, 11, '#ff5a5a'), // una abierta (roja por dentro)
  ],
};

/** Báscula antigua de colgar, con su plato. */
export const oldScale: FurniModel = {
  boxes: [
    box(4, 4, 0, 12, 12, 2, METAL_DARK), // pie
    box(7, 7, 2, 9, 9, 30, METAL_DARK), // poste
    box(7, 7, 30, 13, 9, 32, METAL_DARK), // brazo
    box(10, 5, 22, 13, 11, 30, CREAM), // reloj
    box(10, 7, 25, 13, 9, 27, '#c83c3c'), // aguja
    box(11, 4, 14, 15, 12, 15, '#d4a017'), // plato
    box(12, 7, 15, 14, 9, 22, METAL), // cadena
    box(12, 5, 15, 14, 7, 17, '#ff8a2a'), // fruta en el plato
  ],
};
