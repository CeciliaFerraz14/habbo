// Acciones: la ÚNICA forma de cambiar el estado del juego.
//
// La interfaz y los bots no tocan el estado directamente: crean una acción y
// la envían. En la fase 1 la aplica el propio navegador; en la fase 2 viajará
// por Socket.IO al servidor, que la validará y la aplicará.
//
// Sobre `avatarId`: en la fase 2 el servidor lo IGNORARÁ y usará el del
// usuario conectado a ese socket, para que nadie pueda actuar en nombre de otro.
import type { FurniId, Rotation } from './catalog';
import type { Avatar } from './types';

export type Action =
  /** Un avatar entra en la sala. */
  | { type: 'JOIN'; avatar: Avatar }
  /**
   * Un avatar quiere ir a una baldosa. El camino lo calcula quien aplica la
   * acción (el servidor en la fase 2), no quien la envía: así nadie puede
   * mandar un camino que atraviese paredes.
   */
  | { type: 'MOVE'; avatarId: string; x: number; y: number }
  /** Obtener un mueble del catálogo: va al inventario. */
  | { type: 'BUY_FURNI'; avatarId: string; defId: FurniId }
  /** Sacar un mueble del inventario y colocarlo en la sala. */
  | { type: 'PLACE_FURNI'; avatarId: string; itemId: string; x: number; y: number; rotation: Rotation }
  /** Mover y/o girar un mueble que ya está en la sala. */
  | { type: 'MOVE_FURNI'; avatarId: string; itemId: string; x: number; y: number; rotation: Rotation }
  /** Recoger un mueble de la sala: vuelve al inventario. */
  | { type: 'PICKUP_FURNI'; avatarId: string; itemId: string }
  /** Decir algo en el chat de la sala. */
  | { type: 'SAY'; avatarId: string; text: string };
