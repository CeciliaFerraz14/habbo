// Celebración al subir de nivel: fuegos artificiales pixelados que salen de
// la cabeza del avatar y "¡NIVEL 5!" con el nombre del rango. La ve todo el que
// esté en la misma escena.
//
// Como los nombres y los bocadillos: elementos HTML recolocados en cada fotograma.
import { levelOf, rankOf, type GameState } from '@juego/shared';
import type { Camera } from '../engine/camera';
import type { Point } from '../engine/iso';
import type { Renderer } from '../engine/renderer';
import type { AvatarViews } from '../game/avatarViews';

/** Cuánto dura la celebración, en ms. */
const CELEBRATION_MS = 2200;
/** Chispas de cada explosión, sus colores y hasta dónde llegan (px). */
const SPARKS = 14;
const SPARK_COLORS = ['#ffe14d', '#ff4fa3', '#39e6ff', '#7be35b', '#f6e7c8'];
const SPARK_DISTANCE = 46;

interface Celebration {
  el: HTMLDivElement;
  avatarId: string;
  born: number;
}

export class LevelUps {
  private readonly layer: HTMLDivElement;
  private celebrations: Celebration[] = [];
  /** Nivel de cada jugador la última vez que lo vimos (para notar cuándo sube). */
  private readonly levels = new Map<string, number>();

  constructor() {
    this.layer = document.createElement('div');
    this.layer.className = 'level-ups';
    document.querySelector('#ui')!.prepend(this.layer);
  }

  update(
    state: GameState,
    sceneId: string,
    views: AvatarViews,
    renderer: Renderer,
    camera: Camera,
    toScreen: (p: Point) => Point,
    now: number,
  ): void {
    for (const avatar of Object.values(state.avatars)) {
      if (avatar.isBot) continue;
      const level = levelOf(state, avatar.id);
      const before = this.levels.get(avatar.id);
      this.levels.set(avatar.id, level);
      // La primera vez que lo vemos no celebramos nada: ya tenía ese nivel.
      if (before !== undefined && level > before && avatar.sceneId === sceneId) {
        this.celebrate(avatar.id, level, now);
      }
    }

    this.celebrations = this.celebrations.filter((c) => {
      const avatar = state.avatars[c.avatarId];
      const view = views.get(c.avatarId);
      if (now - c.born > CELEBRATION_MS || !avatar || !view || avatar.sceneId !== sceneId) {
        c.el.remove();
        return false;
      }
      const head = toScreen(renderer.avatarHeadPosition(state, avatar, view, camera));
      c.el.style.transform = `translate(${Math.round(head.x)}px, ${Math.round(head.y - 30)}px)`;
      return true;
    });
  }

  private celebrate(avatarId: string, level: number, now: number): void {
    const el = document.createElement('div');
    el.className = 'level-up';
    // Chispas en círculo: cada una sale en su dirección (variables CSS).
    for (let i = 0; i < SPARKS; i++) {
      const angle = (i / SPARKS) * Math.PI * 2;
      const spark = document.createElement('i');
      spark.style.setProperty('--dx', `${Math.round(Math.cos(angle) * SPARK_DISTANCE)}px`);
      spark.style.setProperty('--dy', `${Math.round(Math.sin(angle) * SPARK_DISTANCE)}px`);
      spark.style.background = SPARK_COLORS[i % SPARK_COLORS.length];
      el.append(spark);
    }
    const label = document.createElement('span');
    label.textContent = `¡NIVEL ${level}! ${rankOf(level).name}`;
    el.append(label);
    this.layer.append(el);
    this.celebrations.push({ el, avatarId, born: now });
  }
}
