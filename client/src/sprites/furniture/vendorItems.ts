// Exclusivos que venden los vecinos del pueblo (ver shared/src/vendors.ts).
// Rotación 0: el frontal mira a SE (+x).
import { box, glow, type Box, type FurniModel } from './model';
import { PALETTE } from '../palette';

const PINK = '#ff7fb5';
const PINK_DARK = '#e0558f';
const BLACK = '#2a2430';

/** Flamenco rosa de jardín (Dolores), sobre sus patas de alambre. */
export const pinkFlamingo: FurniModel = {
  boxes: [
    box(7, 7, 0, 8, 8, 14, BLACK), // pata
    box(8, 8, 0, 9, 9, 12, BLACK), // otra pata
    box(4, 5, 14, 11, 11, 22, PINK), // cuerpo
    box(3, 6, 18, 5, 10, 23, PINK_DARK), // cola
    box(9, 7, 22, 11, 9, 32, PINK), // cuello
    box(9, 7, 32, 13, 9, 36, PINK), // cabeza
    box(13, 7, 31, 15, 9, 34, BLACK), // pico
  ],
};

/** Lámpara de lava (Dolores): cono de cristal con burbujas que brillan. */
export const lavaLamp: FurniModel = {
  light: { color: '#ff7a3d', radius: 16 },
  boxes: [
    box(5, 5, 0, 11, 11, 6, '#c0c0c8'), // pie
    box(6, 6, 6, 10, 10, 26, '#ffd27a'), // cristal
    glow(7, 7, 8, 9, 9, 12, '#ff5a2a'), // burbuja de abajo
    glow(7, 7, 15, 9, 9, 18, '#ff7a3d'), // burbuja del medio
    glow(7, 7, 21, 9, 9, 24, '#ff5a2a'), // burbuja de arriba
    box(6, 6, 26, 10, 10, 30, '#c0c0c8'), // tapa
  ],
};

/** Rueda de carreta de madera (Abuelo Tito), de pie sobre un soporte. */
export const wagonWheel: FurniModel = {
  boxes: [
    box(5, 4, 0, 9, 12, 2, '#5a3a20'), // soporte
    ...wheel(),
  ],
};

/** El aro y los radios de la rueda, hechos con cajitas en el plano y-z. */
function wheel(): Box[] {
  const RIM = '#b07a44';
  const SPOKE = '#9a6838';
  const cy = 8;
  const cz = 14;
  const boxes: Box[] = [];
  // Aro: cajitas alrededor de una elipse (en pantalla se ve redonda).
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const y = Math.round(cy + Math.cos(a) * 7);
    const z = Math.round(cz + Math.sin(a) * 12);
    boxes.push(box(6, y - 1, z - 1, 9, y + 1, z + 2, RIM));
  }
  // Radios: uno vertical, uno horizontal y dos en diagonal (a escalones).
  boxes.push(box(7, cy - 6, cz, 8, cy + 6, cz + 1, SPOKE));
  boxes.push(box(7, cy, cz - 11, 8, cy + 1, cz + 11, SPOKE));
  for (let k = -5; k <= 5; k++) {
    const y = cy + k;
    boxes.push(box(7, y, cz + Math.round(k * 1.6), 8, y + 1, cz + Math.round(k * 1.6) + 2, SPOKE));
    boxes.push(box(7, y, cz - Math.round(k * 1.6), 8, y + 1, cz - Math.round(k * 1.6) + 2, SPOKE));
  }
  boxes.push(box(8, cy - 2, cz - 2, 10, cy + 2, cz + 3, '#5a3a20')); // buje
  return boxes;
}

/** Surtidor de gasolina antiguo (Abuelo Tito), rojo, con su globo iluminado. */
export const gasPump: FurniModel = {
  light: { color: PALETTE.neonYellow, radius: 14 },
  boxes: [
    box(4, 4, 0, 12, 12, 3, '#6a6a70'), // peana
    box(5, 5, 3, 11, 11, 38, '#d8443c'), // cuerpo
    box(11, 6, 24, 12, 10, 33, '#f6e7c8'), // esfera del contador
    box(11, 7, 26, 12, 9, 31, BLACK), // agujas
    box(11, 9, 10, 13, 11, 20, BLACK), // manguera
    box(12, 10, 18, 14, 12, 21, '#a0a0a8'), // boquerel
    box(6, 6, 38, 10, 10, 40, '#a8302a'), // remate
    glow(6, 6, 40, 10, 10, 47, PALETTE.neonYellow), // globo
  ],
};

/** Cactus de neón (Nina): un saguaro hecho de tubos verdes sobre una peana. */
export const neonCactus: FurniModel = {
  light: { color: '#5aff8a', radius: 18 },
  boxes: [
    box(5, 5, 0, 11, 11, 3, BLACK), // peana
    glow(7, 7, 3, 9, 9, 34, '#5aff8a'), // tronco
    glow(7, 9, 12, 9, 13, 14, '#5aff8a'), // brazo derecho (codo)
    glow(7, 11, 14, 9, 13, 26, '#5aff8a'), // brazo derecho (arriba)
    glow(7, 3, 18, 9, 7, 20, '#5aff8a'), // brazo izquierdo (codo)
    glow(7, 3, 20, 9, 5, 29, '#5aff8a'), // brazo izquierdo (arriba)
    glow(7, 7, 34, 9, 9, 36, PALETTE.neonPink), // flor
  ],
};

/** Televisor retro (Nina): mueble de madera con patas, pantalla y antena. */
export const retroTv: FurniModel = {
  light: { color: PALETTE.neonCyan, radius: 12, dx: 0.6 },
  boxes: [
    box(4, 3, 0, 5, 4, 6, BLACK), // patas
    box(4, 12, 0, 5, 13, 6, BLACK),
    box(11, 3, 0, 12, 4, 6, BLACK),
    box(11, 12, 0, 12, 13, 6, BLACK),
    box(3, 2, 6, 13, 14, 24, '#9a6a3a'), // mueble
    box(13, 3, 9, 14, 11, 22, '#3a4a50'), // marco de la pantalla
    glow(13, 4, 10, 14, 10, 21, '#9ff0ff'), // pantalla
    box(13, 12, 18, 14, 13, 20, BLACK), // botones
    box(13, 12, 13, 14, 13, 15, BLACK),
    box(7, 7, 24, 9, 9, 26, BLACK), // base de la antena
    box(7, 4, 26, 8, 5, 36, '#a0a0a8'), // antena izquierda
    box(8, 11, 26, 9, 12, 36, '#a0a0a8'), // antena derecha
  ],
};
