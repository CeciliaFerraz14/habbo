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
  buildingVariant,
  CATALOG,
  DECOR_IDS,
  ECONOMY,
  FACADE_IDS,
  FACADES,
  getListings,
  hasMaterials,
  MOVE_TICK_MS,
  secondsToTicks,
  totalMaterials,
  type DecorId,
  type FacadeId,
  type GameState,
  type Lot,
  type MaterialId,
  type ProductionConfig,
  type ServiceConfig,
} from '@juego/shared';
import { formatMoney, materialChips } from './economyUi';
import { furniIcon } from './icons';
import { PixelWindow } from './window';

export interface BusinessActions {
  collectMaterials: (lotId: string) => void;
  craft: (lotId: string, defId: DecorId) => void;
  collectCrafted: (lotId: string) => void;
  listItem: (lotId: string, itemId: string, price: number) => void;
  setPrice: (itemId: string, price: number) => void;
  unlist: (itemId: string) => void;
  setFacade: (lotId: string, facade: FacadeId) => void;
  stockLot: (lotId: string) => void;
  setServicePrice: (lotId: string, price: number) => void;
}

export interface BusinessWindow {
  open: (lotId: string) => void;
  update: (state: GameState, playerId: string) => void;
}

/** Aumento de la vista previa de la fachada (entero, para que los píxeles no se deformen). */
const PREVIEW_SCALE = 2;

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

  // --- Fachada (todos los negocios) -------------------------------------------
  /**
   * Fachada que se está previsualizando (al pasar el ratón por una opción), o
   * null para ver la actual. Vive fuera de buildFacadePicker para que no se
   * pierda si la ventana se reconstruye mientras el ratón está encima.
   */
  let previewFacade: FacadeId | null = null;
  /**
   * ¿Está desplegado el selector de fachada? Plegado por defecto: ocupa mucho
   * (sobre todo en el móvil) y casi nunca hace falta. Se recuerda mientras la
   * ventana sigue abierta, aunque se reconstruya.
   */
  let facadeOpen = false;

  /**
   * Plantillas de fachada. Plegadas, solo una línea ("Fachada: Clásica" y el
   * botón Cambiar). Desplegadas: una vista previa del local, tal como se verá
   * desde la calle, y un botón por plantilla con sus dos colores. Al pasar el
   * ratón (o el foco) por una opción, la vista previa la muestra; al hacer
   * clic se aplica. El icono del cartel lo pone el tipo de negocio.
   */
  const buildFacadePicker = (lot: Lot) => {
    const header = document.createElement('div');
    header.className = 'facade-header';
    const title = text(`Fachada: ${lot.facade ? FACADES[lot.facade].name : '—'}`, 'section-title');
    const toggle = button('', true, () => {
      facadeOpen = !facadeOpen;
      showOpen();
    });
    header.append(title, toggle);
    const panel = document.createElement('div');
    const showOpen = () => {
      panel.hidden = !facadeOpen;
      toggle.textContent = facadeOpen ? 'Ocultar' : 'Cambiar';
    };

    const preview = document.createElement('div');
    preview.className = 'facade-preview';
    const caption = document.createElement('span');
    caption.className = 'hint';
    const showPreview = (id: FacadeId | null) => {
      previewFacade = id;
      const shown = id ?? lot.facade;
      // Mismo sprite y rotación que el edificio de la calle, a doble tamaño.
      const icon = furniIcon('shop', 1, buildingVariant({ ...lot, facade: shown }));
      icon.style.width = `${icon.width * PREVIEW_SCALE}px`;
      preview.replaceChildren(icon, caption);
      caption.textContent =
        shown && shown !== lot.facade ? `Vista previa: ${FACADES[shown].name}` : 'Fachada actual';
    };

    const row = document.createElement('div');
    row.className = 'facade-picker';
    for (const id of FACADE_IDS) {
      const facade = FACADES[id];
      const b = document.createElement('button');
      b.className = 'facade-option';
      b.classList.toggle('selected', lot.facade === id);
      b.title = facade.description;
      const swatch = document.createElement('span');
      swatch.className = 'facade-swatch';
      // Dos colores: la mitad de arriba el remate, la de abajo la fachada.
      swatch.style.background = `linear-gradient(${facade.trim} 50%, ${facade.wall} 50%)`;
      b.append(swatch, facade.name);
      b.addEventListener('click', () => actions.setFacade(lot.id, id));
      b.addEventListener('mouseenter', () => showPreview(id));
      b.addEventListener('focus', () => showPreview(id));
      b.addEventListener('blur', () => showPreview(null));
      row.append(b);
    }
    row.addEventListener('mouseleave', () => showPreview(null));
    showPreview(previewFacade);
    panel.append(preview, row);
    showOpen();
    win.body.append(header, panel);
  };

  // --- Productores (chatarrería, pozo, invernadero) ----------------------------
  const buildProducer = (lot: Lot, inside: boolean, production: ProductionConfig) => {
    const { output, seconds, storageCap } = production;
    const produced = Object.keys(output) as MaterialId[];
    const countdown = text('');
    timers.push((tick) => {
      countdown.textContent = `Próxima carga en ${formatTicks(lot.nextProductionAt - tick)}`;
    });
    win.body.append(
      text(`Cada ${seconds} s produce:`, 'section-title'),
      materialChips(output),
      text('Almacén:', 'section-title'),
      materialChips(lot.storage, { max: storageCap, showZero: true, only: produced }),
      countdown,
      button('Recoger materiales', inside && totalMaterials(lot.storage) > 0, () =>
        actions.collectMaterials(lot.id),
      ),
    );
  };

  /** Campo numérico para escribir un precio. */
  const priceInput = (
    value: number,
    enabled: boolean,
    limits: { minPrice: number; maxPrice: number } = ECONOMY.store,
  ) => {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'price-input';
    input.min = String(limits.minPrice);
    input.max = String(limits.maxPrice);
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

  // --- Servicios (diner, peluquería, frutería) ---------------------------------
  const buildService = (
    lot: Lot,
    inside: boolean,
    state: GameState,
    playerId: string,
    service: ServiceConfig,
  ) => {
    const mine = state.materials[playerId] ?? {};
    const used = Object.keys(service.consumes) as MaterialId[];
    // Cuántos clientes más se pueden atender con lo que hay en el almacén.
    const servings = Math.min(
      ...used.map((m) => Math.floor((lot.storage[m] ?? 0) / (service.consumes[m] ?? 1))),
    );
    const canRestock = used.some(
      (m) => (mine[m] ?? 0) > 0 && (lot.storage[m] ?? 0) < ECONOMY.services.stockCap,
    );

    const input = priceInput(lot.price, inside, ECONOMY.services);
    const priceRow = document.createElement('div');
    priceRow.className = 'row';
    priceRow.append(
      input,
      button('Cambiar', inside, () => actions.setServicePrice(lot.id, readPrice(input))),
    );

    const maxPrice = Math.floor(service.baseValue * ECONOMY.travelers.maxPriceRatio);
    win.body.append(
      text(`${service.name} · cada cliente gasta:`, 'section-title'),
      materialChips(service.consumes),
      text('Precio:', 'section-title'),
      priceRow,
      text(
        `Precio justo: ${formatMoney(service.baseValue)}. Más barato, más clientes pagan; ` +
          `por encima de ${formatMoney(maxPrice)} no paga nadie.`,
      ),
      text('Almacén:', 'section-title'),
      materialChips(lot.storage, { max: ECONOMY.services.stockCap, showZero: true, only: used }),
      text(
        servings > 0
          ? `Hay para ${servings} cliente${servings === 1 ? '' : 's'} más.`
          : '¡Sin género! Los clientes se irán sin pagar.',
      ),
      button('Reponer con mis materiales', inside && canRestock, () => actions.stockLot(lot.id)),
      text('Cobras aunque no estés. Consigue materiales en el pozo, el invernadero o la gasolinera.'),
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
    // Al salir del local, la ventana del negocio se cierra sola.
    if (!inside) {
      win.close();
      return;
    }
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
      const config = ECONOMY.businesses[lot.business];
      win.setTitle(`${config.name} · ${lot.label}`);
      win.body.replaceChildren();
      buildFacadePicker(lot);
      if (config.production) buildProducer(lot, inside, config.production);
      else if (config.service) buildService(lot, inside, state, playerId, config.service);
      else if (config.kind === 'workshop') buildWorkshop(lot, inside, state, playerId);
      else buildStore(lot, inside, state, playerId);
      if (!inside) win.body.append(text('Entra en el local para gestionarlo.'));
    }
    for (const timer of timers) timer(state.tick);
  };

  return {
    open(id) {
      lotId = id;
      signature = '';
      // Cada vez que se abre, la fachada empieza plegada.
      facadeOpen = false;
      win.open();
    },
    update,
  };
}
