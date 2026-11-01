// Acciones: la ÚNICA forma de cambiar el estado del juego.
//
// La interfaz y los bots no tocan el estado directamente: crean una acción y
// la envían. En la fase 1 la aplica el propio navegador; en la fase 2 viajará
// por Socket.IO al servidor, que la validará y la aplicará.
//
// Sobre `avatarId`: en la fase 2 el servidor lo IGNORARÁ y usará el del
// usuario conectado a ese socket, para que nadie pueda actuar en nombre de otro.
import type { BusinessDecorId, DecorId, Rotation, VendorItemId } from './catalog';
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
  /** Construir un local en el solar número `solar` del Ensanche (ver buildLot). */
  | { type: 'BUILD_LOT'; avatarId: string; solar: number }
  /** Productores (chatarrería, pozo...): recoger los materiales producidos. */
  | { type: 'COLLECT_MATERIALS'; avatarId: string; lotId: string }
  /** Taller: empezar a fabricar un mueble. */
  | { type: 'CRAFT'; avatarId: string; lotId: string; defId: DecorId }
  /** Taller: el dueño lo abre a todos (pagando, ver workshopFee) o lo hace privado. */
  | { type: 'SET_WORKSHOP_PUBLIC'; avatarId: string; lotId: string; open: boolean }
  /** Taller: recoger los muebles terminados (cada uno, los suyos). */
  | { type: 'COLLECT_CRAFTED'; avatarId: string; lotId: string }
  /** Tienda: poner a la venta un mueble del inventario (se coloca en el local). */
  | { type: 'LIST_ITEM'; avatarId: string; lotId: string; itemId: string; price: number }
  /** Tienda: cambiar el precio de un producto. (Para retirarlo, PICKUP_FURNI.) */
  | { type: 'SET_PRICE'; avatarId: string; itemId: string; price: number }
  /** Comprar un producto de una tienda. */
  | { type: 'BUY_ITEM'; avatarId: string; itemId: string }
  /** Servicios: dejar en el local los materiales que gasta el servicio. */
  | { type: 'STOCK_LOT'; avatarId: string; lotId: string }
  /** Servicios: cambiar el precio del servicio. */
  | { type: 'SET_SERVICE_PRICE'; avatarId: string; lotId: string; price: number }
  /** Comprar un exclusivo a un vecino (hay que estar a su lado, ver vendors.ts). */
  | { type: 'BUY_FROM_VENDOR'; avatarId: string; npcId: string; defId: VendorItemId }
  /** Cerrar tu negocio: el local vuelve a estar en alquiler (ver closeBusiness). */
  | { type: 'CLOSE_BUSINESS'; avatarId: string; lotId: string }
  /** Comprar decoración propia de tu negocio (ver buyBusinessDecor). */
  | { type: 'BUY_DECOR'; avatarId: string; lotId: string; defId: BusinessDecorId }
  /** Mejorar tu local al nivel siguiente (ver upgradeLot). */
  | { type: 'UPGRADE_LOT'; avatarId: string; lotId: string }
  /** Cambiar la plantilla de fachada de un local propio. */
  | { type: 'SET_FACADE'; avatarId: string; lotId: string; facade: FacadeId }
  // --- Gasolinera (hay que estar dentro) ---
  /** Comprar materiales al proveedor. */
  | { type: 'BUY_MATERIAL'; avatarId: string; material: MaterialId; quantity: number }
  /** Vender materiales al proveedor. */
  | { type: 'SELL_MATERIAL'; avatarId: string; material: MaterialId; quantity: number }
  /** Entregar un encargo de Hank. */
  | { type: 'DELIVER_ORDER'; avatarId: string; orderId: string }
  /** Empezar un turno en la caja. */
  | { type: 'START_SHIFT'; avatarId: string }
  /** Comprar un boleto de rasca y gana. */
  | { type: 'BUY_SCRATCH'; avatarId: string }
  /** Comprar un refresco en la máquina. */
  | { type: 'BUY_SODA'; avatarId: string }
  /** Echar una partida en la máquina recreativa. */
  | { type: 'PLAY_PINBALL'; avatarId: string }
  /** Recoger la subvención del pueblo (si ya toca). */
  | { type: 'CLAIM_SUBSIDY'; avatarId: string };
