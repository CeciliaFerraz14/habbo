// Caravana vintage del jugador, vista desde fuera. 3x5 baldosas.
// En rotación 0 su lado largo (con la puerta) mira a +x; la puerta está en
// y = 32..48, que con rotación 1 queda frente a su tercera baldosa.
// Con la variante '+door' la puerta se dibuja abierta (animación al cruzarla).
import { box, glow, type Box, type FurniModel } from '../furniture/model';

const DOOR = '#2f8f8a';

export function trailer(variant: string | undefined): FurniModel {
  const doorOpen = variant?.includes('door') ?? false;
  // Abierta: hueco oscuro y la hoja girada hacia fuera sobre su bisagra.
  const door: Box[] = doorOpen
    ? [box(44, 34, 9, 45, 46, 37, '#1a1414'), box(45, 44, 9, 51, 46, 37, DOOR)]
    : [box(44, 34, 9, 45, 46, 37, DOOR)];

  return {
    // La lucecita de la puerta ilumina el suelo delante de ella.
    light: { color: '#ffe14d', radius: 18, dx: 1.9, dy: 0.5 },
    boxes: [
      // Ruedas
      box(36, 14, 0, 42, 26, 8, '#2e2a2a'),
      box(36, 54, 0, 42, 66, 8, '#2e2a2a'),
      // Carrocería de dos colores y techo
      box(4, 2, 8, 44, 78, 24, '#4fb3a9'),
      box(4, 2, 24, 44, 78, 40, '#f3e6c8'),
      box(6, 4, 40, 42, 76, 43, '#d8d0c0'),
      // Franja, puerta y ventanas
      box(44, 2, 22, 45, 30, 25, '#c0503a'),
      box(44, 50, 22, 45, 78, 25, '#c0503a'),
      ...door,
      box(44, 8, 27, 45, 26, 35, '#a6e3d4'),
      box(44, 54, 27, 45, 72, 35, '#a6e3d4'),
      // Escalón y lucecita de la puerta
      box(44, 34, 0, 48, 46, 5, '#9a9a9a'),
      glow(45, 47, 33, 46, 49, 36, '#ffe14d'),
    ],
  };
}
