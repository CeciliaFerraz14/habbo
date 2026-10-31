// Colores permitidos para el aspecto de los avatares.
//
// Están en /shared por dos motivos:
// - El reducer comprueba que un SET_LOOK solo usa estos colores. En la fase 2
//   eso impide que alguien mande colores inventados al servidor.
// - Los NPC (vecinos y viajeros) generan su aspecto al azar con randomLook().
import type { AvatarLook } from './types';

/** Las partes del avatar que tienen color (el sombrero no). */
export type LookPart = 'hair' | 'skin' | 'shirt' | 'pants';

export const LOOK_COLORS: Record<LookPart, readonly string[]> = {
  hair: ['#2a1a14', '#5a3a1e', '#a0622d', '#d9a441', '#e8e0d0', '#c0503a', '#ff4fa3', '#39a6c8'],
  skin: ['#ffe0bd', '#f0c090', '#d9a066', '#b07a4a', '#8a5a34', '#5e3a22'],
  shirt: ['#d94040', '#2f8f8a', '#f2b134', '#f6e7c8', '#4a78ab', '#6a4a8a', '#3a3434', '#7bb35b'],
  pants: ['#3050a0', '#2a2a3a', '#8a5a34', '#c9a77a', '#5e5450', '#a83850'],
};

/**
 * Colores especiales que se desbloquean con el rango Cowboy del asfalto (junto
 * con el sombrero). La piel no tiene especiales.
 */
export const PREMIUM_LOOK_COLORS: Record<LookPart, readonly string[]> = {
  hair: ['#d8dde3', '#7b3fa0', '#39e6ff', '#ffe14d'],
  skin: [],
  shirt: ['#ffe14d', '#ff4fa3', '#1a1f3a', '#39e6ff'],
  pants: ['#d8dde3', '#c83c3c', '#2f8f8a'],
};

/** Las partes del avatar que se pueden cambiar, en el orden en que se muestran. */
export const LOOK_PARTS = Object.keys(LOOK_COLORS) as LookPart[];

/** Aspecto con el que empieza un jugador nuevo. */
export const DEFAULT_LOOK: AvatarLook = {
  hair: '#5a3a1e',
  skin: '#f0c090',
  shirt: '#d94040',
  pants: '#3050a0',
};

/** ¿Este color está permitido para esta parte? (`premium`: con los especiales). */
function allowedColor(part: LookPart, color: string, premium: boolean): boolean {
  return LOOK_COLORS[part].includes(color) || (premium && PREMIUM_LOOK_COLORS[part].includes(color));
}

/**
 * ¿Todos los colores del aspecto están entre los permitidos? Con `premium`
 * (rango Cowboy del asfalto) valen también los especiales y el sombrero.
 */
export function isValidLook(look: AvatarLook, premium = false): boolean {
  if (look.hat && !premium) return false;
  return LOOK_PARTS.every((part) => typeof look[part] === 'string' && allowedColor(part, look[part], premium));
}

/**
 * El mismo aspecto, sin lo que no puede llevar: si no tiene el rango, los
 * colores especiales vuelven a los de por defecto y se quita el sombrero.
 */
export function sanitizeLook(look: AvatarLook, premium: boolean): AvatarLook {
  const clean: AvatarLook = { ...DEFAULT_LOOK };
  for (const part of LOOK_PARTS) if (allowedColor(part, look[part], premium)) clean[part] = look[part];
  if (premium && look.hat) clean.hat = true;
  return clean;
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
