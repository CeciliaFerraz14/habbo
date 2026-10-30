// Reglas del chat compartidas por cliente y servidor.
import type { ChatMessage, GameState } from './types';

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

/**
 * Añade al chat lo que dice un avatar, en su escena. Devuelve el mismo estado
 * si el avatar no existe o el mensaje queda vacío. Lo usan la acción SAY y la
 * lógica del juego que hace hablar a alguien (por ejemplo, la máquina recreativa).
 */
export function withChatMessage(state: GameState, avatarId: string, raw: string): GameState {
  const avatar = state.avatars[avatarId];
  const text = sanitizeMessage(raw);
  if (!avatar || text === '') return state;
  const message: ChatMessage = {
    id: `m${state.nextId}`,
    sceneId: avatar.sceneId,
    avatarId: avatar.id,
    name: avatar.name,
    text,
  };
  // Añadimos al final y nos quedamos solo con los últimos MAX_CHAT_HISTORY.
  return {
    ...state,
    messages: [...state.messages, message].slice(-MAX_CHAT_HISTORY),
    nextId: state.nextId + 1,
  };
}
