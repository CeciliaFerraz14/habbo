// =============================================================================
//  ILUMINACIÓN NOCTURNA
// =============================================================================
//
// Trabajamos con tres capas (canvas) y las combinamos al final:
//
//   1. FONDO: el cielo del momento del día (ya viene oscuro de noche).
//   2. ESCENA: suelo, paredes, muebles y avatares, dibujados normalmente en un
//      canvas aparte. De noche le aplicamos un tinte azul oscuro SOLO donde
//      hay píxeles (modo 'source-atop'), así no oscurecemos el cielo dos veces.
//   3. LUCES: las piezas que dan luz (neones, bombillas). Se construye
//      recorriendo los objetos EN EL MISMO ORDEN de profundidad que la escena:
//        - cada objeto BORRA de la capa lo que tapa ('destination-out'),
//        - y si tiene piezas emisivas, las pinta.
//      Así una farola que queda detrás de un edificio no brilla a través de él.
//
// Composición final:  fondo → escena oscurecida → charcos de luz en el suelo
//                     → halo de 1 px alrededor de las luces → luces.
//
// Los modos de composición (globalCompositeOperation) son la clave:
//   'source-over'      normal: lo nuevo encima
//   'source-atop'      lo nuevo solo donde ya había píxeles
//   'destination-out'  lo nuevo BORRA lo que había
//   'lighter'          suma colores (como sumar luz)
// =============================================================================

import type { Sprite } from '../sprites/canvas';
import { createSprite } from '../sprites/canvas';

/** Color del tinte nocturno y cuánto se nota con oscuridad máxima. */
const NIGHT_TINT = '20, 26, 64';
const NIGHT_TINT_STRENGTH = 0.62;

interface LightOp {
  sprite: Sprite;
  x: number;
  y: number;
  /** Si es true, el sprite se pinta (luz); si no, borra (tapa luces de detrás). */
  emits: boolean;
}

interface Pool {
  x: number;
  y: number;
  color: string;
  radius: number;
}

export class Lighting {
  private readonly scene = document.createElement('canvas');
  private readonly lights = document.createElement('canvas');
  private readonly sceneCtx = this.scene.getContext('2d')!;
  private readonly lightsCtx = this.lights.getContext('2d')!;
  private ops: LightOp[] = [];
  private pools: Pool[] = [];
  private readonly poolSprites = new Map<string, Sprite>();

  /** Contexto donde hay que dibujar la escena en este fotograma. */
  get context(): CanvasRenderingContext2D {
    return this.sceneCtx;
  }

  /** Prepara un fotograma nuevo del tamaño indicado. */
  begin(width: number, height: number): void {
    for (const canvas of [this.scene, this.lights]) {
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    }
    this.sceneCtx.imageSmoothingEnabled = false;
    this.lightsCtx.imageSmoothingEnabled = false;
    this.sceneCtx.clearRect(0, 0, width, height);
    this.ops = [];
    this.pools = [];
  }

  /** Un objeto opaco dibujado en (x, y): tapa las luces que tenga detrás. */
  occlude(sprite: Sprite, x: number, y: number): void {
    this.ops.push({ sprite, x, y, emits: false });
  }

  /** Piezas emisivas de un objeto, dibujadas en (x, y). */
  emit(sprite: Sprite, x: number, y: number): void {
    this.ops.push({ sprite, x, y, emits: true });
  }

  /** Charco de luz en el suelo, centrado en (x, y) del canvas. */
  addPool(x: number, y: number, color: string, radius: number): void {
    this.pools.push({ x, y, color, radius });
  }

  /** Combina las capas sobre `output`. `darkness` va de 0 (día) a 1 (noche). */
  compose(output: CanvasRenderingContext2D, backdrop: HTMLCanvasElement, darkness: number): void {
    output.drawImage(backdrop, 0, 0);

    if (darkness > 0) {
      // Tinte nocturno solo sobre los píxeles de la escena.
      this.sceneCtx.globalCompositeOperation = 'source-atop';
      this.sceneCtx.fillStyle = `rgba(${NIGHT_TINT}, ${darkness * NIGHT_TINT_STRENGTH})`;
      this.sceneCtx.fillRect(0, 0, this.scene.width, this.scene.height);
      this.sceneCtx.globalCompositeOperation = 'source-over';
    }
    output.drawImage(this.scene, 0, 0);
    if (darkness === 0) return;

    // Capa de luces, en orden de profundidad.
    const lc = this.lightsCtx;
    lc.clearRect(0, 0, this.lights.width, this.lights.height);
    for (const op of this.ops) {
      lc.globalCompositeOperation = op.emits ? 'source-over' : 'destination-out';
      lc.drawImage(op.sprite.canvas, op.x, op.y);
    }
    lc.globalCompositeOperation = 'source-over';

    // Charcos de luz: se SUMAN ('lighter') a lo que hay debajo.
    output.globalCompositeOperation = 'lighter';
    output.globalAlpha = 0.22 * darkness;
    for (const pool of this.pools) {
      const sprite = this.poolSprite(pool.color, pool.radius);
      output.drawImage(sprite.canvas, Math.round(pool.x - pool.radius), Math.round(pool.y - pool.radius / 2));
    }

    // Halo pixel: la capa de luces desplazada 1 px en las 4 direcciones.
    output.globalAlpha = 0.35 * darkness;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      output.drawImage(this.lights, dx, dy);
    }

    // Las luces, a todo color (sin tinte nocturno).
    output.globalCompositeOperation = 'source-over';
    output.globalAlpha = darkness;
    output.drawImage(this.lights, 0, 0);
    output.globalAlpha = 1;
  }

  /**
   * Elipse de luz pixelada (el doble de ancha que de alta, como el suelo
   * isométrico). Para cada fila calculamos su ancho con la ecuación de la
   * elipse: (x/a)² + (y/b)² = 1  →  x = a·√(1 - (y/b)²).
   */
  private poolSprite(color: string, radius: number): Sprite {
    const key = `${color}:${radius}`;
    let sprite = this.poolSprites.get(key);
    if (!sprite) {
      const a = radius;
      const b = radius / 2;
      sprite = createSprite(a * 2, b * 2, (px) => {
        for (let row = 0; row < b * 2; row++) {
          const y = row + 0.5 - b;
          const half = Math.round(a * Math.sqrt(Math.max(0, 1 - (y / b) ** 2)));
          for (let x = a - half; x < a + half; x++) px(x, row, color);
        }
      });
      this.poolSprites.set(key, sprite);
    }
    return sprite;
  }
}
