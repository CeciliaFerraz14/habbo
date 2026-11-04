// Piezas comunes de los tests (no se usan en el juego).
import type { Avatar } from './types';

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
