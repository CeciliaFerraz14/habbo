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

export type BusinessType =
  | 'scrapyard'
  | 'well'
  | 'greenhouse'
  | 'workshop'
  | 'store'
  | 'diner'
  | 'barber'
  | 'greengrocer';

/**
 * Cómo funciona cada negocio por dentro:
 * - producer: produce materiales solo cada cierto tiempo (chatarrería, pozo...).
 * - workshop: convierte materiales en muebles (taller).
 * - store: vende muebles con el precio que pone el dueño (tienda).
 * - service: los viajeros pagan por un servicio (comer, cortarse el pelo...) que
 *   gasta materiales del almacén del local. El dueño lo repone y pone el precio.
 */
export type BusinessKind = 'producer' | 'workshop' | 'store' | 'service';

/**
 * Plantillas de fachada de los locales. El dueño elige una para que se vea
 * desde la calle qué tipo de local es. Aquí solo se definen nombre y colores;
 * cómo se dibuja cada una está en client/src/sprites/structures/shop.ts.
 */
export type FacadeId = 'classic' | 'diner' | 'garage' | 'boutique';

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
};

export const FACADE_IDS = Object.keys(FACADES) as FacadeId[];
export type MaterialId = 'sheet_metal' | 'old_wood' | 'tires' | 'water' | 'fruit';
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
  workshop: {
    name: 'Taller de muebles',
    kind: 'workshop',
    defaultFacade: 'classic',
    description: 'Convierte materiales en muebles siguiendo recetas.',
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
   * Subvención del pueblo: un ingreso fijo que cada jugador recoge a mano
   * (entrada de dinero). Es una red de seguridad, no un sueldo: conviene que
   * sea parecida al alquiler más barato para no restar interés a los viajeros.
   * No se acumula: si no la recoges, no se suma la del periodo siguiente.
   */
  subsidy: {
    amount: 30,
    periodSeconds: 24 * 60 * 60, // una vez al día
  },

  /**
   * Proveedor de materiales (en la gasolinera). Otra forma de conseguir
   * materiales sin tener chatarrería, a cambio de dinero (salida de dinero).
   */
  supplier: {
    name: 'Suministros del Desierto',
    prices: { sheet_metal: 8, old_wood: 6, tires: 10, water: 4, fruit: 5 } satisfies Record<MaterialId, number>,
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
  } satisfies Record<MaterialId, { name: string }>,

  workshop: {
    /** Cuántos muebles puede tener en cola a la vez. */
    queueSize: 3,
  },

  services: {
    /** Máximo de cada material que cabe en el almacén de un negocio de servicios. */
    stockCap: 20,
    minPrice: 1,
    maxPrice: 999,
  },

  store: {
    /** Cuántos productos caben a la venta en una tienda. */
    maxListings: 8,
    minPrice: 1,
    maxPrice: 9999,
    /** Parte de cada venta que se queda el ayuntamiento (sale de la economía). */
    commissionRate: 0.05,
  },

  /**
   * Tiendas que llevan los NPC desde el principio, para que el pueblo no esté
   * vacío y haya dónde comprar. Reponen género solas cada cierto tiempo.
   */
  npcStores: [
    { lotId: 'lot4', ownerId: 'npc-rosa', ownerName: 'Rosa', markup: 1.3, initialStock: 5 },
    { lotId: 'lot6', ownerId: 'npc-elmer', ownerName: 'Elmer', markup: 1.1, initialStock: 4 },
  ],
  npcRestock: {
    /** Cada cuántos segundos repone un producto una tienda NPC. */
    seconds: 45,
    /** No repone si ya tiene tantos productos a la venta. */
    targetStock: 6,
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
    cow_skull: { materials: { old_wood: 1 }, seconds: 10 },
    rocking_chair: { materials: { old_wood: 3 }, seconds: 25 },
    radio: { materials: { sheet_metal: 1, old_wood: 2 }, seconds: 30 },
    open_sign: { materials: { sheet_metal: 2 }, seconds: 30 },
    sofa: { materials: { old_wood: 2, tires: 2 }, seconds: 35 },
    bed: { materials: { old_wood: 3, sheet_metal: 1 }, seconds: 35 },
    milkshake_machine: { materials: { sheet_metal: 3 }, seconds: 35 },
  } satisfies Record<DecorId, Recipe>,

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
    cow_skull: 30,
    rocking_chair: 65,
    radio: 80,
    open_sign: 75,
    sofa: 85,
    bed: 90,
    milkshake_machine: 90,
  } satisfies Record<DecorId, number>,
} as const;

export const BUSINESS_TYPES = Object.keys(ECONOMY.businesses) as BusinessType[];
export const MATERIAL_IDS = Object.keys(ECONOMY.materials) as MaterialId[];
