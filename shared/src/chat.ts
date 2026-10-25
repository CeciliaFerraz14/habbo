// Reglas del chat compartidas por cliente y servidor.

/** Longitud máxima de un mensaje. */
export const MAX_MESSAGE_LENGTH = 100;
/** Cuántos mensajes se guardan en el historial de la sala. */
export const MAX_CHAT_HISTORY = 50;

/**
 * Limpia un mensaje antes de aceptarlo: quita espacios sobrantes, junta los
 * espacios repetidos y lo recorta a la longitud máxima. Devuelve '' si el
 * mensaje queda vacío (y entonces se ignora).
 *
 * En la fase 2 aquí irá también la moderación básica (palabras prohibidas,
 * límite de mensajes por segundo...), que se ejecutará en el servidor.
 */
export function sanitizeMessage(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_MESSAGE_LENGTH);
}
