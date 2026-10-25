// Convierte un modelo de cajas en un sprite pixel art para una rotación dada.
//
// Pasos:
// 1. Girar las cajas según la rotación del mueble.
// 2. Ordenarlas de atrás hacia delante (mismo algoritmo que la escena).
// 3. Proyectar cada cara visible de cada caja y rellenar los píxeles que caen
//    dentro (rasterizar). Solo vemos 3 caras: la de arriba, la que mira a +y
//    (izquierda-delante) y la que mira a +x (derecha-delante).
// 4. Dibujar el contorno oscuro de cada caja.

import { CATALOG, type FurniId, type Rotation } from '@juego/shared';
import { depthSort } from '../../engine/depth';
import { tileToScreen, type Point } from '../../engine/iso';
import { createSprite, type Sprite } from '../canvas';
import { shade } from '../color';
import { MODELS } from './index';
import type { Box, Decal, FurniModel } from './model';
import { PALETTE } from '../palette';

const OUTLINE = PALETTE.outline;

export interface FurniSprite {
  sprite: Sprite;
  /** Dónde va la esquina superior izquierda del sprite respecto a la esquina superior de la baldosa (x, y) del mueble. */
  offsetX: number;
  offsetY: number;
}

/** Proyección isométrica de un punto 3D: como tileToScreen, restando la altura. */
function project(x: number, y: number, z: number): Point {
  const p = tileToScreen(x, y);
  return { x: p.x, y: p.y - z };
}

/**
 * Gira un cuarto de vuelta (de +x hacia +y) un punto de un mueble que ocupa
 * `width` x `depth` baldosas. La fórmula (x, y) → (depth - y, x) es una
 * rotación de 90º seguida de un desplazamiento para que no salgan negativos.
 */
function rotatePoint(x: number, y: number, depth: number): [number, number] {
  return [depth - y, x];
}

function rotateBox(b: Box, depth: number): Box {
  const [ax, ay] = rotatePoint(b.x0, b.y0, depth);
  const [bx, by] = rotatePoint(b.x1, b.y1, depth);
  return {
    ...b,
    x0: Math.min(ax, bx),
    x1: Math.max(ax, bx),
    y0: Math.min(ay, by),
    y1: Math.max(ay, by),
  };
}

/**
 * ¿Está el punto (px, py) dentro del polígono convexo `poly`?
 * Para cada lado calculamos el producto vectorial entre el lado y el vector
 * hacia el punto: su signo dice si el punto queda a la izquierda o a la
 * derecha. Si queda del mismo lado de TODOS los lados, está dentro.
 */
function insideConvex(poly: Point[], px: number, py: number): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
    if (cross === 0) continue;
    const s = Math.sign(cross);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return sign !== 0;
}

/** Las 3 caras visibles de una caja, ya proyectadas, con su color (luz desde la izquierda). */
function visibleFaces(b: Box): { poly: Point[]; color: string }[] {
  const { x0, y0, z0, x1, y1, z1 } = b;
  return [
    {
      // Cara superior.
      poly: [project(x0, y0, z1), project(x1, y0, z1), project(x1, y1, z1), project(x0, y1, z1)],
      color: b.color,
    },
    {
      // Cara que mira a +y (abajo a la izquierda en pantalla): algo más oscura.
      poly: [project(x0, y1, z1), project(x1, y1, z1), project(x1, y1, z0), project(x0, y1, z0)],
      color: shade(b.color, 0.82),
    },
    {
      // Cara que mira a +x (abajo a la derecha en pantalla): la más oscura.
      poly: [project(x1, y0, z1), project(x1, y1, z1), project(x1, y1, z0), project(x1, y0, z0)],
      color: shade(b.color, 0.64),
    },
  ];
}

/** Qué parte del mueble hornear: entero, o solo el respaldo (ver Box.backrest). */
export type FurniPart = 'all' | 'backrest';

/** Resuelve el modelo de un mueble para una variante (si el modelo depende de ella). */
export function getModel(defId: FurniId, variant?: string): FurniModel {
  const source = MODELS[defId];
  return typeof source === 'function' ? source(variant) : source;
}

function bake(
  defId: FurniId,
  rotation: Rotation,
  part: FurniPart,
  variant: string | undefined,
): FurniSprite {
  const def = CATALOG[defId];
  const model = getModel(defId, variant);

  // 1. Girar cajas y calcomanías tantas veces como indique la rotación.
  let boxes = part === 'backrest' ? model.boxes.filter((b) => b.backrest) : model.boxes;
  let decals: Decal[] = part === 'backrest' ? [] : (model.decals ?? []);
  let depth = def.depth;
  let width = def.width;
  for (let r = 0; r < rotation; r++) {
    const d = depth;
    boxes = boxes.map((b) => rotateBox(b, d));
    decals = decals.map((dc) => {
      const [x, y] = rotatePoint(dc.x, dc.y, d);
      return { ...dc, x, y };
    });
    [width, depth] = [depth, width]; // al girar, ancho y fondo se intercambian
  }

  // 2. Ordenar de atrás hacia delante.
  boxes = depthSort(boxes, (b) => b, (_b, i) => i);

  // Calculamos el rectángulo que ocupa todo en pantalla para crear un canvas justo.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const extend = (p: Point) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  };
  for (const b of boxes) {
    for (const face of visibleFaces(b)) face.poly.forEach(extend);
  }
  for (const dc of decals) {
    const p = project(dc.x, dc.y, dc.z);
    const w = dc.rows[0].length;
    extend({ x: p.x - w / 2 - 1, y: p.y - dc.rows.length - 1 });
    extend({ x: p.x + w / 2 + 1, y: p.y + 1 });
  }
  minX = Math.floor(minX) - 1;
  minY = Math.floor(minY) - 1;
  const w = Math.ceil(maxX) - minX + 1;
  const h = Math.ceil(maxY) - minY + 1;

  // Trabajamos sobre una matriz de colores y al final la pasamos al canvas.
  const pixels: (string | null)[] = new Array(w * h).fill(null);

  // 3 y 4. Rasterizar cada caja con su contorno.
  for (const b of boxes) {
    const mask = new Map<number, string>(); // índice de píxel → color
    for (const face of visibleFaces(b)) {
      const poly = face.poly.map((p) => ({ x: p.x - minX, y: p.y - minY }));
      const xs = poly.map((p) => p.x);
      const ys = poly.map((p) => p.y);
      for (let py = Math.floor(Math.min(...ys)); py <= Math.ceil(Math.max(...ys)); py++) {
        for (let px = Math.floor(Math.min(...xs)); px <= Math.ceil(Math.max(...xs)); px++) {
          // Probamos el CENTRO del píxel. El pequeño desplazamiento evita que
          // un centro caiga justo sobre una arista y se pinte en dos caras.
          if (insideConvex(poly, px + 0.51, py + 0.52)) mask.set(py * w + px, face.color);
        }
      }
    }
    for (const [i, color] of mask) {
      const px = i % w;
      const py = Math.floor(i / w);
      // Es borde si algún vecino (arriba, abajo, izquierda, derecha) no es de esta caja.
      const isEdge =
        !mask.has(i - 1) || !mask.has(i + 1) || !mask.has(i - w) || !mask.has(i + w) ||
        px === 0 || px === w - 1 || py === 0 || py === h - 1;
      pixels[i] = isEdge ? OUTLINE : color;
    }
  }

  // Calcomanías (por encima de las cajas) con su propio contorno exterior.
  for (const dc of decals) {
    const p = project(dc.x, dc.y, dc.z);
    const dw = dc.rows[0].length;
    const left = Math.round(p.x - minX - dw / 2);
    const top = Math.round(p.y - minY - dc.rows.length);
    const filled = new Set<number>();
    dc.rows.forEach((row, ry) => {
      if (row.length !== dw) throw new Error(`Decal de ${defId}: la fila ${ry} mide ${row.length}`);
      for (let rx = 0; rx < dw; rx++) {
        const ch = row[rx];
        if (ch === '.') continue;
        const i = (top + ry) * w + left + rx;
        pixels[i] = dc.palette[ch];
        filled.add(i);
      }
    });
    for (const i of filled) {
      for (const n of [i - 1, i + 1, i - w, i + w]) {
        if (!filled.has(n) && n >= 0 && n < pixels.length) pixels[n] = OUTLINE;
      }
    }
  }

  const sprite = createSprite(w, h, (px) => {
    for (let i = 0; i < pixels.length; i++) {
      const color = pixels[i];
      if (color) px(i % w, Math.floor(i / w), color);
    }
  });
  return { sprite, offsetX: minX, offsetY: minY };
}

const cache = new Map<string, FurniSprite>();

/** Sprite de un mueble en una rotación. Se hornea la primera vez y se reutiliza. */
export function getFurniSprite(
  defId: FurniId,
  rotation: Rotation,
  part: FurniPart = 'all',
  variant?: string,
): FurniSprite {
  const key = `${defId}:${rotation}:${part}:${variant ?? ''}`;
  let result = cache.get(key);
  if (!result) {
    result = bake(defId, rotation, part, variant);
    cache.set(key, result);
  }
  return result;
}
