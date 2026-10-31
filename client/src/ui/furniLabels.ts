// Textos pintados sobre muebles: el nombre en el cartel de neón (recompensa de
// Tendero) y los nombres de los alcaldes en la placa de su estatua.
//
// Como los demás textos del juego, son elementos HTML recolocados en cada
// fotograma. Cada texto ocupa un rectángulo vertical del modelo del mueble
// (en rotación 0, mirando a +x); aquí se gira con el mueble y se proyecta, y
// una matriz CSS deforma el texto para que siga el plano. Si el mueble está
// de espaldas (rotaciones 2 y 3), el texto no se ve.
import { CATALOG, furnitureInScene, type FurniItem, type GameState } from '@juego/shared';
import type { Camera } from '../engine/camera';
import { tileToScreen, type Point } from '../engine/iso';
import { NAME_SIGN_TEXT } from '../sprites/furniture/nameSign';
import { STATUE_PLAQUE } from '../sprites/structures/mayorStatue';

/** Un rectángulo vertical en el plano x del modelo (dieciseisavos de baldosa; z en px). */
interface Plane {
  x: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

export class FurniLabels {
  private readonly layer: HTMLDivElement;
  private readonly labels = new Map<string, HTMLDivElement>();

  constructor() {
    this.layer = document.createElement('div');
    this.layer.className = 'furni-labels';
    document.querySelector('#ui')!.prepend(this.layer);
  }

  update(state: GameState, sceneId: string, camera: Camera, toScreen: (p: Point) => Point): void {
    const seen = new Set<string>();
    for (const item of furnitureInScene(state, sceneId)) {
      const label = labelFor(state, item);
      if (!label || item.rotation > 1) continue;
      seen.add(item.id);
      let el = this.labels.get(item.id);
      if (!el) {
        el = document.createElement('div');
        this.layer.append(el);
        this.labels.set(item.id, el);
      }
      el.className = `furni-label ${label.style}`;
      // textContent: el nombre lo elige el jugador, nunca se interpreta como HTML.
      if (el.textContent !== label.text) el.textContent = label.text;
      place(el, item, label.plane, label.text, camera, toScreen);
    }
    for (const [id, el] of this.labels) {
      if (!seen.has(id)) {
        el.remove();
        this.labels.delete(id);
      }
    }
  }
}

/** Qué texto lleva un mueble (o null si ninguno). */
function labelFor(state: GameState, item: FurniItem): { text: string; plane: Plane; style: string } | null {
  if (item.defId === 'name_sign' && item.variant) return { text: item.variant, plane: NAME_SIGN_TEXT, style: 'neon' };
  if (item.defId === 'mayor_statue' && state.mayors.length > 0) {
    const text = state.mayors.length === 1 ? `Alcalde ${state.mayors[0]}` : `Alcaldes: ${state.mayors.join(', ')}`;
    return { text, plane: STATUE_PLAQUE, style: 'plaque' };
  }
  return null;
}

/** Gira un punto del modelo con el mueble, igual que bake.ts: (x, y) → (fondo − y, x). */
function rotate(item: FurniItem, x: number, y: number): [number, number] {
  let depth = CATALOG[item.defId].depth;
  let width = CATALOG[item.defId].width;
  for (let r = 0; r < item.rotation; r++) {
    [x, y] = [depth - y, x];
    [width, depth] = [depth, width];
  }
  return [x, y];
}

function place(
  el: HTMLDivElement,
  item: FurniItem,
  plane: Plane,
  text: string,
  camera: Camera,
  toScreen: (p: Point) => Point,
): void {
  // Visto de frente, la izquierda del texto es la y alta del modelo.
  const project = (y: number, z: number) => {
    const [x, yy] = rotate(item, plane.x / 16, y / 16);
    const p = tileToScreen(item.x + x, item.y + yy);
    return toScreen({ x: camera.originX + p.x, y: camera.originY + p.y - z });
  };
  const topLeft = project(plane.y1, plane.z1);
  const topRight = project(plane.y0, plane.z1);
  const bottomLeft = project(plane.y1, plane.z0);
  // El elemento mide lo mismo que el panel en pantalla (ancho a lo largo del
  // plano y alto en vertical): así la matriz solo lo inclina, sin estirar las
  // letras.
  const width = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
  const height = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y);
  const a = (topRight.x - topLeft.x) / width;
  const b = (topRight.y - topLeft.y) / width;
  const c = (bottomLeft.x - topLeft.x) / height;
  const d = (bottomLeft.y - topLeft.y) / height;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${topLeft.x}, ${topLeft.y})`;
  // Letra que quepa: a lo alto y a lo ancho (cada letra, algo más de media de ancho).
  el.style.fontSize = `${Math.min(height * 0.6, width / (Math.max(text.length, 2) * 0.75))}px`;
}
