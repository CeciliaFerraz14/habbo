// =============================================================================
//  CONFIGURACIÓN DE LA ECONOMÍA
// =============================================================================
//
// TODOS los números de la economía están aquí: precios, alquileres, tiempos,
// recetas... Para equilibrar el juego basta con tocar este archivo.
//
// Los tiempos se escriben en SEGUNDOS para que sean fáciles de leer. La
// simulación los convierte a ticks (ver secondsToTicks en economy.ts).
// =============================================================================
import type { DecorId } from './catalog';
import type { GarmentId } from './garments';

export type BusinessType =
  | 'scrapyard'
  | 'well'
  | 'greenhouse'
  | 'cotton_field'
  | 'workshop'
  | 'store'
  | 'clothing'
  | 'diner'
  | 'bar'
  | 'arcade'
  | 'barber'
  | 'greengrocer';

/**
 * Cómo funciona cada negocio por dentro:
 * - producer: produce materiales solo cada cierto tiempo (chatarrería, pozo...).
 * - workshop: convierte materiales en muebles y fichas (taller).
 * - store: vende muebles con el precio que pone el dueño (tienda).
 * - clothing: cose prendas con tela y las vende como la tienda (tienda de ropa).
 * - service: los viajeros pagan por un servicio (comer, cortarse el pelo...) que
 *   gasta materiales del almacén del local. El dueño lo repone y pone el precio.
 */
export type BusinessKind = 'producer' | 'workshop' | 'store' | 'clothing' | 'service';

/**
 * Plantillas de fachada de los locales. El dueño elige una para que se vea
 * desde la calle qué tipo de local es. Aquí solo se definen nombre y colores;
 * cómo se dibuja cada una está en client/src/sprites/structures/shop.ts.
 */
export type FacadeId = 'classic' | 'diner' | 'garage' | 'boutique' | 'saloon' | 'arcade';

export interface FacadeConfig {
  name: string;
  description: string;
  /** Color de la fachada. */
  wall: string;
  /** Color del remate y los marcos. */
  trim: string;
}

export const FACADES: Record<FacadeId, FacadeConfig> = {
  classic: {
    name: 'Clásica',
    description: 'Fachada del oeste con escaparate.',
    wall: '#e8c48a',
    trim: '#8a5a34',
  },
  diner: {
    name: 'Diner',
    description: 'Crema y rojo, con zócalo cromado.',
    wall: '#f3e6c8',
    trim: '#c83c3c',
  },
  garage: {
    name: 'Garaje',
    description: 'Hormigón y persiana metálica.',
    wall: '#b8b0a0',
    trim: '#4a4a5a',
  },
  boutique: {
    name: 'Boutique',
    description: 'Rosa pastel con toldo de rayas.',
    wall: '#e8a0b4',
    trim: '#2f8f8a',
  },
  saloon: {
    name: 'Saloon',
    description: 'Madera oscura con puertas batientes.',
    wall: '#a0703c',
    trim: '#5a3a24',
  },
  arcade: {
    name: 'Recreativos',
    description: 'Negra con franjas de neón.',
    wall: '#2a2a3a',
    trim: '#ff4fa3',
  },
};

export const FACADE_IDS = Object.keys(FACADES) as FacadeId[];
export type MaterialId = 'sheet_metal' | 'old_wood' | 'tires' | 'water' | 'fruit' | 'fabric' | 'tokens';
/** Cantidades de materiales. Lo que no aparece cuenta como 0. */
export type Materials = Partial<Record<MaterialId, number>>;

/** Negocios productores: qué producen y cada cuánto. */
export interface ProductionConfig {
  /** Cada cuántos segundos produce. */
  seconds: number;
  /** Qué produce en cada ciclo. */
  output: Materials;
  /** Máximo que puede acumular de cada material antes de que lo recojas. */
  storageCap: number;
}

/** Negocios de servicios: qué se vende a los viajeros y qué gasta. */
export interface ServiceConfig {
  /** Nombre del servicio ("Menú del día"). */
  name: string;
  /** Materiales que gasta cada vez que se sirve. */
  consumes: Materials;
  /** Valor de referencia: precio inicial y lo que los viajeros consideran justo. */
  baseValue: number;
}

export interface BusinessConfig {
  name: string;
  kind: BusinessKind;
  /** Plantilla de fachada que se pone al abrir el negocio (luego se puede cambiar). */
  defaultFacade: FacadeId;
  description: string;
  /** Color del neón del local cuando está abierto. */
  neon: string;
  /** Fianza que se paga al alquilar. */
  deposit: number;
  /** Alquiler que se cobra cada periodo (ver ECONOMY.rent). */
  rent: number;
  /** Solo los de tipo producer. */
  production?: ProductionConfig;
  /** Solo los de tipo service. */
  service?: ServiceConfig;
}

/**
 * Los negocios que se pueden abrir, en el orden en que aparecen al alquilar.
 * Para añadir uno nuevo: añádelo a BusinessType y aquí, y dale un puesto de
 * trabajo (STATIONS en economy.ts) y un icono de neón (shop.ts en el cliente).
 */
const BUSINESSES: Record<BusinessType, BusinessConfig> = {
  scrapyard: {
    name: 'Chatarrería',
    kind: 'producer',
    defaultFacade: 'garage',
    description: 'Produce chapa, madera vieja y neumáticos cada cierto tiempo.',
    neon: '#ffe14d',
    deposit: 80,
    rent: 25,
    production: { seconds: 20, output: { sheet_metal: 1, old_wood: 1, tires: 1 }, storageCap: 20 },
  },
  well: {
    name: 'Pozo',
    kind: 'producer',
    defaultFacade: 'garage',
    description: 'Saca agua del subsuelo. La necesitan el diner y la peluquería.',
    neon: '#4fa3ff',
    deposit: 60,
    rent: 20,
    production: { seconds: 15, output: { water: 2 }, storageCap: 30 },
  },
  greenhouse: {
    name: 'Invernadero',
    kind: 'producer',
    defaultFacade: 'classic',
    description: 'Cultiva fruta a la sombra. La necesitan el diner y la frutería.',
    neon: '#a8ff4f',
    deposit: 70,
    rent: 22,
    production: { seconds: 20, output: { fruit: 2 }, storageCap: 30 },
  },
  cotton_field: {
    name: 'Campo de algodón',
    kind: 'producer',
    defaultFacade: 'classic',
    description: 'Cultiva algodón y lo hila en tela. La necesita la tienda de ropa.',
    neon: '#9fe8ff',
    deposit: 70,
    rent: 22,
    production: { seconds: 20, output: { fabric: 2 }, storageCap: 30 },
  },
  workshop: {
    name: 'Taller de muebles',
    kind: 'workshop',
    defaultFacade: 'classic',
    description: 'Convierte materiales en muebles y fichas siguiendo recetas.',
    neon: '#39e6ff',
    deposit: 120,
    rent: 35,
  },
  store: {
    name: 'Tienda de decoración',
    kind: 'store',
    defaultFacade: 'boutique',
    description: 'Vende muebles al público.',
    neon: '#ff4fa3',
    deposit: 150,
    rent: 45,
  },
  clothing: {
    name: 'Tienda de ropa',
    kind: 'clothing',
    defaultFacade: 'boutique',
    description: 'Cose prendas con tela y las vende a jugadores y viajeros.',
    neon: '#ffb3d9',
    deposit: 140,
    rent: 40,
  },
  diner: {
    name: 'Diner',
    kind: 'service',
    defaultFacade: 'diner',
    description: 'Sirve el menú del día a los viajeros. Gasta agua y fruta.',
    neon: '#ff5a3c',
    deposit: 140,
    rent: 35,
    service: { name: 'Menú del día', consumes: { water: 1, fruit: 1 }, baseValue: 45 },
  },
  bar: {
    name: 'Bar',
    kind: 'service',
    defaultFacade: 'saloon',
    description: 'Sirve rondas a los viajeros. Gasta agua y fruta.',
    neon: '#ffb347',
    deposit: 130,
    rent: 32,
    service: { name: 'Una ronda', consumes: { water: 1, fruit: 1 }, baseValue: 40 },
  },
  arcade: {
    name: 'Recreativos',
    kind: 'service',
    defaultFacade: 'arcade',
    description: 'Los viajeros echan una partida. Gasta fichas del taller.',
    neon: '#4fffe0',
    deposit: 150,
    rent: 40,
    service: { name: 'Una partida', consumes: { tokens: 2 }, baseValue: 50 },
  },
  barber: {
    name: 'Peluquería',
    kind: 'service',
    defaultFacade: 'boutique',
    description: 'Corta el pelo a los viajeros (salen con otro color). Gasta agua.',
    neon: '#b98cff',
    deposit: 100,
    rent: 25,
    service: { name: 'Corte de pelo', consumes: { water: 1 }, baseValue: 35 },
  },
  greengrocer: {
    name: 'Frutería',
    kind: 'service',
    defaultFacade: 'classic',
    description: 'Vende bolsas de fruta fresca a los viajeros. Gasta fruta.',
    neon: '#7cff6b',
    deposit: 90,
    rent: 22,
    service: { name: 'Bolsa de fruta', consumes: { fruit: 2 }, baseValue: 30 },
  },
};

export interface Recipe {
  /** Materiales que consume. */
  materials: Materials;
  /** Segundos que tarda en fabricarse. */
  seconds: number;
}

/** Receta del taller que fabrica un material en vez de un mueble. */
export interface MaterialRecipe extends Recipe {
  /** Unidades de material que se obtienen al recogerla. */
  quantity: number;
}

/** Lo que se puede fabricar: un mueble o un material (taller) o una prenda (tienda de ropa). */
export type RecipeId = DecorId | MaterialId | GarmentId;

export const ECONOMY = {
  /** Símbolo de la moneda del pueblo. */
  currency: '$',
  /** Dinero con el que empieza un jugador nuevo. */
  startingMoney: 500,
  /** Muebles que recibe en su inventario un jugador nuevo. */
  starterInventory: ['tire', 'tire', 'road_sign'] as DecorId[],

  businesses: BUSINESSES,

  /**
   * Alquiler periódico de los locales de los jugadores (salida de dinero).
   * Si no tienes dinero para pagarlo, pierdes el local.
   */
  rent: {
    periodSeconds: 24 * 60 * 60, // una vez al día
  },

  /**
   * Proveedor de materiales (en la gasolinera). Otra forma de conseguir
   * materiales sin tener chatarrería, a cambio de dinero (salida de dinero).
   */
  supplier: {
    name: 'Suministros del Desierto',
    prices: { sheet_metal: 8, old_wood: 6, tires: 10, water: 4, fruit: 5 } satisfies Partial<Record<MaterialId, number>>,
    /** Máximo de unidades por compra. */
    maxPerPurchase: 20,
  },

  /**
   * Viajeros: la ENTRADA de dinero al pueblo. Llegan en coche y compran en
   * las tiendas abiertas. Cuantos más negocios abiertos, más paran.
   */
  travelers: {
    /** Cada cuántos segundos pasa un coche por la carretera (±30 % al azar). */
    carIntervalSeconds: 10,
    /** Probabilidad de que un coche pare: base + extra por cada negocio abierto. */
    baseStopChance: 0.15,
    stopChancePerBusiness: 0.12,
    maxStopChance: 0.9,
    /** Máximo de viajeros a la vez en el pueblo. */
    maxActive: 4,
    /** Dinero que trae cada viajero (al azar entre min y max). */
    budget: { min: 40, max: 220 },
    /** No compran nada que cueste más de este múltiplo de su valor de referencia. */
    maxPriceRatio: 1.5,
    /**
     * Probabilidad de comprar = base + variedad × tipos distintos a la venta
     * + ganga × (1 - precio / valor). Más variedad y mejores precios, más ventas.
     */
    baseBuyChance: 0.35,
    varietyBonus: 0.08,
    bargainBonus: 0.5,
  },

  materials: {
    sheet_metal: { name: 'Chapa' },
    old_wood: { name: 'Madera vieja' },
    tires: { name: 'Neumáticos' },
    water: { name: 'Agua' },
    fruit: { name: 'Fruta' },
    fabric: { name: 'Tela' },
    tokens: { name: 'Fichas' },
  } satisfies Record<MaterialId, { name: string }>,

  workshop: {
    /** Cuántos trabajos puede tener en cola a la vez (también la tienda de ropa). */
    queueSize: 3,
  },

  services: {
    /** Máximo de cada material que cabe en el almacén de un negocio de servicios. */
    stockCap: 20,
    minPrice: 1,
    maxPrice: 999,
  },

  /** Escaparate de la tienda de decoración y de la tienda de ropa. */
  store: {
    /** Cuántos productos caben a la venta en una tienda. */
    maxListings: 8,
    minPrice: 1,
    maxPrice: 9999,
    /** Parte de cada venta que se queda el ayuntamiento (sale de la economía). */
    commissionRate: 0.05,
  },

  /** Recetas del taller: qué cuesta fabricar cada mueble. */
  recipes: {
    tire: { materials: { tires: 2 }, seconds: 10 },
    potted_cactus: { materials: { old_wood: 1 }, seconds: 10 },
    road_sign: { materials: { sheet_metal: 1, old_wood: 1 }, seconds: 15 },
    bar_stool: { materials: { sheet_metal: 2, tires: 1 }, seconds: 20 },
    formica_table: { materials: { sheet_metal: 2, old_wood: 1 }, seconds: 25 },
    neon_lamp: { materials: { sheet_metal: 2 }, seconds: 30 },
    diner_booth: { materials: { old_wood: 3, tires: 2 }, seconds: 40 },
    vintage_fridge: { materials: { sheet_metal: 4 }, seconds: 45 },
    jukebox: { materials: { sheet_metal: 2, old_wood: 3 }, seconds: 60 },
    bar_counter: { materials: { old_wood: 3, sheet_metal: 1 }, seconds: 35 },
    beer_barrel: { materials: { old_wood: 2, sheet_metal: 1 }, seconds: 20 },
    dartboard: { materials: { old_wood: 1, sheet_metal: 1 }, seconds: 15 },
    // Las recreativas se pagan también con fichas, que salen del taller.
    arcade_machine: { materials: { sheet_metal: 3, old_wood: 1, tokens: 2 }, seconds: 50 },
    pinball: { materials: { sheet_metal: 3, tires: 1, tokens: 2 }, seconds: 60 },
  } satisfies Record<DecorId, Recipe>,

  /** Recetas de la tienda de ropa: qué tela (y demás) cuesta coser cada prenda. */
  garmentRecipes: {
    cowboy_hat: { materials: { fabric: 2 }, seconds: 20 },
    cap: { materials: { fabric: 1 }, seconds: 12 },
    denim_jacket: { materials: { fabric: 3 }, seconds: 30 },
    vest: { materials: { fabric: 2 }, seconds: 20 },
    boots: { materials: { fabric: 1, tires: 1 }, seconds: 20 },
  } satisfies Record<GarmentId, Recipe>,

  /** Valor de referencia de cada prenda (precio sugerido y lo que pagan los viajeros). */
  garmentValue: {
    cowboy_hat: 45,
    cap: 25,
    denim_jacket: 70,
    vest: 50,
    boots: 40,
  } satisfies Record<GarmentId, number>,

  /** Recetas del taller que producen materiales (no se compran en el proveedor). */
  materialRecipes: {
    tokens: { materials: { sheet_metal: 1 }, seconds: 15, quantity: 5 },
  } satisfies Partial<Record<MaterialId, MaterialRecipe>>,

  /**
   * Valor de referencia de cada mueble. Lo usarán las tiendas como precio
   * sugerido y los viajeros para decidir si algo es caro o barato.
   */
  baseValue: {
    tire: 20,
    potted_cactus: 25,
    road_sign: 35,
    bar_stool: 50,
    formica_table: 60,
    neon_lamp: 70,
    diner_booth: 110,
    vintage_fridge: 120,
    jukebox: 160,
    bar_counter: 90,
    beer_barrel: 45,
    dartboard: 40,
    arcade_machine: 150,
    pinball: 170,
  } satisfies Record<DecorId, number>,
} as const;

export const BUSINESS_TYPES = Object.keys(ECONOMY.businesses) as BusinessType[];
export const MATERIAL_IDS = Object.keys(ECONOMY.materials) as MaterialId[];

export type SupplierMaterialId = keyof typeof ECONOMY.supplier.prices;
/** Materiales que vende el proveedor de la gasolinera (la tela y las fichas no). */
export const SUPPLIER_MATERIAL_IDS = Object.keys(ECONOMY.supplier.prices) as SupplierMaterialId[];

/**
 * Las claves de las acciones vienen del cliente: `'toString' in config` sería
 * cierto por el prototipo. Esta comprobación solo acepta claves propias.
 */
export function isOwnKey<T extends object>(config: T, key: PropertyKey): key is keyof T {
  return Object.hasOwn(config, key);
}

/** ¿Es una receta de mueble? */
export function isFurnitureRecipe(id: RecipeId): id is DecorId {
  return isOwnKey(ECONOMY.recipes, id);
}

/** ¿Es una receta que fabrica un material? */
export function isMaterialRecipe(id: RecipeId): id is keyof typeof ECONOMY.materialRecipes {
  return isOwnKey(ECONOMY.materialRecipes, id);
}
