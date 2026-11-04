// Utilidades para generar sprites píxel a píxel en canvas offscreen.

export interface Sprite {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

/** Crea un canvas en memoria (no se añade al documento) y lo devuelve listo para pintar. */
export function createSprite(
  width: number,
  height: number,
  paint: (px: (x: number, y: number, color: string) => void) => void,
): Sprite {
  const { canvas, ctx } = offscreen(width, height);

  // Pintamos con rectángulos de 1x1: así cada píxel tiene un color exacto,
  // sin el antialiasing que tendrían las líneas o los paths de canvas.
  const px = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  };
  paint(px);

  return { canvas, width, height };
}

/**
 * Apila capas encima de un sprite base en un sprite nuevo del mismo tamaño.
 * Cada capa se dibuja a `y` píxeles del borde de arriba; sus píxeles
 * transparentes dejan ver lo que hay debajo.
 */
export function stackSprites(base: Sprite, layers: { sprite: Sprite; y: number }[]): Sprite {
  const { canvas, ctx } = offscreen(base.width, base.height);
  ctx.drawImage(base.canvas, 0, 0);
  for (const layer of layers) ctx.drawImage(layer.sprite.canvas, 0, layer.y);
  return { canvas, width: base.width, height: base.height };
}

/** Canvas en memoria (no se añade al documento), sin suavizado. */
function offscreen(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}
