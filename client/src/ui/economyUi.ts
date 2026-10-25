// Piezas de interfaz reutilizables para la economía: dinero y materiales.
import { ECONOMY, MATERIAL_IDS, type MaterialId, type Materials } from '@juego/shared';

/** Color del cuadradito que representa cada material. */
const MATERIAL_COLORS: Record<MaterialId, string> = {
  sheet_metal: '#9aa3ad',
  old_wood: '#a07a50',
  tires: '#3a3434',
  water: '#4fa3ff',
  fruit: '#e8562e',
};

/** "$ 120" */
export function formatMoney(amount: number): string {
  return `${ECONOMY.currency} ${amount}`;
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
    const swatch = document.createElement('i');
    swatch.style.background = MATERIAL_COLORS[id];
    const label = options.max !== undefined ? `${qty}/${options.max}` : String(qty);
    const name = ECONOMY.materials[id].name;
    chip.append(swatch, options.nameOnly ? name : `${name} ${label}`);
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
