// Bocadillos de chat encima de los avatares.
//
// Son elementos HTML (texto nítido) que recolocamos en cada fotograma para
// seguir al avatar. Comportamiento:
// - Aparecen encima de la cabeza de quien habla.
// - Suben despacio todo el rato.
// - Cuando aparece un bocadillo nuevo, los anteriores suben de golpe su altura
//   para no taparse entre ellos (como una pila).
// - A los pocos segundos se desvanecen y se eliminan.

import type { ChatMessage, GameState } from '@juego/shared';
import type { Camera } from '../engine/camera';
import type { Point } from '../engine/iso';
import type { Renderer } from '../engine/renderer';
import type { AvatarViews } from '../game/avatarViews';
import { NAME_TAG_SPACE } from './nameTags';

/** Cuánto vive un bocadillo, en ms. */
const LIFETIME_MS = 7000;
/** Durante cuánto tiempo (al final de su vida) se desvanece. */
const FADE_MS = 1200;
/** Velocidad de subida continua, en píxeles de pantalla por segundo. */
const RISE_SPEED = 6;
/** Separación entre bocadillos apilados. */
const GAP = 4;
/** Distancia entre la cabeza del avatar y la punta del bocadillo. */
const HEAD_MARGIN = 4;

interface Bubble {
  el: HTMLDivElement;
  avatarId: string;
  /** Escena donde se dijo: el bocadillo no "viaja" si el avatar cruza una puerta. */
  sceneId: string;
  born: number;
  /** Subida acumulada por los bocadillos que han aparecido después. */
  pushed: number;
}

export class ChatBubbles {
  private readonly layer: HTMLDivElement;
  private bubbles: Bubble[] = [];
  /** Ids de mensajes ya mostrados, para detectar los nuevos. */
  private readonly seen = new Set<string>();

  constructor(initialMessages: readonly ChatMessage[]) {
    this.layer = document.createElement('div');
    this.layer.className = 'bubbles';
    document.querySelector('#ui')!.prepend(this.layer);
    // Los mensajes que ya existían al arrancar no generan bocadillo.
    for (const m of initialMessages) this.seen.add(m.id);
  }

  /**
   * Crea bocadillos para los mensajes nuevos de la escena `sceneId` (la del
   * jugador). Los de otras escenas se marcan como vistos pero no se muestran.
   */
  sync(messages: readonly ChatMessage[], sceneId: string, now: number): void {
    for (const message of messages) {
      if (this.seen.has(message.id)) continue;
      this.seen.add(message.id);
      if (message.sceneId === sceneId) this.add(message, now);
    }
  }

  private add(message: ChatMessage, now: number): void {
    const el = document.createElement('div');
    el.className = 'bubble';
    const name = document.createElement('b');
    // textContent (y no innerHTML): si alguien escribe "<script>", se muestra
    // como texto y no se ejecuta. Imprescindible en un chat multijugador.
    name.textContent = `${message.name}: `;
    el.append(name, document.createTextNode(message.text));
    this.layer.append(el);

    // Empujamos hacia arriba los bocadillos que ya estaban.
    const height = el.offsetHeight + GAP;
    for (const b of this.bubbles) b.pushed += height;
    this.bubbles.push({
      el,
      avatarId: message.avatarId,
      sceneId: message.sceneId,
      born: now,
      pushed: 0,
    });
  }

  /**
   * Recoloca todos los bocadillos. `toScreen` convierte un punto del canvas a
   * píxeles de pantalla (el canvas está escalado).
   */
  update(
    state: GameState,
    sceneId: string,
    views: AvatarViews,
    renderer: Renderer,
    camera: Camera,
    toScreen: (p: Point) => Point,
    now: number,
  ): void {
    this.bubbles = this.bubbles.filter((b) => {
      const age = now - b.born;
      const avatar = state.avatars[b.avatarId];
      const view = views.get(b.avatarId);
      // Fuera los bocadillos caducados, de otra escena, o de avatares que se han ido.
      const gone = !avatar || !view || avatar.sceneId !== b.sceneId;
      if (age > LIFETIME_MS || b.sceneId !== sceneId || gone) {
        b.el.remove();
        return false;
      }

      const head = toScreen(renderer.avatarHeadPosition(state, avatar, view, camera));
      // Los jugadores llevan su nombre encima: el bocadillo empieza por encima de él.
      const nameSpace = avatar.isBot ? 0 : NAME_TAG_SPACE;
      const rise = (age / 1000) * RISE_SPEED + b.pushed + nameSpace;
      const x = Math.round(head.x - b.el.offsetWidth / 2);
      const y = Math.round(head.y - HEAD_MARGIN - b.el.offsetHeight - rise);
      b.el.style.transform = `translate(${x}px, ${y}px)`;
      b.el.style.opacity = String(Math.min(1, (LIFETIME_MS - age) / FADE_MS));
      return true;
    });
  }
}
