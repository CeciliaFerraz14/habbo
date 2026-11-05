// Piezas de interfaz reutilizables para la economía: dinero y materiales.
import { ECONOMY, MATERIAL_IDS, MOVE_TICK_MS, type MaterialId, type Materials } from '@juego/shared';

/** Color del cuadradito que representa cada material. */
const MATERIAL_COLORS: Record<MaterialId, string> = {
  sheet_metal: '#9aa3ad',
  old_wood: '#a07a50',
  tires: '#3a3434',
  water: '#4fa3ff',
  fruit: '#e8562e',
  fabric: '#e8e0d0',
  tokens: '#f2b134',
};

/** Cuadradito del color de un material. */
export function materialSwatch(id: MaterialId): HTMLElement {
  const swatch = document.createElement('i');
  swatch.style.background = MATERIAL_COLORS[id];
  return swatch;
}

/** "$ 120" */
export function formatMoney(amount: number): string {
  return `${ECONOMY.currency} ${amount}`;
}

/** Ticks → texto: "12 s" si falta menos de una hora; si no, "23 h 5 min". */
export function formatTicks(ticks: number): string {
  const seconds = Math.max(0, Math.ceil((ticks * MOVE_TICK_MS) / 1000));
  if (seconds < 3600) return `${seconds} s`;
  return `${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min`;
}

/** Campo para escribir una cantidad entera (un precio, una fianza...) entre `min` y `max`. */
export function numberInput(value: number, min: number, max: number, enabled = true): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'price-input';
  input.min = String(min);
  input.max = String(max);
  input.step = '1';
  input.value = String(value);
  input.disabled = !enabled;
  return input;
}

/** Párrafo de texto; por defecto, con el estilo de las notas. */
export function text(content: string, className = 'hint'): HTMLParagraphElement {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = content;
  return p;
}

/** Lo escrito en un numberInput, redondeado a entero (el reducer valida los límites). */
export function readNumber(input: HTMLInputElement): number {
  return Math.round(Number(input.value));
}

/**
 * Lista de "fichas" de materiales: un cuadrado de color, el nombre y la
 * cantidad. Con `max`, muestra "3/20"; con `showZero`, incluye los que están a
 * 0; con `only`, solo esos materiales.
 */
export function materialChips(
  materials: Materials,
  options: {
    max?: number;
    showZero?: boolean;
    have?: Materials;
    nameOnly?: boolean;
    only?: MaterialId[];
  } = {},
): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'chips';
  for (const id of options.only ?? MATERIAL_IDS) {
    const qty = materials[id] ?? 0;
    if (qty === 0 && !options.showZero) continue;
    const chip = document.createElement('span');
    chip.className = 'chip';
    // Si se pasa `have`, marcamos en rojo lo que no alcanza (para las recetas).
    if (options.have && (options.have[id] ?? 0) < qty) chip.classList.add('missing');
    const label = options.max !== undefined ? `${qty}/${options.max}` : String(qty);
    const name = ECONOMY.materials[id].name;
    chip.append(materialSwatch(id), options.nameOnly ? name : `${name} ${label}`);
    row.append(chip);
  }
  return row;
}

/** Cartel fijo arriba a la izquierda con tu dinero y tus materiales. */
export function createWallet(): { update: (money: number, materials: Materials) => void } {
  const el = document.createElement('div');
  el.id = 'wallet';
  const money = document.createElement('div');
  money.className = 'wallet-money';
  const mats = document.createElement('div');
  el.append(money, mats);
  document.querySelector('#ui')!.append(el);

  let last = '';
  return {
    update(amount, materials) {
      // Solo tocamos el DOM si algo ha cambiado.
      const key = JSON.stringify([amount, materials]);
      if (key === last) return;
      last = key;
      money.textContent = formatMoney(amount);
      mats.replaceChildren(materialChips(materials, { showZero: true }));
    },
  };
}
