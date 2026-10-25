// Etiquetas de precio encima de los productos de una tienda.
//
// Igual que los bocadillos: elementos HTML (texto nítido) recolocados en cada
// fotograma sobre el sprite de cada producto.
import { ECONOMY, type GameState } from '@juego/shared';
import type { Point } from '../engine/iso';
import type { Renderer } from '../engine/renderer';

export class PriceTags {
  private readonly layer: HTMLDivElement;
  private readonly tags = new Map<string, HTMLDivElement>();

  constructor() {
    this.layer = document.createElement('div');
    this.layer.className = 'price-tags';
    document.querySelector('#ui')!.prepend(this.layer);
  }

  update(state: GameState, sceneId: string, renderer: Renderer, toScreen: (p: Point) => Point): void {
    const seen = new Set<string>();
    for (const item of Object.values(state.furniture)) {
      if (item.sceneId !== sceneId || item.price === undefined) continue;
      const top = renderer.furniTop(item.id);
      if (!top) continue;
      seen.add(item.id);

      let tag = this.tags.get(item.id);
      if (!tag) {
        tag = document.createElement('div');
        tag.className = 'price-tag';
        this.layer.append(tag);
        this.tags.set(item.id, tag);
      }
      const text = `${ECONOMY.currency}${item.price}`;
      if (tag.textContent !== text) tag.textContent = text;
      const p = toScreen(top);
      tag.style.transform = `translate(${Math.round(p.x - tag.offsetWidth / 2)}px, ${Math.round(p.y - tag.offsetHeight - 2)}px)`;
    }
    // Quitamos las etiquetas de productos vendidos, retirados o de otra escena.
    for (const [id, tag] of this.tags) {
      if (!seen.has(id)) {
        tag.remove();
        this.tags.delete(id);
      }
    }
  }
}
