// El reducer recibe el estado actual y una acción, y devuelve el estado nuevo.
//
// Es una función PURA: no modifica el estado que recibe (crea copias) y con
// la misma entrada da siempre la misma salida. Esto facilita mucho depurar y
// permite que cliente y servidor ejecuten exactamente la misma lógica.
import type { Action } from './actions';
import { findPath } from './pathfinding';
import { isInsideRoom } from './room';
import type { Avatar, GameState } from './types';

/** ¿Se puede pisar la baldosa (x, y)? De momento basta con que esté en la sala. */
export function isWalkable(state: GameState, x: number, y: number): boolean {
  return isInsideRoom(state.room, x, y);
}

export function applyAction(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'JOIN':
      return withAvatar(state, action.avatar);

    case 'MOVE': {
      const avatar = state.avatars[action.avatarId];
      if (!avatar) return state;

      const path = findPath(
        { x: avatar.x, y: avatar.y },
        { x: action.x, y: action.y },
        state.room.width,
        state.room.depth,
        (x, y) => isWalkable(state, x, y),
      );
      // Sin camino posible: ignoramos la acción.
      if (path === null) return state;
      return withAvatar(state, { ...avatar, path });
    }
  }
}

/** Devuelve una copia del estado con el avatar añadido o reemplazado. */
export function withAvatar(state: GameState, avatar: Avatar): GameState {
  return { ...state, avatars: { ...state.avatars, [avatar.id]: avatar } };
}
