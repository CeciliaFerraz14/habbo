// Editor de avatar: vista previa animada, muestras de color para cada parte y
// las prendas que tienes, para ponértelas o quitártelas.
//
// Cada clic envía una acción SET_LOOK con el aspecto entero (colores y prendas).
// El editor no guarda su propia copia del aspecto: lo lee siempre del estado
// (update()), así lo que ves en la ventana es exactamente lo que ve el resto
// del juego.
import {
  GARMENTS,
  garmentKey,
  isGarmentItem,
  LOOK_COLORS,
  LOOK_PARTS,
  PREMIUM_LOOK_COLORS,
  randomLook,
  type AvatarLook,
  type Direction,
  type Garment,
  type GarmentSlot,
  type InventoryItem,
  type LookPart,
} from '@juego/shared';
import { HAT, HAT_RISE } from '../sprites/hat';
import { getAvatarFrames, WALK_CYCLE } from '../sprites/avatar';
import { garmentIcon } from './icons';
import { PixelWindow } from './window';

const PART_NAMES: Record<LookPart, string> = {
  hair: 'Pelo',
  skin: 'Piel',
  shirt: 'Camiseta',
  pants: 'Pantalón',
};

/** Ranuras de las prendas, en el orden en que se muestran. */
const SLOT_NAMES: Record<GarmentSlot, string> = {
  head: 'Cabeza',
  torso: 'Torso',
  feet: 'Pies',
};
const SLOTS = Object.keys(SLOT_NAMES) as GarmentSlot[];

/** Orden en que gira la vista previa, para ver el avatar por todos los lados. */
const TURN: Direction[] = ['SE', 'SW', 'NW', 'NE'];
const FRAME_MS = 130;
const TURN_MS = 1500;
/**
 * Tamaño del lienzo de la vista previa en píxeles del juego (se amplía con CSS).
 * Cabe el avatar de pie entero, con el hueco del sombrero, y 1 px por debajo.
 */
const PREVIEW_W = 20;
const PREVIEW_H = 31;

export interface AvatarEditor {
  win: PixelWindow;
  /**
   * Refleja el aspecto actual del jugador y las prendas que tiene. `premium`:
   * si su rango ya permite los colores especiales y el sombrero (Cowboy del asfalto).
   */
  update: (look: AvatarLook, items: readonly InventoryItem[], premium: boolean) => void;
}

export function createAvatarEditor(onChange: (look: AvatarLook) => void): AvatarEditor {
  const win = new PixelWindow({ title: 'Tu aspecto', x: 24, y: 120, width: 380 });
  let current: AvatarLook | null = null;
  /** Aspecto e inventario del último update(), para no reconstruir si no cambian. */
  let lastLook = '';
  let lastItems: readonly InventoryItem[] | null = null;
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
  // Solo cambia los colores: las prendas puestas y el sombrero se quedan.
  random.addEventListener('click', () => {
    if (current) onChange({ ...current, ...randomLook(Math.random) });
  });

  const left = document.createElement('div');
  left.className = 'look-preview';
  left.append(preview, random);

  // --- Prendas ---
  // Se reconstruyen en cada cambio del aspecto o del inventario.
  const garments = document.createElement('div');
  parts.append(garments);

  /** Pone una prenda en su ranura o, con null, deja la ranura vacía. */
  const wear = (slot: GarmentSlot, garment: Garment | null) => {
    if (!current) return;
    const { [slot]: _old, ...others } = current.outfit ?? {};
    // Si no queda ninguna prenda, el reducer quita el outfit al normalizar.
    onChange({ ...current, outfit: garment ? { ...others, [slot]: garment } : others });
  };

  const buildGarments = (look: AvatarLook, items: readonly InventoryItem[]) => {
    // Cada tipo y color una sola vez, agrupados por ranura.
    const owned = new Map<string, Garment>();
    for (const item of items) {
      if (!isGarmentItem(item)) continue;
      const garment = { type: item.garment, color: item.color };
      owned.set(garmentKey(garment), garment);
    }
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = 'Prendas';
    garments.replaceChildren(title);
    if (owned.size === 0) {
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = 'No tienes prendas. Cóselas o cómpralas en una tienda de ropa.';
      garments.append(hint);
      return;
    }
    for (const slot of SLOTS) {
      const mine = [...owned.values()].filter((g) => GARMENTS[g.type].slot === slot);
      if (mine.length === 0) continue;
      const worn = look.outfit?.[slot];
      const label = document.createElement('div');
      label.className = 'look-label';
      label.textContent = SLOT_NAMES[slot];
      const remove = document.createElement('button');
      remove.className = 'btn btn-small';
      remove.textContent = 'Quitar';
      remove.disabled = !worn;
      remove.addEventListener('click', () => wear(slot, null));
      // Etiqueta y "Quitar" en una fila propia, igual para las tres ranuras.
      const header = document.createElement('div');
      header.className = 'row';
      header.append(label, remove);
      const row = document.createElement('div');
      row.className = 'row';
      for (const garment of mine) {
        const b = document.createElement('button');
        b.className = 'facade-option';
        b.classList.toggle('selected', worn?.type === garment.type && worn.color === garment.color);
        b.append(garmentIcon(garment), GARMENTS[garment.type].name);
        b.addEventListener('click', () => wear(slot, garment));
        row.append(b);
      }
      garments.append(header, row);
    }
  };

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

  const update = (look: AvatarLook, items: readonly InventoryItem[], canPremium: boolean) => {
    // Se compara el aspecto entero (también las prendas) y el inventario: el
    // estado es inmutable, así que si la lista es el mismo objeto no ha cambiado.
    const key = JSON.stringify(look);
    if (key === lastLook && items === lastItems && premium === canPremium) return;
    lastLook = key;
    lastItems = items;
    current = look;
    premium = canPremium;
    buildGarments(look, items);
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
