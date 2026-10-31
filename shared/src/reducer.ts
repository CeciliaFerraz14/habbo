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
import { withChatMessage } from './chat';
import {
  buyItem,
  canEditScene,
  claimSubsidy,
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
import {
  buyMaterial,
  buyScratch,
  buySoda,
  deliverOrder,
  playPinball,
  sellMaterial,
  startShift,
} from './gasStation';
import { canPlaceFurni } from './furniture';
import { isInsideScene } from './scene';
import { addDailyXp, markSeen, perksOf } from './levels';
import { isValidLook, sanitizeLook } from './looks';
import { addHome, createTrailer, homeSceneId, nextHomeSlot } from './world';
import { SCENES, trailerSceneId } from './world.ids';
import { planPath, updateSitting } from './movement';
import type { Avatar, FurniItem, GameState, InventoryItem } from './types';

export function applyAction(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'JOIN': {
      let next = state;
      let avatar = action.avatar;
      // La primera vez que entra un jugador, recibe su parcela en la calle (su
      // caravana y, si no es el primero, un local nuevo).
      if (!avatar.isBot) next = addHome(next, avatar.id, nextHomeSlot(next));
      // Cada jugador tiene su caravana: se crea la primera vez que entra.
      const trailerId = trailerSceneId(avatar.id);
      if (!avatar.isBot && !next.scenes[trailerId]) {
        const trailer = createTrailer(avatar.id, avatar.name, homeSceneId(next.homes[avatar.id] ?? 0));
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
      // Un jugador que vuelve aparece donde estaba: donde sigue su avatar (si
      // aún no se había ido, por ejemplo al reconectar tras bloquear el móvil)
      // o donde se desconectó la última vez. Si esa escena ya no existe, entra
      // por la normal.
      // (Si esa baldosa ya no está dentro de la escena, por ejemplo porque el
      // pueblo ha cambiado, también entra por la normal.)
      const back = avatar.isBot ? undefined : (state.avatars[avatar.id] ?? state.lastPositions[avatar.id]);
      const backScene = back && next.scenes[back.sceneId];
      if (back && backScene && isInsideScene(backScene, back.x, back.y)) {
        const { sceneId, x, y, direction } = back;
        avatar = { ...avatar, sceneId, x, y, direction, path: [] };
      }
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
      // XP por entrar a jugar (una vez al día). Y fuera del aspecto lo que su
      // rango aún no permite (colores especiales y sombrero).
      if (!avatar.isBot) {
        next = markSeen(addDailyXp(next, avatar.id), avatar.id);
        const look = sanitizeLook(avatar.look, perksOf(next, avatar.id).premiumLook);
        next = withAvatar(next, { ...next.avatars[avatar.id], look });
      }
      return updateSitting(next);
    }

    case 'LEAVE': {
      const leaving = state.avatars[action.avatarId];
      if (!leaving) return state;
      const { [action.avatarId]: _gone, ...avatars } = state.avatars;
      if (leaving.isBot) return { ...state, avatars };
      // Recordamos dónde estaba, para devolverlo ahí cuando vuelva, y cuándo se fue.
      const { sceneId, x, y, direction } = leaving;
      return markSeen(
        {
          ...state,
          avatars,
          lastPositions: { ...state.lastPositions, [leaving.id]: { sceneId, x, y, direction } },
        },
        leaving.id,
      );
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
        // El cartel de neón lleva el nombre de quien lo coloca.
        ...(item.defId === 'name_sign' ? { variant: avatar.name } : {}),
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

    // --- Gasolinera: la lógica está en gasStation.ts ---
    case 'BUY_MATERIAL':
      return buyMaterial(state, action.avatarId, action.material, action.quantity);
    case 'SELL_MATERIAL':
      return sellMaterial(state, action.avatarId, action.material, action.quantity);
    case 'DELIVER_ORDER':
      return deliverOrder(state, action.avatarId, action.orderId);
    case 'START_SHIFT':
      return startShift(state, action.avatarId);
    case 'BUY_SCRATCH':
      return buyScratch(state, action.avatarId);
    case 'BUY_SODA':
      return buySoda(state, action.avatarId);
    case 'PLAY_PINBALL':
      return playPinball(state, action.avatarId);
    case 'CLAIM_SUBSIDY':
      return claimSubsidy(state, action.avatarId);

    case 'SET_LOOK': {
      const avatar = state.avatars[action.avatarId];
      // Solo se aceptan colores de la lista de LOOK_COLORS (y los especiales y
      // el sombrero, con el rango Cowboy del asfalto).
      if (!avatar || !isValidLook(action.look, perksOf(state, avatar.id).premiumLook)) return state;
      return withAvatar(state, { ...avatar, look: { ...action.look } });
    }

    case 'SAY':
      return withChatMessage(state, action.avatarId, action.text);
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
