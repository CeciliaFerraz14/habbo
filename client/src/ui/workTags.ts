// Turnos en la gasolinera, vistos encima del avatar de quien trabaja:
// - Una barra con lo que le queda de turno.
// - "+$5" (propina) o "+$40" (sueldo) que sube flotando y se desvanece cada
//   vez que cobra.
// Lo ve todo el que esté en la gasolinera, no solo quien trabaja.
//
// Como los nombres y los bocadillos: elementos HTML recolocados en cada fotograma.
import { ECONOMY, SCENES, secondsToTicks, type GameState } from '@juego/shared';
import type { Camera } from '../engine/camera';
import type { Point } from '../engine/iso';
import type { Renderer } from '../engine/renderer';
import type { AvatarViews } from '../game/avatarViews';
import { NAME_TAG_SPACE } from './nameTags';

/** Cuánto dura el "+$5" flotando, en ms, y cuántos píxeles sube. */
const FLOAT_MS = 1400;
const FLOAT_RISE = 24;
/** La barra va justo encima del nombre. */
const BAR_GAP = 3;

interface Floating {
  el: HTMLDivElement;
  avatarId: string;
  born: number;
}

export class WorkTags {
  private readonly layer: HTMLDivElement;
  private readonly bars = new Map<string, HTMLDivElement>();
  private floating: Floating[] = [];
  /** Dinero de cada jugador en el fotograma anterior y si estaba trabajando. */
  private readonly last = new Map<string, { money: number; working: boolean }>();

  constructor() {
    this.layer = document.createElement('div');
    this.layer.className = 'work-tags';
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
    const shiftTicks = secondsToTicks(ECONOMY.gasStation.shift.seconds);
    const seen = new Set<string>();

    for (const avatar of Object.values(state.avatars)) {
      if (avatar.isBot) continue;
      const shiftEndsAt = state.gasPlayers[avatar.id]?.shiftEndsAt ?? 0;
      const working = avatar.sceneId === SCENES.gas && shiftEndsAt > 0;
      const money = state.money[avatar.id] ?? 0;

      // ¿Ha cobrado algo mientras trabajaba (o al acabar el turno)? Que flote.
      const before = this.last.get(avatar.id);
      this.last.set(avatar.id, { money, working });
      const earned = before ? money - before.money : 0;
      if (earned > 0 && (working || before?.working) && avatar.sceneId === sceneId) {
        this.addFloating(avatar.id, `+${ECONOMY.currency}${earned}`, now);
      }

      const view = views.get(avatar.id);
      if (!working || avatar.sceneId !== sceneId || !view) continue;
      seen.add(avatar.id);
      let bar = this.bars.get(avatar.id);
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'work-bar';
        bar.append(document.createElement('i'));
        this.layer.append(bar);
        this.bars.set(avatar.id, bar);
      }
      const left = Math.max(0, shiftEndsAt - state.tick) / shiftTicks;
      (bar.firstElementChild as HTMLElement).style.width = `${Math.round((1 - left) * 100)}%`;
      const head = toScreen(renderer.avatarHeadPosition(state, avatar, view, camera));
      const x = Math.round(head.x - bar.offsetWidth / 2);
      const y = Math.round(head.y - NAME_TAG_SPACE - BAR_GAP - bar.offsetHeight);
      bar.style.transform = `translate(${x}px, ${y}px)`;
    }
    for (const [id, bar] of this.bars) {
      if (!seen.has(id)) {
        bar.remove();
        this.bars.delete(id);
      }
    }

    // El dinero flotante sube desde la cabeza y se desvanece.
    this.floating = this.floating.filter((f) => {
      const age = now - f.born;
      const avatar = state.avatars[f.avatarId];
      const view = views.get(f.avatarId);
      if (age > FLOAT_MS || !avatar || !view || avatar.sceneId !== sceneId) {
        f.el.remove();
        return false;
      }
      const head = toScreen(renderer.avatarHeadPosition(state, avatar, view, camera));
      const rise = (age / FLOAT_MS) * FLOAT_RISE;
      const x = Math.round(head.x + 10);
      const y = Math.round(head.y - f.el.offsetHeight - rise);
      f.el.style.transform = `translate(${x}px, ${y}px)`;
      f.el.style.opacity = String(Math.min(1, 2 * (1 - age / FLOAT_MS)));
      return true;
    });
  }

  private addFloating(avatarId: string, text: string, now: number): void {
    const el = document.createElement('div');
    el.className = 'money-float';
    el.textContent = text;
    this.layer.append(el);
    this.floating.push({ el, avatarId, born: now });
  }
}
