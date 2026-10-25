// Local comercial del oeste con fachada falsa (más alta que el edificio).
// 4x4 baldosas. En rotación 0 la fachada mira a +x; la puerta está en
// y = 16..32 (dieciseisavos), que con rotación 1 queda frente a la tercera baldosa.
//
// La variante (ver buildingVariant() en shared/economy.ts) tiene la forma:
//   'closed'                                tablones, cartel apagado
//   'open:<neón>:<fachada>:<negocio>'       abierto, con su plantilla y su icono
// y el renderer le añade '+door' mientras la puerta está abierta (animación).
import { FACADES, type BusinessType, type FacadeConfig } from '@juego/shared';
import { box, glow, type Box, type FurniModel } from '../furniture/model';
import { PALETTE } from '../palette';

const BACK_WALL = '#d9b88a';
const ROOF = '#a8825a';
const PLANK = '#8a6a48';
const WOOD_DOOR = '#7a5234';
const GLASS = '#a6e3d4';
const DARK = '#1a1414';
const CREAM = '#f6e7c8';
const CHROME = '#d8dde3';

interface ShopLook {
  open: boolean;
  doorOpen: boolean;
  neon: string;
  facade: FacadeConfig;
  facadeId: string;
  business: BusinessType | undefined;
}

function parseVariant(variant: string | undefined): ShopLook {
  const [base, flags = ''] = (variant ?? 'closed').split('+');
  const [status, neon = PALETTE.neonPink, facadeId = 'classic', business] = base.split(':');
  return {
    open: status === 'open',
    doorOpen: flags.includes('door'),
    neon,
    facadeId,
    facade: FACADES[facadeId as keyof typeof FACADES] ?? FACADES.classic,
    business: business as BusinessType | undefined,
  };
}

export function shop(variant: string | undefined): FurniModel {
  const look = parseVariant(variant);
  const { open, facade } = look;
  // Las piezas de neón: apagadas son tubos grises; encendidas, dan luz.
  const neon = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box =>
    open ? glow(x0, y0, z0, x1, y1, z1, look.neon) : box(x0, y0, z0, x1, y1, z1, '#6a5c56');

  const boxes: Box[] = [
    // Edificio de detrás y su tejado plano
    box(0, 2, 0, 56, 62, 44, BACK_WALL),
    box(0, 2, 44, 56, 62, 47, ROOF),
    // Fachada falsa y su remate, con los colores de la plantilla
    box(56, 0, 0, 62, 64, 66, open ? facade.wall : '#c9a77a'),
    box(56, 0, 66, 63, 64, 69, open ? facade.trim : '#8a5a34'),
    // Cartel encima de la puerta, con su marco de neón
    box(62, 6, 40, 64, 58, 60, open ? CREAM : '#a89880'),
    neon(64, 8, 57, 65, 56, 58),
    neon(64, 8, 42, 65, 56, 43),
    neon(64, 8, 43, 65, 9, 57),
    neon(64, 55, 43, 65, 56, 57),
    ...doorBoxes(look),
  ];

  if (!open) {
    boxes.push(...closedFront());
    return { boxes };
  }
  boxes.push(...templateFront(look), ...businessIcon(look.business, neon));
  // Abierto, el neón tiñe la acera delante de la fachada.
  return { boxes, light: { color: look.neon, radius: 36, dx: 2.4 } };
}

/**
 * Puerta: cerrada es un panel de madera. Abierta, el hueco se ve oscuro y la
 * hoja gira hacia fuera sobre la bisagra (en y = 32), así que la dibujamos
 * perpendicular a la fachada.
 */
function doorBoxes(look: ShopLook): Box[] {
  if (!look.doorOpen) return [box(62, 18, 0, 63, 32, 30, WOOD_DOOR)];
  return [box(62, 18, 0, 63, 32, 30, DARK), box(63, 30, 0, 69, 32, 30, WOOD_DOOR)];
}

/** Local en alquiler: ventanas oscuras, letras apagadas y tablones clavados. */
function closedFront(): Box[] {
  const off = '#6a5c56';
  return [
    box(62, 4, 14, 63, 13, 30, '#3b3440'),
    box(62, 38, 10, 63, 60, 32, '#3b3440'),
    // "Letras" apagadas del cartel
    box(64, 14, 46, 65, 16, 54, off),
    box(64, 22, 46, 65, 24, 54, off),
    box(64, 30, 46, 65, 32, 54, off),
    box(64, 38, 46, 65, 40, 54, off),
    box(64, 46, 46, 65, 48, 54, off),
    // Tablones en la puerta y el escaparate
    box(63, 16, 8, 64, 34, 11, PLANK),
    box(63, 16, 20, 64, 34, 23, PLANK),
    box(63, 36, 14, 64, 62, 17, PLANK),
    box(63, 36, 25, 64, 62, 28, PLANK),
  ];
}

/** Lo que distingue a cada plantilla: ventanas, zócalos, persianas, toldos... */
function templateFront(look: ShopLook): Box[] {
  const { facade } = look;
  switch (look.facadeId) {
    case 'diner':
      return [
        // Zócalo cromado (a los lados de la puerta) y franja roja bajo el cartel
        box(62, 0, 0, 63, 18, 4, CHROME),
        box(62, 32, 0, 63, 64, 4, CHROME),
        box(62, 0, 32, 63, 64, 35, facade.trim),
        // Dos ventanales
        box(62, 3, 8, 63, 16, 30, GLASS),
        box(62, 35, 8, 63, 61, 30, GLASS),
      ];
    case 'garage':
      return [
        box(62, 4, 14, 63, 13, 30, GLASS),
        // Persiana metálica en lugar de escaparate, con sus lamas
        box(62, 35, 0, 63, 62, 34, '#9aa3ad'),
        box(63, 35, 8, 64, 62, 9, '#7a828c'),
        box(63, 35, 16, 64, 62, 17, '#7a828c'),
        box(63, 35, 24, 64, 62, 25, '#7a828c'),
      ];
    case 'boutique': {
      // Toldo de rayas sobre el escaparate: tiras alternas que sobresalen.
      const awning: Box[] = [];
      for (let y = 36, i = 0; y < 62; y += 4, i++) {
        awning.push(box(62, y, 32, 66, Math.min(y + 4, 62), 34, i % 2 === 0 ? facade.trim : CREAM));
      }
      return [box(62, 4, 14, 63, 13, 30, GLASS), box(62, 38, 8, 63, 60, 30, GLASS), ...awning];
    }
    default:
      // Clásica: ventanuco y escaparate.
      return [box(62, 4, 14, 63, 13, 30, GLASS), box(62, 38, 10, 63, 60, 32, GLASS)];
  }
}

/**
 * Icono de neón en el cartel según el negocio, para saber desde la calle qué
 * es cada local: un neumático (chatarrería), un martillo (taller) o una bolsa
 * de la compra (tienda). Está hecho de tubos de 1 px en el plano del cartel.
 */
function businessIcon(
  business: BusinessType | undefined,
  neon: (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => Box,
): Box[] {
  // Coordenadas en el plano del cartel (x = 64..65): y de 20 a 44, z de 43 a 57.
  // Los tubos tienen 2 de grosor para que se lean bien sin zoom.
  switch (business) {
    case 'scrapyard':
      // Neumático: un aro y el buje en el centro.
      return [
        neon(64, 21, 55, 65, 43, 57),
        neon(64, 21, 43, 65, 43, 45),
        neon(64, 21, 45, 65, 23, 55),
        neon(64, 41, 45, 65, 43, 55),
        neon(64, 30, 48, 65, 34, 52),
      ];
    case 'workshop':
      // Martillo: mango vertical y cabeza horizontal.
      return [neon(64, 30, 43, 65, 34, 51), neon(64, 20, 51, 65, 44, 56)];
    case 'store':
      // Bolsa de la compra: el contorno de la bolsa y el asa.
      return [
        neon(64, 22, 43, 65, 42, 45),
        neon(64, 22, 45, 65, 24, 51),
        neon(64, 40, 45, 65, 42, 51),
        neon(64, 22, 51, 65, 42, 53),
        neon(64, 27, 53, 65, 29, 57),
        neon(64, 35, 53, 65, 37, 57),
      ];
    default:
      return [];
  }
}
