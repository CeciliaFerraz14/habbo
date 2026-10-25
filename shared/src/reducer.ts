// El reducer recibe el estado actual y una acción, y devuelve el estado nuevo.
//
// Es una función PURA: no modifica el estado que recibe (crea copias) y con
// la misma entrada da siempre la misma salida. Esto facilita mucho depurar y
// permite que cliente y servidor ejecuten exactamente la misma lógica.
//
// Si una acción no es válida (mueble que no existe, sitio ocupado...), se
// devuelve el estado tal cual: la acción se ignora.
import type { Action } from './actions';
import { CATALOG } from './catalog';
import { MAX_CHAT_HISTORY, sanitizeMessage } from './chat';
import {
  buyItem,
  buyMaterial,
  canEditScene,
  collectCrafted,
  collectMaterials,
  listItem,
  rentLot,
  setFacade,
  setServicePrice,
  stockLot,
  setPrice,
  startCraft,
} from './economy';
import { ECONOMY } from './economy.config';
import { canPlaceFurni } from './furniture';
import { isValidLook } from './looks';
import { createTrailer } from './world';
import { SCENES, trailerSceneId } from './world.ids';
import { planPath, updateSitting } from './movement';
import type { Avatar, ChatMessage, FurniItem, GameState, InventoryItem } from './types';

export function applyAction(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'JOIN': {
      let next = state;
      let avatar = action.avatar;
      // Cada jugador tiene su caravana: se crea la primera vez que entra.
      const trailerId = trailerSceneId(avatar.id);
      if (!avatar.isBot && !next.scenes[trailerId]) {
        const trailer = createTrailer(avatar.id, avatar.name);
        next = {
          ...next,
          scenes: { ...next.scenes, [trailerId]: trailer.scene },
          furniture: {
            ...next.furniture,
            ...Object.fromEntries(trailer.furniture.map((f) => [f.id, f])),
          },
        };
      }
      // 'trailer' es un alias de "tu caravana".
      if (avatar.sceneId === SCENES.trailer) avatar = { ...avatar, sceneId: trailerId };
      // Solo se puede entrar en una escena que existe.
      if (!next.scenes[avatar.sceneId]) return state;
      next = withAvatar(next, avatar);
      // La primera vez que entra alguien, recibe el dinero inicial...
      if (next.money[avatar.id] === undefined) {
        next = { ...next, money: { ...next.money, [avatar.id]: ECONOMY.startingMoney } };
      }
      // ...y el kit inicial de muebles.
      if (!next.inventories[avatar.id]) {
        const items = ECONOMY.starterInventory.map((defId, i) => ({ id: `i${next.nextId + i}`, defId }));
        next = {
          ...withInventory(next, avatar.id, items),
          nextId: next.nextId + items.length,
        };
      }
      return updateSitting(next);
    }

    case 'LEAVE': {
      if (!state.avatars[action.avatarId]) return state;
      const { [action.avatarId]: _gone, ...avatars } = state.avatars;
      return { ...state, avatars };
    }

    case 'MOVE': {
      const avatar = state.avatars[action.avatarId];
      if (!avatar) return state;
      const path = planPath(state, avatar, { x: action.x, y: action.y });
      // Sin camino posible: ignoramos la acción.
      if (path === null) return state;
      return withAvatar(state, { ...avatar, path });
    }

    case 'PLACE_FURNI': {
      // El mueble se coloca en la escena donde está quien lo coloca.
      const avatar = state.avatars[action.avatarId];
      const inventory = state.inventories[action.avatarId] ?? [];
      const item = inventory.find((i) => i.id === action.itemId);
      if (!avatar || !item) return state;
      const { sceneId } = avatar;
      if (!canEditScene(state, avatar.id, sceneId)) return state;
      if (!canPlaceFurni(state, sceneId, item.defId, action.x, action.y, action.rotation)) {
        return state;
      }

      const placed: FurniItem = {
        id: item.id,
        sceneId,
        defId: item.defId,
        x: action.x,
        y: action.y,
        rotation: action.rotation,
      };
      const next = withInventory(
        state,
        action.avatarId,
        inventory.filter((i) => i.id !== item.id),
      );
      return updateSitting(withFurni(next, placed));
    }

    case 'MOVE_FURNI': {
      const item = state.furniture[action.itemId];
      if (!item || CATALOG[item.defId].fixed) return state;
      const { sceneId, defId, id } = item;
      if (!canEditScene(state, action.avatarId, sceneId)) return state;
      if (!canPlaceFurni(state, sceneId, defId, action.x, action.y, action.rotation, id)) {
        return state;
      }
      const moved = { ...item, x: action.x, y: action.y, rotation: action.rotation };
      return updateSitting(withFurni(state, moved));
    }

    case 'PICKUP_FURNI': {
      const item = state.furniture[action.itemId];
      if (!item || CATALOG[item.defId].fixed) return state;
      if (!canEditScene(state, action.avatarId, item.sceneId)) return state;
      const { [item.id]: _removed, ...furniture } = state.furniture;
      const inventory = state.inventories[action.avatarId] ?? [];
      const next = withInventory(state, action.avatarId, [
        ...inventory,
        { id: item.id, defId: item.defId },
      ]);
      // Si alguien estaba sentado encima, updateSitting lo levanta.
      return updateSitting({ ...next, furniture });
    }

    // --- Negocios: la lógica está en economy.ts ---
    case 'RENT_LOT':
      return rentLot(state, action.avatarId, action.lotId, action.business);
    case 'COLLECT_MATERIALS':
      return collectMaterials(state, action.avatarId, action.lotId);
    case 'CRAFT':
      return startCraft(state, action.avatarId, action.lotId, action.defId);
    case 'COLLECT_CRAFTED':
      return collectCrafted(state, action.avatarId, action.lotId);
    case 'LIST_ITEM':
      return listItem(state, action.avatarId, action.lotId, action.itemId, action.price);
    case 'SET_PRICE':
      return setPrice(state, action.avatarId, action.itemId, action.price);
    case 'BUY_ITEM':
      return buyItem(state, action.avatarId, action.itemId);
    case 'STOCK_LOT':
      return stockLot(state, action.avatarId, action.lotId);
    case 'SET_SERVICE_PRICE':
      return setServicePrice(state, action.avatarId, action.lotId, action.price);
    case 'SET_FACADE':
      return setFacade(state, action.avatarId, action.lotId, action.facade);
    case 'BUY_MATERIAL':
      return buyMaterial(state, action.avatarId, action.material, action.quantity);

    case 'SET_LOOK': {
      const avatar = state.avatars[action.avatarId];
      // Solo se aceptan colores de la lista de LOOK_COLORS.
      if (!avatar || !isValidLook(action.look)) return state;
      return withAvatar(state, { ...avatar, look: { ...action.look } });
    }

    case 'SAY': {
      const avatar = state.avatars[action.avatarId];
      const text = sanitizeMessage(action.text);
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
  }
}

/** Devuelve una copia del estado con el avatar añadido o reemplazado. */
export function withAvatar(state: GameState, avatar: Avatar): GameState {
  return { ...state, avatars: { ...state.avatars, [avatar.id]: avatar } };
}

function withFurni(state: GameState, item: FurniItem): GameState {
  return { ...state, furniture: { ...state.furniture, [item.id]: item } };
}

function withInventory(state: GameState, avatarId: string, items: InventoryItem[]): GameState {
  return { ...state, inventories: { ...state.inventories, [avatarId]: items } };
}
