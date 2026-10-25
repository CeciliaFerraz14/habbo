// Local comercial del oeste con fachada falsa (más alta que el edificio).
// 4x4 baldosas. En rotación 0 la fachada mira a +x; la puerta está en
// y = 16..32 (dieciseisavos), que con rotación 1 queda frente a la tercera baldosa.
//
// Variantes:
//   'closed'          tablones en puerta y escaparate, cartel apagado
//   'open'            sin tablones, escaparate iluminado, neón rosa
//   'open:#rrggbb'    igual, con el neón del color indicado
import { box, glow, type Box, type FurniModel } from '../furniture/model';
import { PALETTE } from '../palette';

const WALL = '#d9b88a';
const ROOF = '#a8825a';
const TRIM = '#8a5a34';
const PLANK = '#8a6a48';

export function shop(variant: string | undefined): FurniModel {
  const open = variant?.startsWith('open') ?? false;
  const neonColor = variant?.split(':')[1] ?? PALETTE.neonPink;
  // Un neón apagado es un tubo gris; encendido, una pieza que da luz.
  const neon = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box =>
    open ? glow(x0, y0, z0, x1, y1, z1, neonColor) : box(x0, y0, z0, x1, y1, z1, '#6a5c56');

  const boxes: Box[] = [
    // Edificio de detrás y su tejado plano
    box(0, 2, 0, 56, 62, 44, WALL),
    box(0, 2, 44, 56, 62, 47, ROOF),
    // Fachada falsa y su remate
    box(56, 0, 0, 62, 64, 66, open ? '#e8c48a' : '#c9a77a'),
    box(56, 0, 66, 63, 64, 69, TRIM),
    // Puerta, ventanuco y escaparate
    box(62, 18, 0, 63, 32, 30, '#7a5234'),
    box(62, 4, 14, 63, 13, 30, open ? '#a6e3d4' : '#3b3440'),
    box(62, 38, 10, 63, 60, 32, open ? '#a6e3d4' : '#3b3440'),
    // Cartel encima de la puerta
    box(62, 6, 40, 64, 58, 60, open ? '#f6e7c8' : '#a89880'),
    // Neón: un marco y unas "letras" (barritas) sobre el cartel
    neon(64, 8, 57, 65, 56, 58),
    neon(64, 8, 42, 65, 56, 43),
    neon(64, 8, 43, 65, 9, 57),
    neon(64, 55, 43, 65, 56, 57),
    neon(64, 14, 46, 65, 16, 54),
    neon(64, 22, 46, 65, 24, 54),
    neon(64, 30, 46, 65, 32, 54),
    neon(64, 38, 46, 65, 40, 54),
    neon(64, 46, 46, 65, 48, 54),
  ];

  if (!open) {
    // Tablones clavados en la puerta y en el escaparate
    boxes.push(
      box(63, 16, 8, 64, 34, 11, PLANK),
      box(63, 16, 20, 64, 34, 23, PLANK),
      box(63, 36, 14, 64, 62, 17, PLANK),
      box(63, 36, 25, 64, 62, 28, PLANK),
    );
  }
  return { boxes };
}
