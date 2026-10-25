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
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Pintamos con rectángulos de 1x1: así cada píxel tiene un color exacto,
  // sin el antialiasing que tendrían las líneas o los paths de canvas.
  const px = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  };
  paint(px);

  return { canvas, width, height };
}
