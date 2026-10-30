// Ventana del mostrador de Hank (en la gasolinera), con cuatro pestañas:
// proveedor de materiales, encargos, turnos de trabajo y rasca y gana.
//
// Como la ventana del negocio, solo se reconstruye cuando cambia algo
// relevante (una "firma"); las cuentas atrás se actualizan en su sitio, para
// no borrar lo que el jugador esté escribiendo en las cantidades.
import {
  buyPrice,
  CATALOG,
  dailyDeal,
  ECONOMY,
  gasPlayer,
  MATERIAL_IDS,
  MOVE_TICK_MS,
  SCENES,
  scratchesLeft,
  sellPrice,
  shiftCooldownLeft,
  type GameState,
  type HankOrder,
  type MaterialId,
} from '@juego/shared';
import { formatMoney, materialChips } from './economyUi';
import { furniIcon } from './icons';
import { PixelWindow } from './window';

export interface GasActions {
  buyMaterial: (material: MaterialId, quantity: number) => void;
  sellMaterial: (material: MaterialId, quantity: number) => void;
  deliverOrder: (orderId: string) => void;
  startShift: () => void;
  buyScratch: () => void;
}

export interface GasWindow {
  open: () => void;
  update: (state: GameState, playerId: string) => void;
}

type Tab = 'supplier' | 'orders' | 'work' | 'scratch';

const TABS: { id: Tab; label: string }[] = [
  { id: 'supplier', label: 'Proveedor' },
  { id: 'orders', label: 'Encargos' },
  { id: 'work', label: 'Trabajo' },
  { id: 'scratch', label: 'Rasca y gana' },
];

const GAS = ECONOMY.gasStation;

/** Ticks → "1:05". */
function formatClock(ticks: number): string {
  const seconds = Math.max(0, Math.ceil((ticks * MOVE_TICK_MS) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** "Agua −40 % · Chapa +40 %": la oferta de hoy, en una línea. */
export function dealText(tick: number): string {
  const { cheap, pricey } = dailyDeal(tick);
  const { discount, markup } = ECONOMY.supplier.dailyDeal;
  const name = (m: MaterialId) => ECONOMY.materials[m].name;
  return `${name(cheap)} −${Math.round(discount * 100)} % · ${name(pricey)} +${Math.round(markup * 100)} %`;
}

export function createGasWindow(actions: GasActions): GasWindow {
  const win = new PixelWindow({
    title: 'Mostrador de Hank',
    x: Math.max(24, window.innerWidth - 460),
    y: 110,
    width: 420,
  });
  let tab: Tab = 'supplier';
  let signature = '';
  /** Funciones que actualizan las partes que dependen del tiempo. */
  let timers: ((state: GameState) => void)[] = [];
  let lastState: GameState | null = null;
  let lastPlayer = '';

  const button = (label: string, enabled: boolean, onClick: () => void) => {
    const b = document.createElement('button');
    b.className = 'btn btn-small';
    b.textContent = label;
    b.disabled = !enabled;
    b.addEventListener('click', onClick);
    return b;
  };

  const text = (content: string, className = 'hint') => {
    const p = document.createElement('p');
    p.className = className;
    p.textContent = content;
    return p;
  };

  const tabBar = () => {
    const bar = document.createElement('div');
    bar.className = 'tabs';
    for (const t of TABS) {
      const b = button(t.label, true, () => {
        tab = t.id;
        signature = '';
        if (lastState) update(lastState, lastPlayer);
      });
      b.classList.toggle('active', t.id === tab);
      bar.append(b);
    }
    return bar;
  };

  // --- Proveedor ----------------------------------------------------------------
  const buildSupplier = (state: GameState, playerId: string) => {
    const money = state.money[playerId] ?? 0;
    const mine = state.materials[playerId] ?? {};
    const list = document.createElement('div');
    list.className = 'supplier-list';
    for (const id of MATERIAL_IDS) {
      const row = document.createElement('div');
      row.className = 'supplier-row';
      const buy = buyPrice(state.tick, id);
      const sell = sellPrice(state.tick, id);
      const info = document.createElement('div');
      info.className = 'recipe-info';
      info.append(
        materialChips({ [id]: 1 }, { nameOnly: true }),
        `Compra ${formatMoney(buy)} · Venta ${formatMoney(sell)} · Tienes ${mine[id] ?? 0}`,
      );
      const qty = document.createElement('input');
      qty.type = 'number';
      qty.className = 'price-input';
      qty.min = '1';
      qty.max = String(ECONOMY.supplier.maxPerPurchase);
      qty.value = '5';
      const amount = () => Math.round(Number(qty.value));
      const controls = document.createElement('div');
      controls.className = 'row';
      controls.append(
        qty,
        button('Comprar', money >= buy, () => actions.buyMaterial(id, amount())),
        button('Vender', (mine[id] ?? 0) > 0, () => actions.sellMaterial(id, amount())),
      );
      row.append(info, controls);
      list.append(row);
    }
    win.body.append(
      text(`Oferta de hoy: ${dealText(state.tick)}`, 'deal'),
      list,
      text(`Máximo ${ECONOMY.supplier.maxPerPurchase} unidades por compra o venta. Hank compra barato.`),
    );
  };

  // --- Encargos ------------------------------------------------------------------
  const buildOrders = (state: GameState, playerId: string) => {
    win.body.append(text('Hank paga más de lo que valen. El primero que los entrega se lleva la recompensa.'));
    if (state.orders.length === 0) {
      win.body.append(text('Ahora mismo no hay encargos. Vuelve en un rato.'));
      return;
    }
    const inventory = state.inventories[playerId] ?? [];
    const list = document.createElement('div');
    list.className = 'recipes';
    for (const order of state.orders) list.append(orderRow(order, inventory.filter((i) => i.defId === order.defId).length));
    win.body.append(list);
  };

  const orderRow = (order: HankOrder, have: number) => {
    const row = document.createElement('div');
    row.className = 'recipe';
    const info = document.createElement('div');
    info.className = 'recipe-info';
    // Cada línea en su <span>: dos textos sueltos seguidos saldrían pegados.
    const line = (content: string) => {
      const span = document.createElement('span');
      span.textContent = content;
      return span;
    };
    info.append(
      line(`${order.quantity} × ${CATALOG[order.defId].name}`),
      line(`Paga ${formatMoney(order.reward)} · Tienes ${have}/${order.quantity}`),
    );
    row.append(
      furniIcon(order.defId),
      info,
      button('Entregar', have >= order.quantity, () => actions.deliverOrder(order.id)),
    );
    return row;
  };

  // --- Trabajo -------------------------------------------------------------------
  const buildWork = (playerId: string) => {
    const { seconds, wage, tipPerCar } = GAS.shift;
    win.body.append(
      text(
        `Atiende la caja ${seconds / 60} minutos sin salir de la gasolinera: ` +
          `${formatMoney(wage)} de sueldo y ${formatMoney(tipPerCar)} de propina por cada coche que reposte.`,
      ),
    );
    const status = text('', 'section-title');
    const start = button('Empezar turno', false, actions.startShift);
    win.body.append(status, start);
    // El estado del turno cambia con el tiempo: se actualiza en su sitio.
    timers.push((s) => {
      const player = gasPlayer(s, playerId);
      const cooldown = shiftCooldownLeft(s, playerId);
      if (player.shiftEndsAt > 0) {
        status.textContent = `Trabajando… quedan ${formatClock(player.shiftEndsAt - s.tick)}`;
        start.hidden = true;
      } else {
        status.textContent = cooldown > 0 ? `Descansando: puedes volver en ${formatClock(cooldown)}` : 'Libre para trabajar.';
        start.hidden = false;
        start.disabled = cooldown > 0;
      }
    });
  };

  // --- Rasca y gana ----------------------------------------------------------------
  const buildScratch = (state: GameState, playerId: string) => {
    const { price, maxPerDay, prizes } = GAS.scratch;
    const left = scratchesLeft(state, playerId);
    const money = state.money[playerId] ?? 0;
    const prizesText = prizes
      .filter((p) => p.amount > 0)
      .map((p) => formatMoney(p.amount))
      .join(', ');
    win.body.append(
      text(`Cada boleto cuesta ${formatMoney(price)}. Premios: ${prizesText}… o nada. Máximo ${maxPerDay} al día.`),
      text(`Te quedan ${left} boletos hoy.`, 'section-title'),
      button(`Comprar boleto · ${formatMoney(price)}`, left > 0 && money >= price, actions.buyScratch),
    );
    // El último resultado, por si el aviso se ha ido muy rápido.
    const last = [...state.notices].reverse().find((n) => n.avatarId === playerId && n.text.startsWith('Rasca y gana'));
    if (last) win.body.append(text(`Último boleto: ${last.text.replace('Rasca y gana: ', '')}`));
  };

  const update = (state: GameState, playerId: string) => {
    lastState = state;
    lastPlayer = playerId;
    if (!win.isOpen) return;
    // Hank solo atiende dentro de la gasolinera: si sales, la ventana se cierra.
    if (state.avatars[playerId]?.sceneId !== SCENES.gas) {
      win.close();
      return;
    }
    // La firma no incluye el tick: así no se reconstruye (ni se borran las
    // cantidades escritas) a cada momento. La oferta solo cambia de día en día.
    // En rasca y gana, además, el último aviso (para enseñar el resultado).
    const player = gasPlayer(state, playerId);
    const lastNotice = tab === 'scratch' ? state.notices.filter((n) => n.avatarId === playerId).at(-1)?.id : null;
    const next = JSON.stringify([
      tab,
      state.money[playerId],
      state.materials[playerId],
      state.inventories[playerId],
      state.orders,
      player,
      dealText(state.tick),
      lastNotice,
    ]);
    if (next !== signature) {
      signature = next;
      timers = [];
      win.body.replaceChildren(tabBar());
      if (tab === 'supplier') buildSupplier(state, playerId);
      else if (tab === 'orders') buildOrders(state, playerId);
      else if (tab === 'work') buildWork(playerId);
      else buildScratch(state, playerId);
    }
    for (const timer of timers) timer(state);
  };

  return {
    open() {
      signature = '';
      win.open();
    },
    update,
  };
}
