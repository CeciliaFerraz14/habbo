// Acciones: la ÚNICA forma de cambiar el estado del juego.
//
// La interfaz y los bots no tocan el estado directamente: crean una acción y
// la envían. En la fase 1 la aplica el propio navegador; en la fase 2 viajará
// por Socket.IO al servidor, que la validará y la aplicará.
import type { Avatar } from './types';

export type Action =
  /** Un avatar entra en la sala. */
  | { type: 'JOIN'; avatar: Avatar }
  /**
   * Un avatar quiere ir a una baldosa. El camino lo calcula quien aplica la
   * acción (el servidor en la fase 2), no quien la envía: así nadie puede
   * mandar un camino que atraviese paredes.
   */
  | { type: 'MOVE'; avatarId: string; x: number; y: number };
