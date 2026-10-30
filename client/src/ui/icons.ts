// Iconos de muebles para la interfaz, a partir de sus sprites del juego.
import type { FurniId, Rotation } from '@juego/shared';
import { getFurniSprite } from '../sprites/furniture/bake';

/** Crea un canvas con el mueble dibujado, que se puede meter en el HTML. */
export function furniIcon(defId: FurniId, rotation: Rotation = 1, variant?: string): HTMLCanvasElement {
  const { sprite } = getFurniSprite(defId, rotation, 'all', variant);
  const canvas = document.createElement('canvas');
  canvas.width = sprite.width;
  canvas.height = sprite.height;
  canvas.className = 'icon';
  canvas.getContext('2d')!.drawImage(sprite.canvas, 0, 0);
  return canvas;
}
