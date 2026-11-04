// Iconos de muebles y prendas para la interfaz, a partir de sus sprites del juego.
import { isGarmentDisplay, type FurniId, type Garment, type Product } from '@juego/shared';
import type { Sprite } from '../sprites/canvas';
import { getGarmentSprite } from '../sprites/avatar';
import { getFurniSprite } from '../sprites/furniture/bake';

/**
 * Las prendas sueltas son pequeñas (unos 16x8 px), así que su icono se
 * amplía x2, sin suavizar, para que se distinga en las listas.
 */
const GARMENT_ICON_SCALE = 2;

/** Crea un canvas con el sprite dibujado (ampliado `scale` veces), que se puede meter en el HTML. */
function spriteIcon(sprite: Sprite, scale = 1): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sprite.width * scale;
  canvas.height = sprite.height * scale;
  canvas.className = 'icon';
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite.canvas, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Icono de un mueble. */
export function furniIcon(defId: FurniId): HTMLCanvasElement {
  return spriteIcon(getFurniSprite(defId, 1).sprite);
}

/** Icono de una prenda de un tipo y color. */
export function garmentIcon(garment: Garment): HTMLCanvasElement {
  return spriteIcon(getGarmentSprite(garment), GARMENT_ICON_SCALE);
}

/** Icono de un producto a la venta: la prenda de un burro o el mueble. */
export function productIcon(product: Product): HTMLCanvasElement {
  return isGarmentDisplay(product)
    ? garmentIcon({ type: product.garment, color: product.variant })
    : furniIcon(product.defId);
}
