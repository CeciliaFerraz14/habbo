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
  craftJobInfo,
  DECOR_IDS,
  displayOf,
  ECONOMY,
  FACADE_IDS,
  FACADES,
  GARMENT_COLORS,
  GARMENT_IDS,
  GARMENTS,
  garmentKey,
  getListings,
  hasMaterials,
  isGarmentDisplay,
  isKind,
  listingValue,
  productName,
  secondsToTicks,
  sellsItem,
  totalMaterials,
  type FacadeId,
  type GameState,
  type GarmentId,
  type Lot,
  type MaterialId,
  type MaterialRecipe,
  type Materials,
  type Product,
  type RecipeId,
  type ProductionConfig,
  type ServiceConfig,
} from '@juego/shared';
import { formatMoney, formatTicks, materialChips, materialSwatch, numberInput, readNumber } from './economyUi';
import { furniIcon, garmentIcon, productIcon } from './icons';
import { PixelWindow } from './window';

export interface BusinessActions {
  collectMaterials: (lotId: string) => void;
  /** En la tienda de ropa, `color` es el de la prenda. */
  craft: (lotId: string, recipe: RecipeId, color?: string) => void;
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

export function createBusinessWindow(actions: BusinessActions): BusinessWindow {
  const win = new PixelWindow({
    title: 'Negocio',
    x: Math.max(24, window.innerWidth - 460),
    y: 110,
    width: 420,
  });
  let lotId: string | null = null;
  let signature = '';
  /** Tienda de ropa: color en el que se cosen las prendas. Se recuerda entre locales. */
  let garmentColor = GARMENT_COLORS[0];
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
   * Plantillas de fachada: un botón por plantilla con sus dos colores. La
   * elegida va marcada. El icono del cartel lo pone el tipo de negocio.
   */
  const buildFacadePicker = (lot: Lot) => {
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
      row.append(b);
    }
    win.body.append(text('Fachada:', 'section-title'), row);
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
  ) => numberInput(value, limits.minPrice, limits.maxPrice, enabled);

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
      name.textContent = productName(item);
      const input = priceInput(item.price!, inside);
      const controls = document.createElement('div');
      controls.className = 'row';
      controls.append(
        input,
        button('Cambiar', inside, () => actions.setPrice(item.id, readNumber(input))),
        button('Retirar', inside, () => actions.unlist(item.id)),
      );
      info.append(name, controls);
      row.append(productIcon(item), info, document.createElement('span'));
      onSale.append(row);
    }

    // Lo que hay en tu inventario y esta tienda puede vender (muebles en la de
    // decoración, prendas en la de ropa), agrupado por tipo y color.
    const forSale = document.createElement('div');
    forSale.className = 'recipes';
    const inventory = state.inventories[playerId] ?? [];
    const groups = new Map<string, { product: Product; ids: string[] }>();
    for (const item of inventory) {
      if (!sellsItem(lot, item)) continue;
      const product = displayOf(item);
      const key = isGarmentDisplay(product) ? garmentKey({ type: product.garment, color: product.variant }) : product.defId;
      const group = groups.get(key) ?? { product, ids: [] };
      group.ids.push(item.id);
      groups.set(key, group);
    }
    if (groups.size === 0) {
      forSale.append(
        text(
          isKind(lot, 'clothing')
            ? 'No tienes prendas en el inventario.'
            : 'No tienes muebles en el inventario. Fabrícalos en un taller.',
        ),
      );
    }
    for (const { product, ids } of groups.values()) {
      const row = document.createElement('div');
      row.className = 'recipe';
      const info = document.createElement('div');
      info.className = 'recipe-info';
      const name = document.createElement('div');
      name.textContent = `${productName(product)} (x${ids.length})`;
      // Precio sugerido: el valor de referencia del producto.
      const input = priceInput(listingValue(product), inside);
      const controls = document.createElement('div');
      controls.className = 'row';
      controls.append(
        input,
        button('Vender', inside && !full, () => actions.listItem(lot.id, ids[0], readNumber(input))),
      );
      info.append(name, controls);
      row.append(productIcon(product), info, document.createElement('span'));
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
      button('Cambiar', inside, () => actions.setServicePrice(lot.id, readNumber(input))),
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

  // --- Fabricación (taller y tienda de ropa) ---------------------------------
  /** Cola de fabricación con barras de progreso y el botón para recoger lo terminado. */
  const buildCraftQueue = (lot: Lot, inside: boolean, state: GameState) => {
    const queue = document.createElement('div');
    queue.className = 'queue';
    if (lot.jobs.length === 0) queue.append(text('Nada en fabricación.'));
    for (const job of lot.jobs) {
      const info = craftJobInfo(job);
      if (!info) continue;
      const total = secondsToTicks(info.seconds);
      const row = document.createElement('div');
      row.className = 'queue-row';
      const name = document.createElement('span');
      name.textContent = info.name;
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
    win.body.append(
      text(`En fabricación (${lot.jobs.length}/${ECONOMY.workshop.queueSize}):`, 'section-title'),
      queue,
      button(`Recoger (${done})`, inside && done > 0, () => actions.collectCrafted(lot.id)),
    );
  };

  /**
   * Una receta: icono, nombre con su tiempo, materiales que pide (marcando los
   * que te faltan) y el botón "Fabricar", que solo se activa dentro del local,
   * con hueco en la cola y con los materiales.
   */
  const recipeRow = (
    icon: HTMLElement,
    label: string,
    materials: Materials,
    have: Materials,
    canCraft: boolean,
    onCraft: () => void,
  ) => {
    const row = document.createElement('div');
    row.className = 'recipe';
    const info = document.createElement('div');
    info.className = 'recipe-info';
    const name = document.createElement('div');
    name.textContent = label;
    info.append(name, materialChips(materials, { have }));
    row.append(icon, info, button('Fabricar', canCraft && hasMaterials(have, materials), onCraft));
    return row;
  };

  // --- Taller ----------------------------------------------------------------
  const buildWorkshop = (lot: Lot, inside: boolean, state: GameState, playerId: string) => {
    const mine = state.materials[playerId] ?? {};
    const canCraft = inside && lot.jobs.length < ECONOMY.workshop.queueSize;
    buildCraftQueue(lot, inside, state);

    const recipes = document.createElement('div');
    recipes.className = 'recipes';
    for (const defId of DECOR_IDS) {
      const recipe = ECONOMY.recipes[defId];
      const label = `${CATALOG[defId].name} · ${recipe.seconds} s`;
      recipes.append(
        recipeRow(furniIcon(defId), label, recipe.materials, mine, canCraft, () => actions.craft(lot.id, defId)),
      );
    }
    for (const [material, recipe] of Object.entries(ECONOMY.materialRecipes) as [MaterialId, MaterialRecipe][]) {
      const label = `${ECONOMY.materials[material].name} x${recipe.quantity} · ${recipe.seconds} s`;
      recipes.append(
        recipeRow(materialSwatch(material), label, recipe.materials, mine, canCraft, () =>
          actions.craft(lot.id, material),
        ),
      );
    }
    win.body.append(text('Recetas:', 'section-title'), recipes);
  };

  // --- Tienda de ropa ----------------------------------------------------------
  /**
   * Cola y recetas de prendas, con el color en que se cosen, y debajo el
   * escaparate, igual que en la tienda de decoración pero con prendas.
   */
  const buildClothing = (lot: Lot, inside: boolean, state: GameState, playerId: string) => {
    const mine = state.materials[playerId] ?? {};
    const canCraft = inside && lot.jobs.length < ECONOMY.workshop.queueSize;
    buildCraftQueue(lot, inside, state);

    // Muestras de color: elegir una solo repinta la muestra elegida y los
    // iconos de las recetas, en su sitio (el resto de la ventana no se toca).
    const colors = document.createElement('div');
    colors.className = 'swatches';
    const swatches = new Map<string, HTMLElement>();
    const icons = new Map<GarmentId, HTMLElement>();
    const recolor = (color: string) => {
      garmentColor = color;
      for (const [c, b] of swatches) b.classList.toggle('selected', c === color);
      for (const [garment, old] of icons) {
        const icon = garmentIcon({ type: garment, color });
        old.replaceWith(icon);
        icons.set(garment, icon);
      }
    };
    for (const color of GARMENT_COLORS) {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.classList.toggle('selected', color === garmentColor);
      b.style.background = color;
      b.title = color;
      b.addEventListener('click', () => recolor(color));
      swatches.set(color, b);
      colors.append(b);
    }

    const recipes = document.createElement('div');
    recipes.className = 'recipes';
    for (const garment of GARMENT_IDS) {
      const recipe = ECONOMY.garmentRecipes[garment];
      const label = `${GARMENTS[garment].name} · ${recipe.seconds} s`;
      const icon = garmentIcon({ type: garment, color: garmentColor });
      icons.set(garment, icon);
      recipes.append(
        recipeRow(icon, label, recipe.materials, mine, canCraft, () =>
          actions.craft(lot.id, garment, garmentColor),
        ),
      );
    }
    win.body.append(text('Color:', 'section-title'), colors, text('Recetas:', 'section-title'), recipes);
    buildStore(lot, inside, state, playerId);
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
      else if (config.kind === 'clothing') buildClothing(lot, inside, state, playerId);
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
