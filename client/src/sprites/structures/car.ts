// Coche clásico de dos baldosas de largo. Rotación 0: el morro mira a +x.
// La variante es el color de la carrocería (por ejemplo '#c83c3c').
// Faros y pilotos dan luz de noche.
import { box, glow, type FurniModel } from '../furniture/model';

const TIRE = '#2a2a2a';
const CHROME = '#d8dde3';

export function car(variant: string | undefined): FurniModel {
  const paint = variant ?? '#c83c3c';
  return {
    // Los faros iluminan el asfalto por delante del coche.
    light: { color: '#ffe14d', radius: 22, dx: 1.6 },
    boxes: [
      // Ruedas (a los dos lados, por debajo de la carrocería)
      box(5, 1, 0, 10, 3, 5, TIRE),
      box(22, 1, 0, 27, 3, 5, TIRE),
      box(5, 13, 0, 10, 15, 5, TIRE),
      box(22, 13, 0, 27, 15, 5, TIRE),
      // Carrocería, cristales y techo
      box(1, 3, 3, 31, 13, 11, paint),
      box(10, 4, 11, 22, 12, 16, '#a6e3d4'),
      box(9, 3, 16, 23, 13, 18, paint),
      // Parachoques cromados
      box(31, 3, 3, 32, 13, 5, CHROME),
      box(0, 3, 3, 1, 13, 5, CHROME),
      // Faros (delante) y pilotos (detrás)
      glow(31, 4, 6, 32, 6, 8, '#ffe14d'),
      glow(31, 10, 6, 32, 12, 8, '#ffe14d'),
      glow(0, 4, 6, 1, 6, 8, '#ff4f4f'),
      glow(0, 10, 6, 1, 12, 8, '#ff4f4f'),
    ],
  };
}
