// Piezas de interfaz reutilizables para la economía: dinero y materiales.
import {
  ECONOMY,
  hasMaterials,
  isUpgrading,
  lotLevel,
  MATERIAL_IDS,
  MOVE_TICK_MS,
  rankOf,
  upgradeCost,
  type GameState,
  type Lot,
  type MaterialId,
  type Materials,
} from '@juego/shared';
import { levelBadge, xpBar } from './rankWindow';

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

/** Botón pequeño de las ventanas. */
export function button(label: string, enabled: boolean, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'btn btn-small';
  b.textContent = label;
  b.disabled = !enabled;
  b.addEventListener('click', onClick);
  return b;
}

/** Campo para escribir una cantidad entera (un precio, unas unidades...) entre `min` y `max`. */
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

/** Qué gana cada tipo de negocio con un nivel más. */
function levelBenefit(lot: Lot): string {
  const config = ECONOMY.businesses[lot.business!];
  const { storeListingsPerLevel, workshopQueuePerLevel } = ECONOMY.lotLevels;
  if (config.service) return 'Un puesto más: atiendes a un cliente más a la vez y paran más viajeros.';
  if (config.production) return 'Otro puesto de producción: produce y almacena más.';
  if (config.kind === 'workshop') {
    return `Otro banco: fabricas un mueble más a la vez y caben ${workshopQueuePerLevel} más en la cola.`;
  }
  if (config.kind === 'clothing') {
    return `Otra máquina: coses una prenda más a la vez, caben ${workshopQueuePerLevel} más en la cola y ${storeListingsPerLevel} huecos de venta más.`;
  }
  return `${storeListingsPerLevel} huecos de venta más, y paran más viajeros.`;
}

/**
 * Nivel de un local con negocio: estrellas, lo que da el siguiente y el botón
 * de mejorar (con lo que cuesta), o la cuenta atrás si ya está en obras. Sin
 * `onUpgrade` (el inquilino de un local ajeno) solo se ve el nivel. La cuenta
 * atrás se añade a `timers`, que quien llama recorre con cada tick.
 */
export function levelSection(
  lot: Lot,
  state: GameState,
  playerId: string,
  canUpgrade: boolean,
  onUpgrade: (() => void) | null,
  timers: ((tick: number) => void)[],
): HTMLElement[] {
  const level = lotLevel(lot);
  const { max } = ECONOMY.lotLevels;
  const stars = '★'.repeat(level) + '☆'.repeat(max - level);
  const title = text(`Nivel del local: ${stars} (${level}/${max})`, 'section-title');
  if (!onUpgrade) return [title, text('Las mejoras las paga el dueño del local.')];
  if (isUpgrading(lot)) {
    const countdown = text('');
    timers.push((tick) => {
      countdown.textContent = `En obras: sube al nivel ${level + 1} en ${formatTicks(lot.upgradeReadyAt! - tick)}. El negocio sigue abierto.`;
    });
    return [title, countdown];
  }
  const cost = upgradeCost(lot);
  if (!cost) return [title, text('Tu local está al máximo nivel.')];
  const mine = state.materials[playerId] ?? {};
  const affordable = (state.money[playerId] ?? 0) >= cost.price && hasMaterials(mine, cost.materials);
  const nodes = [
    title,
    text(`Nivel ${level + 1}: ${levelBenefit(lot)} Obras: ${Math.round(cost.seconds / 60)} min.`),
    materialChips(cost.materials, { have: mine }),
    button(`Mejorar · ${formatMoney(cost.price)}`, canUpgrade && affordable, onUpgrade),
  ];
  if (!affordable) nodes.push(text('Te falta dinero o materiales para mejorarlo.'));
  return nodes;
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
