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
import { SHOP_LOGOS } from './shopLogos';

const BACK_WALL = '#d9b88a';
const ROOF = '#a8825a';
const PLANK = '#8a6a48';
const WOOD_DOOR = '#7a5234';
const GLASS = '#a6e3d4';
const DARK = '#1a1414';
const CREAM = '#f6e7c8';
const CHROME = '#d8dde3';
/** Fondo del cartel cuando el local está abierto (oscuro, para que brille el neón). */
const SIGN_DARK = '#2a2030';

/**
 * Placa del dueño: franja crema entre el escaparate y el cartel, en el plano
 * x = 62..63, y de 8 a 56, z de 35 a 43. El nombre lo escribe encima la
 * interfaz (ui/lotSigns.ts), que usa estas mismas medidas.
 */
export const OWNER_PLATE = { x: 63, y0: 8, y1: 56, z0: 35, z1: 43 };

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
  if (variant === 'construction') return construction();
  const look = parseVariant(variant);
  const { open, facade } = look;
  // Las piezas de neón: apagadas son tubos grises; encendidas, dan luz.
  const neon = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box =>
    open ? glow(x0, y0, z0, x1, y1, z1, look.neon) : box(x0, y0, z0, x1, y1, z1, '#6a5c56');

  const boxes: Box[] = [
    // Edificio de detrás y su tejado plano
    box(0, 2, 0, 56, 62, 44, BACK_WALL),
    box(0, 2, 44, 56, 62, 47, ROOF),
    // Fachada falsa (bien alta, como en los pueblos del Oeste) y su remate,
    // con los colores de la plantilla
    box(56, 0, 0, 62, 64, 82, open ? facade.wall : '#c9a77a'),
    box(56, 0, 82, 63, 64, 85, open ? facade.trim : '#8a5a34'),
    // Cartel grande encima de la puerta (y de la placa del dueño), con su marco
    // de neón. Abierto es oscuro, como un cartel de neón de verdad: el logo resalta.
    box(62, 2, 44, 64, 62, 80, open ? SIGN_DARK : '#a89880'),
    neon(64, 3, 77, 65, 61, 78),
    neon(64, 3, 46, 65, 61, 47),
    neon(64, 3, 47, 65, 4, 77),
    neon(64, 60, 47, 65, 61, 77),
    ...doorBoxes(look),
  ];

  if (!open) {
    boxes.push(...closedFront());
    return { boxes };
  }
  const plate = OWNER_PLATE;
  boxes.push(
    ...templateFront(look),
    box(plate.x - 1, plate.y0, plate.z0, plate.x, plate.y1, plate.z1, CREAM),
    ...logoBoxes(look.business, look.neon),
  );
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
    box(64, 10, 54, 65, 14, 70, off),
    box(64, 20, 54, 65, 24, 70, off),
    box(64, 30, 54, 65, 34, 70, off),
    box(64, 40, 54, 65, 44, 70, off),
    box(64, 50, 54, 65, 54, 70, off),
    // Tablones en la puerta y el escaparate
    box(63, 16, 8, 64, 34, 11, PLANK),
    box(63, 16, 20, 64, 34, 23, PLANK),
    box(63, 36, 14, 64, 62, 17, PLANK),
    box(63, 36, 25, 64, 62, 28, PLANK),
  ];
}

/** Panel amarillo de "obras" en el andamio; el texto lo escribe la interfaz (ui/furniLabels.ts). */
export const WORKS_SIGN = { x: 66, y0: 18, y1: 46, z0: 8, z1: 18 };

/**
 * Local en obras (construido en un solar, ver buildLot): losa, muros a medio
 * levantar, la estructura de madera y un andamio delante con su cartel.
 */
function construction(): FurniModel {
  const steel = '#8a8f96';
  const post = (x: number, y: number): Box => box(x, y, 3, x + 3, y + 3, 44, PLANK);
  return {
    boxes: [
      // Losa de hormigón y muros a medio subir
      box(0, 0, 0, 64, 64, 3, '#bdb4a2'),
      box(0, 2, 3, 56, 62, 22, BACK_WALL),
      box(56, 0, 3, 62, 18, 30, '#c9a77a'),
      box(56, 32, 3, 62, 64, 16, '#c9a77a'),
      // Estructura de madera: postes y vigas de arriba
      post(0, 2),
      post(0, 59),
      post(28, 2),
      post(28, 59),
      post(53, 2),
      post(53, 59),
      box(0, 2, 41, 56, 5, 44, PLANK),
      box(0, 59, 41, 56, 62, 44, PLANK),
      box(53, 2, 41, 56, 62, 44, PLANK),
      // Andamio delante de la fachada: tubos y dos plataformas
      box(64, 2, 0, 65, 4, 56, steel),
      box(64, 30, 0, 65, 32, 56, steel),
      box(64, 60, 0, 65, 62, 56, steel),
      box(62, 2, 26, 68, 62, 28, PLANK),
      box(62, 2, 52, 68, 62, 54, PLANK),
      // Cartel de obras, amarillo con franjas negras arriba y abajo
      box(65, 16, 6, 66, 48, 20, '#f0c020'),
      box(66, 16, 18, 67, 48, 20, '#2a2030'),
      box(66, 16, 6, 67, 48, 8, '#2a2030'),
      // Ladrillos y un saco de cemento esperando
      box(4, 8, 3, 14, 18, 9, '#c0603c'),
      box(40, 40, 3, 48, 50, 8, '#e8e0cc'),
    ],
  };
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
 * Dónde va el logo: en el plano del cartel (x = 64..65), centrado en y = 32,
 * con su fila de arriba en z = 74. Cada píxel del dibujo mide scale x scale,
 * para que se lea bien desde la calle.
 */
const LOGO = { x: 64, yCenter: 32, zTop: 74, scale: 2 };

/**
 * Logo de neón del negocio en el cartel (ver shopLogos.ts): cada píxel es un
 * tubito de neón. Los píxeles seguidos del mismo color de una fila van en un
 * solo tubo, para no generar cientos de piezas. Visto de frente, la izquierda
 * del dibujo es la y alta del modelo.
 */
function logoBoxes(business: BusinessType | undefined, neonColor: string): Box[] {
  const logo = business ? SHOP_LOGOS[business] : undefined;
  if (!logo) return [];
  const width = Math.max(...logo.rows.map((r) => r.length));
  const s = LOGO.scale;
  const left = LOGO.yCenter + Math.ceil(width / 2) * s;
  const colorOf = (ch: string) => (ch === 'n' ? neonColor : logo.palette[ch]);
  const boxes: Box[] = [];
  logo.rows.forEach((row, r) => {
    const z1 = LOGO.zTop - r * s;
    let c = 0;
    while (c < row.length) {
      const ch = row[c];
      let end = c + 1;
      while (end < row.length && row[end] === ch) end++;
      const color = ch === '.' ? undefined : colorOf(ch);
      if (color) boxes.push(glow(LOGO.x, left - end * s, z1 - s, LOGO.x + 1, left - c * s, z1, color));
      c = end;
    }
  });
  return boxes;
}
