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

export type BusinessType = 'scrapyard' | 'workshop' | 'store';
export type MaterialId = 'sheet_metal' | 'old_wood' | 'tires';
/** Cantidades de materiales. Lo que no aparece cuenta como 0. */
export type Materials = Partial<Record<MaterialId, number>>;

export interface BusinessConfig {
  name: string;
  description: string;
  /** Color del neón del local cuando está abierto. */
  neon: string;
  /** Fianza que se paga al alquilar. */
  deposit: number;
  /** Alquiler que se cobra cada periodo (ver ECONOMY.rent). */
  rent: number;
}

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

  businesses: {
    scrapyard: {
      name: 'Chatarrería',
      description: 'Produce chapa, madera vieja y neumáticos cada cierto tiempo.',
      neon: '#ffe14d',
      deposit: 80,
      rent: 25,
    },
    workshop: {
      name: 'Taller de muebles',
      description: 'Convierte materiales en muebles siguiendo recetas.',
      neon: '#39e6ff',
      deposit: 120,
      rent: 35,
    },
    store: {
      name: 'Tienda de decoración',
      description: 'Vende muebles al público.',
      neon: '#ff4fa3',
      deposit: 150,
      rent: 45,
    },
  } satisfies Record<BusinessType, BusinessConfig>,

  /**
   * Alquiler periódico de los locales de los jugadores (salida de dinero).
   * Si no tienes dinero para pagarlo, pierdes el local.
   */
  rent: {
    periodSeconds: 120,
  },

  /**
   * Proveedor de materiales (en la gasolinera). Otra forma de conseguir
   * materiales sin tener chatarrería, a cambio de dinero (salida de dinero).
   */
  supplier: {
    name: 'Suministros del Desierto',
    prices: { sheet_metal: 8, old_wood: 6, tires: 10 } satisfies Record<MaterialId, number>,
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
  } satisfies Record<MaterialId, { name: string }>,

  scrapyard: {
    /** Cada cuántos segundos produce. */
    productionSeconds: 20,
    /** Qué produce en cada ciclo. */
    output: { sheet_metal: 1, old_wood: 1, tires: 1 } as Materials,
    /** Máximo que puede acumular de cada material antes de que lo recojas. */
    storageCap: 20,
  },

  workshop: {
    /** Cuántos muebles puede tener en cola a la vez. */
    queueSize: 3,
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
  } satisfies Record<DecorId, number>,
} as const;

export const BUSINESS_TYPES = Object.keys(ECONOMY.businesses) as BusinessType[];
export const MATERIAL_IDS = Object.keys(ECONOMY.materials) as MaterialId[];
