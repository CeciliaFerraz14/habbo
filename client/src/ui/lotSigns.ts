// Nombre del dueño en los locales y las caravanas:
// - Dentro del local, en un cartel colgado en la pared del fondo.
// - Encima de cada caravana (en la calle o en una plaza), en un cartelito de madera.
// (El nombre sobre la placa de la fachada lo escribe furniLabels.ts.)
//
// Igual que los bocadillos y los precios: elementos HTML (texto nítido)
// recolocados en cada fotograma. Como las paredes son isométricas, cada cartel
// se inclina con skewY para que siga el plano de su pared.
import { trailerBuildingId, type GameState } from '@juego/shared';
import type { Camera } from '../engine/camera';
import { tileToScreen, type Point } from '../engine/iso';

/**
 * Inclinación de una pared que va a lo largo del eje x: cada baldosa en +x
 * baja media baldosa en pantalla (pendiente 1/2).
 */
const WALL_SKEW_DEG = (Math.atan(0.5) * 180) / Math.PI;

/** Cartel de la pared del fondo (y = 0) del interior de un local: de x = 2,5 a 5,5 y z de 44 a 62. */
const WALL_SIGN = { x0: 2.5, x1: 5.5, z0: 44, z1: 62 };

/** Un plano vertical a lo largo de x, en coordenadas del mundo (baldosas y px de altura). */
interface WallRect {
  x0: number;
  x1: number;
  y: number;
  z0: number;
  z1: number;
}

export class LotSigns {
  private readonly layer: HTMLDivElement;
  private readonly signs = new Map<string, HTMLDivElement>();

  constructor() {
    this.layer = document.createElement('div');
    this.layer.className = 'lot-signs';
    document.querySelector('#ui')!.prepend(this.layer);
  }

  update(
    state: GameState,
    sceneId: string,
    camera: Camera,
    toScreen: (p: Point) => Point,
    furniTop: (itemId: string) => Point | null,
  ): void {
    const seen = new Set<string>();
    const show = (key: string, className: string, lines: string[], rect: WallRect) => {
      seen.add(key);
      let el = this.signs.get(key);
      if (!el) {
        el = document.createElement('div');
        el.className = className;
        this.layer.append(el);
        this.signs.set(key, el);
      }
      // textContent: el nombre lo elige el jugador, nunca se interpreta como HTML.
      const text = lines.join('\n');
      if (el.textContent !== text) el.textContent = text;
      placeOnWall(el, rect, lines, camera, toScreen);
    };

    if (state.scenes[sceneId]?.kind === 'street') {
      // De quién es cada caravana: cartelito encima, sin inclinar (como un buzón).
      for (const playerId of Object.keys(state.homes)) {
        const name = state.avatars[playerId]?.name ?? state.progress[playerId]?.name;
        const top = furniTop(trailerBuildingId(playerId));
        if (!name || !top) continue;
        const key = `home:${playerId}`;
        seen.add(key);
        let el = this.signs.get(key);
        if (!el) {
          el = document.createElement('div');
          el.className = 'home-sign';
          this.layer.append(el);
          this.signs.set(key, el);
        }
        // textContent: el nombre lo elige el jugador, nunca se interpreta como HTML.
        if (el.textContent !== name) el.textContent = name;
        const p = toScreen(top);
        el.style.transform = `translate(${Math.round(p.x - el.offsetWidth / 2)}px, ${Math.round(p.y - el.offsetHeight - 2)}px)`;
      }
    } else {
      const lot = state.lots[sceneId];
      if (lot?.business && lot.ownerName) {
        show(`inside:${lot.id}`, 'lot-sign wall', ['Local de', lot.ownerName], { ...WALL_SIGN, y: 0 });
      }
    }

    // Quitamos los de locales que se han cerrado o de otra escena.
    for (const [key, el] of this.signs) {
      if (!seen.has(key)) {
        el.remove();
        this.signs.delete(key);
      }
    }
  }
}

/** Coloca e inclina `el` sobre el rectángulo de pared, con el texto a un tamaño que quepa. */
function placeOnWall(
  el: HTMLDivElement,
  rect: WallRect,
  lines: string[],
  camera: Camera,
  toScreen: (p: Point) => Point,
): void {
  const project = (x: number, z: number) => {
    const p = tileToScreen(x, rect.y);
    return toScreen({ x: camera.originX + p.x, y: camera.originY + p.y - z });
  };
  const topLeft = project(rect.x0, rect.z1);
  const topRight = project(rect.x1, rect.z1);
  const bottomLeft = project(rect.x0, rect.z0);
  const width = topRight.x - topLeft.x;
  const height = bottomLeft.y - topLeft.y;
  // Que quepa a lo alto (todas las líneas) y a lo ancho (la línea más larga;
  // cada carácter de la fuente mide algo más de media letra de ancho).
  const longest = Math.max(...lines.map((l) => l.length));
  const fontSize = Math.min((height / lines.length) * 0.8, width / (longest * 0.6));
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.fontSize = `${fontSize}px`;
  el.style.transform = `translate(${topLeft.x}px, ${topLeft.y}px) skewY(${WALL_SKEW_DEG}deg)`;
}
