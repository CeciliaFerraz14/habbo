// Piezas de interfaz reutilizables para la economía: dinero y materiales.
import { ECONOMY, MATERIAL_IDS, MOVE_TICK_MS, type MaterialId, type Materials } from '@juego/shared';

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

/** "5 h", "12 min" o "30 s": tiempo aproximado que falta, para mostrarlo. */
export function formatWait(ticks: number): string {
  const seconds = Math.ceil((ticks * MOVE_TICK_MS) / 1000);
  if (seconds >= 3600) return `${Math.ceil(seconds / 3600)} h`;
  if (seconds >= 60) return `${Math.ceil(seconds / 60)} min`;
  return `${seconds} s`;
}

/**
 * Cartel fijo arriba a la izquierda con tu dinero, tus materiales y el botón
 * para recoger la subvención del pueblo.
 */
export function createWallet(onClaimSubsidy: () => void): {
  update: (money: number, materials: Materials, subsidyTicksLeft: number) => void;
} {
  const el = document.createElement('div');
  el.id = 'wallet';
  const money = document.createElement('div');
  money.className = 'wallet-money';
  const mats = document.createElement('div');
  const subsidy = document.createElement('button');
  subsidy.className = 'btn btn-small wallet-subsidy';
  subsidy.addEventListener('click', onClaimSubsidy);
  el.append(money, mats, subsidy);
  document.querySelector('#ui')!.append(el);

  let last = '';
  return {
    update(amount, materials, subsidyTicksLeft) {
      // El botón muestra la espera aproximada; solo tocamos el DOM si cambia.
      const ready = subsidyTicksLeft === 0;
      const label = ready
        ? `Recoger subvención +${formatMoney(ECONOMY.subsidy.amount)}`
        : `Subvención en ${formatWait(subsidyTicksLeft)}`;
      const key = JSON.stringify([amount, materials, label]);
      if (key === last) return;
      last = key;
      money.textContent = formatMoney(amount);
      mats.replaceChildren(materialChips(materials, { showZero: true }));
      subsidy.textContent = label;
      subsidy.disabled = !ready;
      subsidy.title = 'El pueblo te da una ayuda cada día. Si no la recoges, no se acumula.';
    },
  };
}
