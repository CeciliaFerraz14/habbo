// Piezas comunes de los tests (no se usan en el juego).
import { secondsToTicks } from './economy';
import { ECONOMY, type BusinessType, type Materials } from './economy.config';
import type { Avatar, GameState } from './types';
import { createInitialState } from './world';

/** Jugador p1 de prueba, quieto en esa escena. */
export function testPlayer(sceneId = 'lot1'): Avatar {
  return {
    id: 'p1',
    name: 'P1',
    sceneId,
    x: 1,
    y: 1,
    direction: 'SE',
    path: [],
    look: { hair: '#000000', skin: '#ffffff', shirt: '#ffffff', pants: '#000000' },
    isBot: false,
    sitting: false,
  };
}

/** Jugador p1 dentro de lot1, que es suyo y tiene ese negocio con ese almacén. */
export function withBusiness(business: BusinessType, storage: Materials = {}, price = 0): GameState {
  const state = createInitialState();
  const config = ECONOMY.businesses[business];
  return {
    ...state,
    avatars: { p1: testPlayer() },
    lots: {
      ...state.lots,
      lot1: {
        ...state.lots.lot1,
        ownerId: 'p1',
        ownerName: 'P1',
        business,
        facade: config.defaultFacade,
        storage,
        price,
        nextRentAt: state.tick + secondsToTicks(ECONOMY.rent.periodSeconds),
        nextProductionAt: state.tick + secondsToTicks(config.production?.seconds ?? 0),
      },
    },
    money: { p1: 0 },
  };
}
