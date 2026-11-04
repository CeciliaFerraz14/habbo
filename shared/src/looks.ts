// Colores permitidos para el aspecto de los avatares.
//
// Están en /shared por dos motivos:
// - El reducer comprueba (normalizeLook) que un SET_LOOK solo usa estos colores. En la fase 2
//   eso impide que alguien mande colores inventados al servidor.
// - Los NPC (vecinos y viajeros) generan su aspecto al azar con randomLook().
import { GARMENTS, isGarmentId, type Outfit } from './garments';
import type { AvatarLook, LookPart } from './types';

export const LOOK_COLORS: Record<LookPart, readonly string[]> = {
  hair: ['#2a1a14', '#5a3a1e', '#a0622d', '#d9a441', '#e8e0d0', '#c0503a', '#ff4fa3', '#39a6c8'],
  skin: ['#ffe0bd', '#f0c090', '#d9a066', '#b07a4a', '#8a5a34', '#5e3a22'],
  shirt: ['#d94040', '#2f8f8a', '#f2b134', '#f6e7c8', '#4a78ab', '#6a4a8a', '#3a3434', '#7bb35b'],
  pants: ['#3050a0', '#2a2a3a', '#8a5a34', '#c9a77a', '#5e5450', '#a83850'],
};

/** Las partes del avatar que se pueden cambiar, en el orden en que se muestran. */
export const LOOK_PARTS = Object.keys(LOOK_COLORS) as LookPart[];

/** Colores en los que se cosen las prendas (garments.ts). */
export const GARMENT_COLORS: readonly string[] = [
  '#d94040', '#2f8f8a', '#f2b134', '#3a3434', '#4a78ab', '#8a5a34', '#f6e7c8', '#6a4a8a',
];

/** ¿Es un color de prenda permitido? (el valor puede venir del cliente). */
export function isGarmentColor(color: unknown): color is string {
  return typeof color === 'string' && GARMENT_COLORS.includes(color);
}

/** Aspecto con el que empieza un jugador nuevo. */
export const DEFAULT_LOOK: AvatarLook = {
  hair: '#5a3a1e',
  skin: '#f0c090',
  shirt: '#d94040',
  pants: '#3050a0',
};

/**
 * Comprueba un aspecto que viene del cliente y devuelve una copia limpia, o
 * null si no vale. Vale si todos los colores están entre los permitidos y, si
 * lleva ropa, cada prenda existe, va en su ranura y tiene un color de
 * GARMENT_COLORS. No nos fiamos de su forma: la copia solo lleva los campos
 * conocidos, así nadie cuela datos de más que luego se envían a todos y se
 * guardan. Aquí no se mira si las prendas son suyas (eso lo hace
 * dropUnownedOutfit).
 */
export function normalizeLook(look: unknown): AvatarLook | null {
  if (!isRecord(look)) return null;
  const clean = {} as AvatarLook;
  for (const part of LOOK_PARTS) {
    const color = look[part];
    if (typeof color !== 'string' || !LOOK_COLORS[part].includes(color)) return null;
    clean[part] = color;
  }
  if (look.outfit === undefined) return clean;
  const outfit = normalizeOutfit(look.outfit);
  if (!outfit) return null;
  return Object.keys(outfit).length > 0 ? { ...clean, outfit } : clean;
}

function normalizeOutfit(outfit: unknown): Outfit | null {
  if (!isRecord(outfit)) return null;
  const clean: Outfit = {};
  for (const [slot, garment] of Object.entries(outfit)) {
    if (!isRecord(garment)) return null;
    const { type, color } = garment;
    // La ranura tiene que ser la de esa prenda: así 'toString' o unas botas en
    // la cabeza no pasan.
    if (!isGarmentId(type) || GARMENTS[type].slot !== slot) return null;
    if (!isGarmentColor(color)) return null;
    clean[GARMENTS[type].slot] = { type, color };
  }
  return clean;
}

/** ¿Es un objeto normal (ni null ni un array)? */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Aspecto al azar. Recibe la función de azar como parámetro (en vez de usar
 * Math.random directamente) para que la simulación pueda pasarle un
 * generador con semilla y seguir siendo determinista.
 */
export function randomLook(random: () => number): AvatarLook {
  const pick = (part: LookPart) => {
    const options = LOOK_COLORS[part];
    return options[Math.floor(random() * options.length)];
  };
  return { hair: pick('hair'), skin: pick('skin'), shirt: pick('shirt'), pants: pick('pants') };
}
