// Nombre de usuario encima de los avatares de los jugadores (los NPC no lo llevan).
//
// Igual que los bocadillos: elementos HTML (texto nítido) recolocados en cada
// fotograma sobre la cabeza de cada avatar.
import { levelOf, type GameState } from '@juego/shared';
import type { Camera } from '../engine/camera';
import type { Point } from '../engine/iso';
import type { Renderer } from '../engine/renderer';
import type { AvatarViews } from '../game/avatarViews';
import { levelBadge } from './rankWindow';

/** Distancia entre la cabeza del avatar y la etiqueta. */
const HEAD_MARGIN = 2;
/**
 * Hueco que deja la etiqueta encima de la cabeza (margen + alto aproximado).
 * Los bocadillos de chat empiezan por encima para no taparla.
 */
export const NAME_TAG_SPACE = 18;

export class NameTags {
  private readonly layer: HTMLDivElement;
  private readonly tags = new Map<string, HTMLDivElement>();

  constructor() {
    this.layer = document.createElement('div');
    this.layer.className = 'name-tags';
    document.querySelector('#ui')!.prepend(this.layer);
  }

  update(
    state: GameState,
    sceneId: string,
    views: AvatarViews,
    renderer: Renderer,
    camera: Camera,
    toScreen: (p: Point) => Point,
    playerId: string,
  ): void {
    const seen = new Set<string>();
    for (const avatar of Object.values(state.avatars)) {
      const view = views.get(avatar.id);
      if (avatar.isBot || avatar.sceneId !== sceneId || !view) continue;
      seen.add(avatar.id);

      let tag = this.tags.get(avatar.id);
      if (!tag) {
        tag = document.createElement('div');
        tag.className = 'name-tag';
        tag.classList.toggle('me', avatar.id === playerId);
        this.layer.append(tag);
        this.tags.set(avatar.id, tag);
      }
      // Insignia de nivel y nombre. textContent (dentro de un nodo de texto): el
      // nombre lo elige el jugador, nunca se interpreta como HTML.
      const level = levelOf(state, avatar.id);
      const key = `${level}|${avatar.name}`;
      if (tag.dataset.key !== key) {
        tag.dataset.key = key;
        tag.replaceChildren(levelBadge(level), document.createTextNode(avatar.name));
      }
      const head = toScreen(renderer.avatarHeadPosition(state, avatar, view, camera));
      const x = Math.round(head.x - tag.offsetWidth / 2);
      const y = Math.round(head.y - HEAD_MARGIN - tag.offsetHeight);
      tag.style.transform = `translate(${x}px, ${y}px)`;
    }
    // Quitamos las de quien se ha ido o ha cambiado de escena.
    for (const [id, tag] of this.tags) {
      if (!seen.has(id)) {
        tag.remove();
        this.tags.delete(id);
      }
    }
  }
}
