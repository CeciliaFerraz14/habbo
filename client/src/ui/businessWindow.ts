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
  isGarmentItem,
  isKind,
  isUpgrading,
  jobOwner,
  listingValue,
  lotLevel,
  productName,
  secondsToTicks,
  sellsItem,
  storeListingsMax,
  totalMaterials,
  workshopFee,
  workshopQueueSize,
  type BusinessDecorId,
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
import {
  button,
  formatMoney,
  formatTicks,
  levelSection,
  materialChips,
  materialSwatch,
  numberInput,
  readNumber,
  text,
} from './economyUi';
import { furniIcon, garmentIcon, productIcon } from './icons';
import { PixelWindow } from './window';

export interface BusinessActions {
  collectMaterials: (lotId: string) => void;
  /** En la tienda de ropa, `color` es el de la prenda. */
  craft: (lotId: string, recipe: RecipeId, color?: string) => void;
  collectCrafted: (lotId: string) => void;
  /** Taller: abrirlo a todos (pagando) o hacerlo privado. */
  setWorkshopPublic: (lotId: string, open: boolean) => void;
  listItem: (lotId: string, itemId: string, price: number) => void;
  setPrice: (itemId: string, price: number) => void;
  unlist: (itemId: string) => void;
  setFacade: (lotId: string, facade: FacadeId) => void;
  stockLot: (lotId: string) => void;
  setServicePrice: (lotId: string, price: number) => void;
  /** Cerrar el negocio (el local vuelve a estar en alquiler). */
  closeBusiness: (lotId: string) => void;
  /** Mejorar el local al nivel siguiente. */
  upgradeLot: (lotId: string) => void;
  /** Comprar decoración propia del negocio. */
  buyDecor: (lotId: string, defId: BusinessDecorId) => void;
}

export interface BusinessWindow {
  open: (lotId: string) => void;
  update: (state: GameState, playerId: string) => void;
}

/** Tiempo para confirmar "Cerrar el negocio" con un segundo toque (ms). */
const CLOSE_CONFIRM_MS = 4000;

/** Aumento de la vista previa de la fachada (entero, para que los píxeles no se deformen). */
const PREVIEW_SCALE = 2;

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

  // --- Cerrar el negocio ------------------------------------------------------
  /**
   * Hasta cuándo vale el primer toque de "Cerrar el negocio". Vive fuera del
   * botón: la ventana se reconstruye a menudo (por ejemplo, al producir) y el
   * segundo toque tiene que seguir contando como confirmación.
   */
  let closeArmedUntil = 0;

  /**
   * Botón para cerrar el negocio, al final. Pide confirmación (un segundo
   * toque en unos segundos) para no cerrarlo sin querer.
   */
  const buildClose = (lot: Lot) => {
    const config = ECONOMY.businesses[lot.business!];
    const refund = Math.round(config.deposit * ECONOMY.rent.closeRefund);
    // Un local alquilado pierde su nivel al cerrar; uno construido lo conserva.
    const losesLevel = !lot.builtBy && (lotLevel(lot) > 1 || isUpgrading(lot));
    const tenant = !!lot.builtBy && lot.builtBy !== lot.ownerId;
    const label = () => (Date.now() < closeArmedUntil ? '¿Seguro? Toca otra vez para cerrar' : 'Cerrar el negocio');
    const close = button(label(), true, () => {
      if (Date.now() < closeArmedUntil) {
        closeArmedUntil = 0;
        actions.closeBusiness(lot.id);
        return;
      }
      closeArmedUntil = Date.now() + CLOSE_CONFIRM_MS;
      close.textContent = label();
      setTimeout(() => (close.textContent = label()), CLOSE_CONFIRM_MS);
    });
    close.classList.add('btn-danger');
    win.body.append(
      text('Cerrar el negocio', 'section-title'),
      text(
        (tenant
          ? 'Recuperas los muebles y materiales de dentro, pero no la fianza. El local, con su nivel, ' +
            'sigue siendo de su dueño y vuelve a estar en alquiler.'
          : lot.builtBy
            ? 'Recuperas los muebles y materiales de dentro. El local (y su nivel) sigue siendo tuyo.'
            : `Recuperas los muebles y materiales de dentro y ${formatMoney(refund)} de la fianza. ` +
              'Luego puedes abrir otro negocio en el mismo local.') +
          (losesLevel ? ' Ojo: el local vuelve al nivel 1.' : ''),
      ),
      close,
    );
  };

  // --- Nivel del local ----------------------------------------------------------
  /** Nivel del local; el inquilino de un local ajeno lo ve, pero no lo mejora. */
  const buildLevel = (lot: Lot, inside: boolean, state: GameState, playerId: string) => {
    const tenant = !!lot.builtBy && lot.builtBy !== playerId;
    const onUpgrade = tenant ? null : () => actions.upgradeLot(lot.id);
    win.body.append(...levelSection(lot, state, playerId, inside, onUpgrade, timers));
  };

  // --- Decoración del negocio ---------------------------------------------------
  /**
   * Muebles propios de este tipo de negocio, para decorar el local. Los de más
   * nivel salen bloqueados (con el nivel que piden) hasta mejorar el local.
   */
  const buildDecor = (lot: Lot, state: GameState, playerId: string) => {
    const level = lotLevel(lot);
    const money = state.money[playerId] ?? 0;
    const owned = (state.inventories[playerId] ?? []).flatMap((i) => (isGarmentItem(i) ? [] : [i.defId]));
    const list = document.createElement('div');
    list.className = 'recipes';
    for (const offer of ECONOMY.businessDecor[lot.business!]) {
      const row = document.createElement('div');
      row.className = 'recipe';
      const name = document.createElement('div');
      const have = owned.filter((d) => d === offer.defId).length;
      name.textContent = `${CATALOG[offer.defId].name} · ${formatMoney(offer.price)}${have ? ` (tienes ${have})` : ''}`;
      const locked = level < offer.minLevel;
      const buy = button(locked ? `Nivel ${offer.minLevel}` : 'Comprar', !locked && money >= offer.price, () =>
        actions.buyDecor(lot.id, offer.defId),
      );
      if (locked) buy.title = `Mejora el local al nivel ${offer.minLevel} para comprarlo`;
      row.append(furniIcon(offer.defId), name, buy);
      list.append(row);
    }
    win.body.append(
      text('Decoración del negocio:', 'section-title'),
      list,
      text('Va a tu inventario: colócalo en tu local (o en tu caravana) como cualquier mueble.'),
    );
  };

  // --- Productores (chatarrería, pozo, invernadero) ----------------------------
  const buildProducer = (lot: Lot, inside: boolean, production: ProductionConfig) => {
    const level = lotLevel(lot);
    const { seconds } = production;
    const storageCap = production.storageCap * level;
    const output = Object.fromEntries(
      Object.entries(production.output).map(([m, qty]) => [m, qty * level]),
    ) as typeof production.output;
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
    // Con el rango de Empresario caben más productos.
    const maxListings = storeListingsMax(state, playerId, lot);
    const full = products.length >= maxListings;

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
    // Los exclusivos (recompensas de rango) no se venden.
    const inventory = (state.inventories[playerId] ?? []).filter((i) => isGarmentItem(i) || !CATALOG[i.defId].exclusive);
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
      text(`A la venta (${products.length}/${maxListings}):`, 'section-title'),
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
  /**
   * Cola de fabricación con barras de progreso y el botón para recoger lo
   * terminado. Su dueño ve toda la cola (lo de otros, con su nombre). Quien usa
   * un taller público ajeno ve solo lo suyo.
   */
  const buildCraftQueue = (lot: Lot, inside: boolean, state: GameState, playerId: string) => {
    const isOwner = lot.ownerId === playerId;
    const shown = isOwner ? lot.jobs : lot.jobs.filter((j) => j.by === playerId);
    const queue = document.createElement('div');
    queue.className = 'queue';
    if (shown.length === 0) queue.append(text(isOwner ? 'Nada en fabricación.' : 'No tienes nada en fabricación aquí.'));
    for (const job of shown) {
      const info = craftJobInfo(job);
      if (!info) continue;
      const total = secondsToTicks(info.seconds);
      const row = document.createElement('div');
      row.className = 'queue-row';
      const name = document.createElement('span');
      name.textContent = info.name + (isOwner && job.byName ? ` · de ${job.byName}` : '');
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
    // Cada uno recoge lo suyo.
    const done = lot.jobs.filter((j) => j.readyAt <= state.tick && jobOwner(j, lot) === playerId).length;
    // La cola es la del taller (con el rango de Vecino de su dueño, un hueco más).
    win.body.append(
      text(`En fabricación (${lot.jobs.length}/${workshopQueueSize(state, lot.ownerId!, lot)}):`, 'section-title'),
      queue,
      button(`Recoger (${done})`, inside && done > 0, () => actions.collectCrafted(lot.id)),
    );
  };

  /**
   * Una receta: icono, nombre con su tiempo, materiales que pide (marcando los
   * que te faltan) y el botón "Fabricar", que solo se activa dentro del local,
   * con hueco en la cola y con los materiales. `fee`: lo que cuesta en un taller ajeno.
   */
  const recipeRow = (
    icon: HTMLElement,
    label: string,
    materials: Materials,
    have: Materials,
    canCraft: boolean,
    onCraft: () => void,
    fee = 0,
  ) => {
    const row = document.createElement('div');
    row.className = 'recipe';
    const info = document.createElement('div');
    info.className = 'recipe-info';
    const name = document.createElement('div');
    name.textContent = label;
    info.append(name, materialChips(materials, { have }));
    const action = fee > 0 ? `Fabricar · ${formatMoney(fee)}` : 'Fabricar';
    row.append(icon, info, button(action, canCraft && hasMaterials(have, materials), onCraft));
    return row;
  };

  /** ¿Cabe otro trabajo en la cola, y se puede pedir desde donde está el jugador? */
  const canQueue = (lot: Lot, inside: boolean, state: GameState) =>
    inside && lot.jobs.length < workshopQueueSize(state, lot.ownerId!, lot);

  // --- Taller ----------------------------------------------------------------
  /**
   * El taller. Su dueño fabrica muebles y materiales gratis y decide si es
   * público. Quien usa un taller público ajeno solo fabrica muebles y paga por cada uno.
   */
  const buildWorkshop = (lot: Lot, inside: boolean, state: GameState, playerId: string) => {
    const mine = state.materials[playerId] ?? {};
    const isOwner = lot.ownerId === playerId;
    const money = state.money[playerId] ?? 0;
    const canCraft = canQueue(lot, inside, state);
    if (!isOwner) {
      win.body.append(
        text(
          `Taller de ${lot.ownerName}: fabricas con tus materiales y le pagas un ` +
            `${Math.round(ECONOMY.workshop.feeRate * 100)} % del valor de cada mueble.`,
        ),
      );
    }
    buildCraftQueue(lot, inside, state, playerId);

    const recipes = document.createElement('div');
    recipes.className = 'recipes';
    for (const defId of DECOR_IDS) {
      const recipe = ECONOMY.recipes[defId];
      const label = `${CATALOG[defId].name} · ${recipe.seconds} s`;
      // En un taller ajeno, cada mueble cuesta una parte de su valor.
      const fee = isOwner ? 0 : workshopFee(defId);
      recipes.append(
        recipeRow(furniIcon(defId), label, recipe.materials, mine, canCraft && money >= fee, () => actions.craft(lot.id, defId), fee),
      );
    }
    if (isOwner) {
      for (const [material, recipe] of Object.entries(ECONOMY.materialRecipes) as [MaterialId, MaterialRecipe][]) {
        const label = `${ECONOMY.materials[material].name} x${recipe.quantity} · ${recipe.seconds} s`;
        recipes.append(
          recipeRow(materialSwatch(material), label, recipe.materials, mine, canCraft, () =>
            actions.craft(lot.id, material),
          ),
        );
      }
    }
    win.body.append(text('Recetas:', 'section-title'), recipes);
    if (isOwner) buildWorkshopFee(lot, inside);
  };

  // --- Tienda de ropa ----------------------------------------------------------
  /**
   * Cola y recetas de prendas, con el color en que se cosen, y debajo el
   * escaparate, igual que en la tienda de decoración pero con prendas.
   */
  const buildClothing = (lot: Lot, inside: boolean, state: GameState, playerId: string) => {
    const mine = state.materials[playerId] ?? {};
    const canCraft = canQueue(lot, inside, state);
    buildCraftQueue(lot, inside, state, playerId);

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

  /** Dueño: abrir el taller a todos (te pagan por mueble) o hacerlo privado. */
  const buildWorkshopFee = (lot: Lot, inside: boolean) => {
    const open = lot.price > 0;
    const rate = Math.round(ECONOMY.workshop.feeRate * 100);
    win.body.append(
      text(`Taller ${open ? 'público' : 'privado'}:`, 'section-title'),
      text(
        open
          ? `Otros jugadores pueden fabricar aquí con sus materiales y te pagan un ${rate} % del valor de cada mueble.`
          : 'Ahora solo lo usas tú. Ábrelo para que otros puedan fabricar aquí pagándote.',
      ),
      button(open ? 'Hacerlo privado' : 'Abrir a todos', inside, () => actions.setWorkshopPublic(lot.id, !open)),
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
    // Al salir del local, la ventana del negocio se cierra sola. Y quien no es
    // el dueño solo puede verla en un taller público (para usarlo).
    const isOwner = lot.ownerId === playerId;
    if (!inside || (!isOwner && !(lot.business === 'workshop' && lot.price > 0))) {
      win.close();
      return;
    }
    const mine = state.materials[playerId] ?? {};
    // Firma: si nada de esto cambia, no reconstruimos la ventana.
    // (Para el taller, el número de trabajos terminados cambia con el tiempo.)
    const done = lot.jobs.filter((j) => j.readyAt <= state.tick).length;
    const listings = getListings(state, lot.id);
    const inventory = state.inventories[playerId] ?? [];
    // (El dinero y los materiales cuentan también para el botón de mejorar.)
    const next = JSON.stringify([lot, mine, inside, done, listings, inventory, state.money[playerId]]);
    if (next !== signature) {
      signature = next;
      timers = [];
      const config = ECONOMY.businesses[lot.business];
      win.setTitle(isOwner ? `${config.name} · ${lot.label}` : `Taller de ${lot.ownerName} · ${lot.label}`);
      win.body.replaceChildren();
      // Quien usa un taller ajeno solo ve el taller (ni fachada ni cerrar).
      if (!isOwner) {
        buildWorkshop(lot, inside, state, playerId);
        for (const timer of timers) timer(state.tick);
        return;
      }
      buildFacadePicker(lot);
      if (config.production) buildProducer(lot, inside, config.production);
      else if (config.service) buildService(lot, inside, state, playerId, config.service);
      else if (config.kind === 'workshop') buildWorkshop(lot, inside, state, playerId);
      else if (config.kind === 'clothing') buildClothing(lot, inside, state, playerId);
      else buildStore(lot, inside, state, playerId);
      buildLevel(lot, inside, state, playerId);
      buildDecor(lot, state, playerId);
      if (!inside) win.body.append(text('Entra en el local para gestionarlo.'));
      buildClose(lot);
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
