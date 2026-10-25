// Colores permitidos para el aspecto de los avatares.
//
// Están en /shared por dos motivos:
// - El reducer comprueba que un SET_LOOK solo usa estos colores. En la fase 2
//   eso impide que alguien mande colores inventados al servidor.
// - Los NPC (vecinos y viajeros) generan su aspecto al azar con randomLook().
import type { AvatarLook } from './types';

export const LOOK_COLORS: Record<keyof AvatarLook, readonly string[]> = {
  hair: ['#2a1a14', '#5a3a1e', '#a0622d', '#d9a441', '#e8e0d0', '#c0503a', '#ff4fa3', '#39a6c8'],
  skin: ['#ffe0bd', '#f0c090', '#d9a066', '#b07a4a', '#8a5a34', '#5e3a22'],
  shirt: ['#d94040', '#2f8f8a', '#f2b134', '#f6e7c8', '#4a78ab', '#6a4a8a', '#3a3434', '#7bb35b'],
  pants: ['#3050a0', '#2a2a3a', '#8a5a34', '#c9a77a', '#5e5450', '#a83850'],
};

/** Las partes del avatar que se pueden cambiar, en el orden en que se muestran. */
export const LOOK_PARTS = Object.keys(LOOK_COLORS) as (keyof AvatarLook)[];

/** Aspecto con el que empieza un jugador nuevo. */
export const DEFAULT_LOOK: AvatarLook = {
  hair: '#5a3a1e',
  skin: '#f0c090',
  shirt: '#d94040',
  pants: '#3050a0',
};

/** ¿Todos los colores del aspecto están entre los permitidos? */
export function isValidLook(look: AvatarLook): boolean {
  return LOOK_PARTS.every((part) => LOOK_COLORS[part].includes(look[part]));
}

/**
 * Aspecto al azar. Recibe la función de azar como parámetro (en vez de usar
 * Math.random directamente) para que la simulación pueda pasarle un
 * generador con semilla y seguir siendo determinista.
 */
export function randomLook(random: () => number): AvatarLook {
  const pick = (part: keyof AvatarLook) => {
    const options = LOOK_COLORS[part];
    return options[Math.floor(random() * options.length)];
  };
  return { hair: pick('hair'), skin: pick('skin'), shirt: pick('shirt'), pants: pick('pants') };
}
