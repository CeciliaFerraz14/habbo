// Piezas de interfaz reutilizables para la economía: dinero y materiales.
import { ECONOMY, MATERIAL_IDS, MOVE_TICK_MS, rankOf, type MaterialId, type Materials } from '@juego/shared';
import { levelBadge, xpBar } from './rankWindow';

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

/** Lo que enseña la cartera. */
export interface WalletInfo {
  money: number;
  materials: Materials;
  /** Ticks que faltan para la subvención (0 = ya se puede recoger) y cuánto da. */
  subsidyTicksLeft: number;
  subsidyAmount: number;
  level: number;
  xp: number;
}

/**
 * Cartel fijo arriba a la izquierda con tu rango (y su barra de XP), tu
 * dinero, tus materiales y el botón para recoger la subvención del pueblo.
 * Al tocar el rango se abre la ventana "Mi rango".
 */
export function createWallet(
  onClaimSubsidy: () => void,
  onOpenRank: () => void,
): { update: (info: WalletInfo) => void } {
  const el = document.createElement('div');
  el.id = 'wallet';
  const rank = document.createElement('button');
  rank.className = 'wallet-rank';
  rank.title = 'Ver tu rango y sus recompensas';
  rank.addEventListener('click', onOpenRank);
  const money = document.createElement('div');
  money.className = 'wallet-money';
  const mats = document.createElement('div');
  const subsidy = document.createElement('button');
  subsidy.className = 'btn btn-small wallet-subsidy';
  subsidy.addEventListener('click', onClaimSubsidy);
  el.append(rank, money, mats, subsidy);
  document.querySelector('#ui')!.append(el);

  let last = '';
  return {
    update(info) {
      // El botón muestra la espera aproximada; solo tocamos el DOM si cambia.
      const ready = info.subsidyTicksLeft === 0;
      const label = ready
        ? `Recoger subvención +${formatMoney(info.subsidyAmount)}`
        : `Subvención en ${formatWait(info.subsidyTicksLeft)}`;
      const key = JSON.stringify([info.money, info.materials, label, info.level, info.xp]);
      if (key === last) return;
      last = key;
      const name = document.createElement('span');
      name.textContent = rankOf(info.level).name;
      rank.replaceChildren(levelBadge(info.level), name, xpBar(info.xp, info.level));
      money.textContent = formatMoney(info.money);
      mats.replaceChildren(materialChips(info.materials, { showZero: true }));
      subsidy.textContent = label;
      subsidy.disabled = !ready;
      subsidy.title = 'El pueblo te da una ayuda cada día. Si no la recoges, no se acumula.';
    },
  };
}
