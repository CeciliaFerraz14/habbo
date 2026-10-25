// Acciones: la ÚNICA forma de cambiar el estado del juego.
//
// La interfaz y los bots no tocan el estado directamente: crean una acción y
// la envían. En la fase 1 la aplica el propio navegador; en la fase 2 viajará
// por Socket.IO al servidor, que la validará y la aplicará.
//
// Sobre `avatarId`: en la fase 2 el servidor lo IGNORARÁ y usará el del
// usuario conectado a ese socket, para que nadie pueda actuar en nombre de otro.
import type { DecorId, Rotation } from './catalog';
import type { BusinessType, FacadeId, MaterialId } from './economy.config';
import type { Avatar, AvatarLook } from './types';

export type Action =
  /** Un avatar entra en el mundo. (Solo la usa el servidor, nunca un cliente.) */
  | { type: 'JOIN'; avatar: Avatar }
  /** Un avatar sale del mundo (se desconecta). Su dinero e inventario se conservan. */
  | { type: 'LEAVE'; avatarId: string }
  /**
   * Un avatar quiere ir a una baldosa. El camino lo calcula quien aplica la
   * acción (el servidor en la fase 2), no quien la envía: así nadie puede
   * mandar un camino que atraviese paredes.
   */
  | { type: 'MOVE'; avatarId: string; x: number; y: number }
  /** Sacar un mueble del inventario y colocarlo en la sala. */
  | { type: 'PLACE_FURNI'; avatarId: string; itemId: string; x: number; y: number; rotation: Rotation }
  /** Mover y/o girar un mueble que ya está en la sala. */
  | { type: 'MOVE_FURNI'; avatarId: string; itemId: string; x: number; y: number; rotation: Rotation }
  /** Recoger un mueble de la sala: vuelve al inventario. */
  | { type: 'PICKUP_FURNI'; avatarId: string; itemId: string }
  /** Decir algo en el chat de la sala. */
  | { type: 'SAY'; avatarId: string; text: string }
  /** Cambiar el aspecto (colores) del avatar. */
  | { type: 'SET_LOOK'; avatarId: string; look: AvatarLook }
  // --- Negocios ---
  /** Alquilar un local libre y abrir en él un negocio. */
  | { type: 'RENT_LOT'; avatarId: string; lotId: string; business: BusinessType }
  /** Chatarrería: recoger los materiales producidos. */
  | { type: 'COLLECT_MATERIALS'; avatarId: string; lotId: string }
  /** Taller: empezar a fabricar un mueble. */
  | { type: 'CRAFT'; avatarId: string; lotId: string; defId: DecorId }
  /** Taller: recoger los muebles terminados. */
  | { type: 'COLLECT_CRAFTED'; avatarId: string; lotId: string }
  /** Tienda: poner a la venta un mueble del inventario (se coloca en el local). */
  | { type: 'LIST_ITEM'; avatarId: string; lotId: string; itemId: string; price: number }
  /** Tienda: cambiar el precio de un producto. (Para retirarlo, PICKUP_FURNI.) */
  | { type: 'SET_PRICE'; avatarId: string; itemId: string; price: number }
  /** Comprar un producto de una tienda. */
  | { type: 'BUY_ITEM'; avatarId: string; itemId: string }
  /** Cambiar la plantilla de fachada de un local propio. */
  | { type: 'SET_FACADE'; avatarId: string; lotId: string; facade: FacadeId }
  /** Comprar materiales al proveedor de la gasolinera. */
  | { type: 'BUY_MATERIAL'; avatarId: string; material: MaterialId; quantity: number };
