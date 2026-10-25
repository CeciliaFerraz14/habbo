// Ventana de gestión de un negocio (se abre al hacer clic en su puesto de trabajo).
//
// El estado cambia en CADA tick (el contador avanza), pero no queremos
// reconstruir la ventana 2,5 veces por segundo: se perderían clics si el botón
// se sustituye justo entre pulsar y soltar. Por eso:
// - La estructura (botones, listas) solo se reconstruye cuando cambia algo
//   relevante: lo detectamos comparando una "firma" (un JSON de esos datos).
// - Lo que depende solo del tiempo (cuentas atrás, barras de progreso) se
//   actualiza en su sitio en cada tick.
import {
  CATALOG,
  DECOR_IDS,
  ECONOMY,
  getListings,
  hasMaterials,
  MOVE_TICK_MS,
  secondsToTicks,
  totalMaterials,
  type DecorId,
  type GameState,
  type Lot,
} from '@juego/shared';
import { materialChips } from './economyUi';
import { furniIcon } from './icons';
import { PixelWindow } from './window';

export interface BusinessActions {
  collectMaterials: (lotId: string) => void;
  craft: (lotId: string, defId: DecorId) => void;
  collectCrafted: (lotId: string) => void;
  listItem: (lotId: string, itemId: string, price: number) => void;
  setPrice: (itemId: string, price: number) => void;
  unlist: (itemId: string) => void;
}

export interface BusinessWindow {
  open: (lotId: string) => void;
  update: (state: GameState, playerId: string) => void;
}

/** Ticks → texto "12 s". */
function formatTicks(ticks: number): string {
  return `${Math.max(0, Math.ceil((ticks * MOVE_TICK_MS) / 1000))} s`;
}

export function createBusinessWindow(actions: BusinessActions): BusinessWindow {
  const win = new PixelWindow({
    title: 'Negocio',
    x: Math.max(24, window.innerWidth - 460),
    y: 110,
    width: 420,
  });
  let lotId: string | null = null;
  let signature = '';
  /** Funciones que actualizan las partes que dependen del tiempo. */
  let timers: ((tick: number) => void)[] = [];

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

  // --- Chatarrería -----------------------------------------------------------
  const buildScrapyard = (lot: Lot, inside: boolean) => {
    const { output, productionSeconds, storageCap } = ECONOMY.scrapyard;
    const countdown = text('');
    timers.push((tick) => {
      countdown.textContent = `Próxima carga en ${formatTicks(lot.nextProductionAt - tick)}`;
    });
    win.body.append(
      text(`Cada ${productionSeconds} s produce:`, 'section-title'),
      materialChips(output),
      text('Almacén:', 'section-title'),
      materialChips(lot.storage, { max: storageCap, showZero: true }),
      countdown,
      button('Recoger materiales', inside && totalMaterials(lot.storage) > 0, () =>
        actions.collectMaterials(lot.id),
      ),
    );
  };

  /** Campo numérico para escribir un precio. */
  const priceInput = (value: number, enabled: boolean) => {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'price-input';
    input.min = String(ECONOMY.store.minPrice);
    input.max = String(ECONOMY.store.maxPrice);
    input.step = '1';
    input.value = String(value);
    input.disabled = !enabled;
    return input;
  };
  const readPrice = (input: HTMLInputElement) => Math.round(Number(input.value));

  // --- Tienda ----------------------------------------------------------------
  const buildStore = (lot: Lot, inside: boolean, state: GameState, playerId: string) => {
    const products = getListings(state, lot.id);
    const full = products.length >= ECONOMY.store.maxListings;

    // Productos a la venta, con su precio editable.
    const onSale = document.createElement('div');
    onSale.className = 'recipes';
    if (products.length === 0) onSale.append(text('No tienes nada a la venta.'));
    for (const item of products) {
      const row = document.createElement('div');
      row.className = 'recipe';
      const info = document.createElement('div');
      info.className = 'recipe-info';
      const name = document.createElement('div');
      name.textContent = CATALOG[item.defId].name;
      const input = priceInput(item.price!, inside);
      const controls = document.createElement('div');
      controls.className = 'row';
      controls.append(
        input,
        button('Cambiar', inside, () => actions.setPrice(item.id, readPrice(input))),
        button('Retirar', inside, () => actions.unlist(item.id)),
      );
      info.append(name, controls);
      row.append(furniIcon(item.defId), info, document.createElement('span'));
      onSale.append(row);
    }

    // Lo que hay en tu inventario y se puede poner a la venta (agrupado por tipo).
    const forSale = document.createElement('div');
    forSale.className = 'recipes';
    const inventory = state.inventories[playerId] ?? [];
    const groups = new Map<DecorId, string[]>();
    for (const item of inventory) {
      const defId = item.defId as DecorId;
      groups.set(defId, [...(groups.get(defId) ?? []), item.id]);
    }
    if (groups.size === 0) forSale.append(text('Tu inventario está vacío. Fabrica muebles en un taller.'));
    for (const [defId, ids] of groups) {
      const row = document.createElement('div');
      row.className = 'recipe';
      const info = document.createElement('div');
      info.className = 'recipe-info';
      const name = document.createElement('div');
      name.textContent = `${CATALOG[defId].name} (x${ids.length})`;
      // Precio sugerido: el valor de referencia del mueble.
      const input = priceInput(ECONOMY.baseValue[defId], inside);
      const controls = document.createElement('div');
      controls.className = 'row';
      controls.append(
        input,
        button('Vender', inside && !full, () => actions.listItem(lot.id, ids[0], readPrice(input))),
      );
      info.append(name, controls);
      row.append(furniIcon(defId), info, document.createElement('span'));
      forSale.append(row);
    }

    const commission = Math.round(ECONOMY.store.commissionRate * 100);
    win.body.append(
      text(`A la venta (${products.length}/${ECONOMY.store.maxListings}):`, 'section-title'),
      onSale,
      text('Poner a la venta:', 'section-title'),
      forSale,
      text(`Cobras al vender, aunque no estés. El pueblo se queda un ${commission} % de comisión.`),
    );
  };

  // --- Taller ----------------------------------------------------------------
  const buildWorkshop = (lot: Lot, inside: boolean, state: GameState, playerId: string) => {
    const mine = state.materials[playerId] ?? {};
    const queueFull = lot.jobs.length >= ECONOMY.workshop.queueSize;

    // Cola de fabricación con barras de progreso.
    const queue = document.createElement('div');
    queue.className = 'queue';
    if (lot.jobs.length === 0) queue.append(text('Nada en fabricación.'));
    for (const job of lot.jobs) {
      const total = secondsToTicks(ECONOMY.recipes[job.defId].seconds);
      const row = document.createElement('div');
      row.className = 'queue-row';
      const name = document.createElement('span');
      name.textContent = CATALOG[job.defId].name;
      const bar = document.createElement('div');
      bar.className = 'progress';
      const fill = document.createElement('i');
      bar.append(fill);
      const status = document.createElement('span');
      status.className = 'queue-status';
      row.append(name, bar, status);
      queue.append(row);
      timers.push((tick) => {
        const remaining = job.readyAt - tick;
        // Si queda más que la duración total, aún no ha empezado (espera en cola).
        const progress = Math.min(1, Math.max(0, 1 - remaining / total));
        // Escalones de 10 %: la barra avanza a saltos, como en pixel art.
        fill.style.width = `${Math.floor(progress * 10) * 10}%`;
        status.textContent = remaining <= 0 ? '¡Listo!' : remaining > total ? 'En cola' : formatTicks(remaining);
      });
    }
    const done = lot.jobs.filter((j) => j.readyAt <= state.tick).length;

    // Recetas.
    const recipes = document.createElement('div');
    recipes.className = 'recipes';
    for (const defId of DECOR_IDS) {
      const recipe = ECONOMY.recipes[defId];
      const row = document.createElement('div');
      row.className = 'recipe';
      const info = document.createElement('div');
      info.className = 'recipe-info';
      const name = document.createElement('div');
      name.textContent = `${CATALOG[defId].name} · ${recipe.seconds} s`;
      info.append(name, materialChips(recipe.materials, { have: mine }));
      const canCraft = inside && !queueFull && hasMaterials(mine, recipe.materials);
      row.append(furniIcon(defId), info, button('Fabricar', canCraft, () => actions.craft(lot.id, defId)));
      recipes.append(row);
    }

    win.body.append(
      text(`En fabricación (${lot.jobs.length}/${ECONOMY.workshop.queueSize}):`, 'section-title'),
      queue,
      button(`Recoger muebles (${done})`, inside && done > 0, () => actions.collectCrafted(lot.id)),
      text('Recetas:', 'section-title'),
      recipes,
    );
  };

  const update = (state: GameState, playerId: string) => {
    if (!win.isOpen || !lotId) return;
    const lot = state.lots[lotId];
    if (!lot || !lot.business) {
      win.close();
      return;
    }
    const inside = state.avatars[playerId]?.sceneId === lot.id;
    const mine = state.materials[playerId] ?? {};
    // Firma: si nada de esto cambia, no reconstruimos la ventana.
    // (Para el taller, el número de trabajos terminados cambia con el tiempo.)
    const done = lot.jobs.filter((j) => j.readyAt <= state.tick).length;
    const listings = getListings(state, lot.id);
    const inventory = state.inventories[playerId] ?? [];
    const next = JSON.stringify([lot, mine, inside, done, listings, inventory]);
    if (next !== signature) {
      signature = next;
      timers = [];
      win.setTitle(`${ECONOMY.businesses[lot.business].name} · ${lot.label}`);
      win.body.replaceChildren();
      if (lot.business === 'scrapyard') buildScrapyard(lot, inside);
      else if (lot.business === 'workshop') buildWorkshop(lot, inside, state, playerId);
      else buildStore(lot, inside, state, playerId);
      if (!inside) win.body.append(text('Entra en el local para gestionarlo.'));
    }
    for (const timer of timers) timer(state.tick);
  };

  return {
    open(id) {
      lotId = id;
      signature = '';
      win.open();
    },
    update,
  };
}
