// Iconos de muebles para la interfaz, a partir de sus sprites del juego.
import type { FurniId } from '@juego/shared';
import { getFurniSprite } from '../sprites/furniture/bake';

/**
 * Crea un canvas con el mueble dibujado, que se puede meter en el HTML. La
 * variante es la del mueble (por ejemplo el color de la prenda de un burro).
 */
export function furniIcon(defId: FurniId, variant?: string): HTMLCanvasElement {
  const { sprite } = getFurniSprite(defId, 1, 'all', variant);
  const canvas = document.createElement('canvas');
  canvas.width = sprite.width;
  canvas.height = sprite.height;
  canvas.className = 'icon';
  canvas.getContext('2d')!.drawImage(sprite.canvas, 0, 0);
  return canvas;
}
