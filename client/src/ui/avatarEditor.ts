// Editor de avatar: vista previa animada y muestras de color para cada parte.
//
// Cada clic en una muestra envía una acción SET_LOOK. El editor no guarda su
// propia copia del aspecto: lo lee siempre del estado (update()), así lo que
// ves en la ventana es exactamente lo que ve el resto del juego.
import {
  LOOK_COLORS,
  LOOK_PARTS,
  PREMIUM_LOOK_COLORS,
  randomLook,
  type AvatarLook,
  type Direction,
  type LookPart,
} from '@juego/shared';
import { HAT, HAT_RISE } from '../sprites/hat';
import { getAvatarFrames, WALK_CYCLE } from '../sprites/avatar';
import { PixelWindow } from './window';

const PART_NAMES: Record<LookPart, string> = {
  hair: 'Pelo',
  skin: 'Piel',
  shirt: 'Camiseta',
  pants: 'Pantalón',
};

/** Orden en que gira la vista previa, para ver el avatar por todos los lados. */
const TURN: Direction[] = ['SE', 'SW', 'NW', 'NE'];
const FRAME_MS = 130;
const TURN_MS = 1500;
/** Tamaño del lienzo de la vista previa en píxeles del juego (se amplía con CSS). */
const PREVIEW_W = 20;
const PREVIEW_H = 31;

export interface AvatarEditor {
  win: PixelWindow;
  /**
   * Refleja el aspecto actual del jugador. `premium`: si su rango ya permite
   * los colores especiales y el sombrero (Cowboy del asfalto).
   */
  update: (look: AvatarLook, premium: boolean) => void;
}

export function createAvatarEditor(onChange: (look: AvatarLook) => void): AvatarEditor {
  const win = new PixelWindow({ title: 'Tu aspecto', x: 24, y: 120, width: 380 });
  let current: AvatarLook | null = null;
  let premium = false;

  // --- Vista previa ---
  const preview = document.createElement('canvas');
  preview.width = PREVIEW_W;
  preview.height = PREVIEW_H;
  preview.className = 'avatar-preview';
  const pctx = preview.getContext('2d')!;
  pctx.imageSmoothingEnabled = false;

  // --- Muestras de color ---
  const parts = document.createElement('div');
  parts.className = 'look-parts';
  const swatchButtons: Record<string, HTMLButtonElement[]> = {};

  for (const part of LOOK_PARTS) {
    const label = document.createElement('div');
    label.className = 'look-label';
    label.textContent = PART_NAMES[part];

    const row = document.createElement('div');
    row.className = 'swatches';
    // Los colores normales y, al final, los especiales (con candado hasta el
    // rango Cowboy del asfalto).
    swatchButtons[part] = [...LOOK_COLORS[part], ...PREMIUM_LOOK_COLORS[part]].map((color, i) => {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.classList.toggle('premium', i >= LOOK_COLORS[part].length);
      b.style.background = color;
      b.title = color;
      b.addEventListener('click', () => {
        if (current) onChange({ ...current, [part]: color });
      });
      row.append(b);
      return b;
    });
    parts.append(label, row);
  }

  // Sombrero de vaquero: se pone y se quita (también con candado hasta el rango).
  const hatLabel = document.createElement('div');
  hatLabel.className = 'look-label';
  hatLabel.textContent = 'Sombrero';
  const hatButton = document.createElement('button');
  hatButton.className = 'btn btn-small';
  hatButton.addEventListener('click', () => {
    if (current) onChange({ ...current, hat: !current.hat });
  });
  parts.append(hatLabel, hatButton);

  const random = document.createElement('button');
  random.className = 'btn btn-small';
  random.textContent = 'Al azar';
  // Al azar con los colores normales, conservando el sombrero si lo lleva.
  random.addEventListener('click', () => onChange({ ...randomLook(Math.random), hat: current?.hat }));

  const left = document.createElement('div');
  left.className = 'look-preview';
  left.append(preview, random);

  const layout = document.createElement('div');
  layout.className = 'look-editor';
  layout.append(left, parts);
  win.body.append(layout);

  // Animación de la vista previa: camina y va girando. Solo mientras la
  // ventana está abierta, para no gastar trabajo en balde.
  const draw = (now: number) => {
    if (win.isOpen && current) {
      const direction = TURN[Math.floor(now / TURN_MS) % TURN.length];
      const frame = WALK_CYCLE[Math.floor(now / FRAME_MS) % WALK_CYCLE.length];
      const sprite = getAvatarFrames(current)[direction][frame];
      pctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
      // Centrado en horizontal y apoyado abajo.
      const x = Math.floor((PREVIEW_W - sprite.width) / 2);
      const y = PREVIEW_H - sprite.height - 1;
      pctx.drawImage(sprite.canvas, x, y);
      if (current.hat) pctx.drawImage(HAT.canvas, x, y - HAT_RISE);
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);

  const update = (look: AvatarLook, canPremium: boolean) => {
    const same = current && LOOK_PARTS.every((p) => current![p] === look[p]) && !!current.hat === !!look.hat;
    if (same && premium === canPremium) return;
    current = look;
    premium = canPremium;
    // Marcamos la muestra elegida de cada parte; las especiales, con candado si aún no se puede.
    for (const part of LOOK_PARTS) {
      const colors = [...LOOK_COLORS[part], ...PREMIUM_LOOK_COLORS[part]];
      swatchButtons[part].forEach((b, i) => {
        b.classList.toggle('selected', colors[i] === look[part]);
        const locked = i >= LOOK_COLORS[part].length && !premium;
        b.disabled = locked;
        b.title = locked ? 'Se desbloquea en el rango Cowboy del asfalto (nivel 7)' : colors[i];
      });
    }
    hatButton.disabled = !premium;
    hatButton.textContent = !premium ? 'Nivel 7' : look.hat ? 'Quitar' : 'Ponérselo';
    hatButton.title = premium ? '' : 'Se desbloquea en el rango Cowboy del asfalto (nivel 7)';
  };

  return { win, update };
}
