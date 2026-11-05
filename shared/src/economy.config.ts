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
import type { BusinessDecorId, DecorId, FurniId, VendorItemId } from './catalog';
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
 * Para añadir uno nuevo: añádelo a BusinessType y aquí, y dale sus puestos de
 * trabajo (STATIONS y EXTRA_STATIONS en economy.ts), su decoración (businessDecor)
 * y su logo de neón (shopLogos.ts en el cliente).
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
    description: 'Saca agua del subsuelo. La necesitan el diner, el bar y la peluquería.',
    neon: '#4fa3ff',
    deposit: 60,
    rent: 20,
    production: { seconds: 15, output: { water: 2 }, storageCap: 30 },
  },
  greenhouse: {
    name: 'Invernadero',
    kind: 'producer',
    defaultFacade: 'classic',
    description: 'Cultiva fruta a la sombra. La necesitan el diner, el bar y la frutería.',
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

/** Recompensa de un rango (todo opcional; las ventajas se suman entre rangos). */
export interface RankReward {
  /** Lo que se enseña al jugador ("+1 hueco en la cola del taller"). */
  text: string;
  /** Dinero al subir. */
  money?: number;
  /** Muebles al inventario al subir (también exclusivos). */
  items?: FurniId[];
  /** Desbloquea los colores especiales y el sombrero del editor de avatar. */
  premiumLook?: boolean;
  /** Pasa a ser alcalde: su nombre en la estatua de la calle. */
  mayor?: boolean;
  /** Huecos extra en la cola del taller. */
  workshopQueue?: number;
  /** Huecos de venta extra en la tienda. */
  storeListings?: number;
  /** Subvención diaria nueva (sustituye a la normal si es mayor). */
  subsidy?: number;
  /** Descuento al comprar en el mostrador de Hank (0,1 = 10 %). */
  hankDiscount?: number;
  /** Aún no existe en el juego: se enseña como "próximamente". */
  soon?: boolean;
}

export interface RankConfig {
  name: string;
  /** XP total necesaria para llegar a este rango. */
  xp: number;
  reward: RankReward | null;
}

/** Decoración que puede comprar el dueño de un negocio, y desde qué nivel del local. */
export interface BusinessDecorOffer {
  defId: BusinessDecorId;
  price: number;
  minLevel: number;
}

/** Un vecino que vende exclusivos: su frase al abrir la ventana y lo que vende. */
export interface Vendor {
  pitch: string;
  items: { defId: VendorItemId; price: number }[];
}

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
    /**
     * Si el dueño no entra a jugar en este tiempo (de pueblo en marcha), pierde
     * el local, aunque pueda pagarlo: así no se quedan locales cogidos para siempre.
     */
    abandonSeconds: 7 * 24 * 60 * 60,
    /** Parte de la fianza que se devuelve al cerrar tú mismo el negocio. */
    closeRefund: 0.5,
  },

  /**
   * Construir un local en un solar del Ensanche (al final de la Calle Mayor):
   * se paga el precio y los materiales, la obra dura unos minutos y el local es
   * de quien lo construye para siempre: no paga alquiler y, si cierra el
   * negocio, el local sigue siendo suyo (abrir otro en él no cuesta fianza).
   */
  building: {
    price: 300,
    materials: { sheet_metal: 20, old_wood: 20 } as Materials,
    seconds: 3 * 60,
    /** Solares libres que hay siempre a la venta (al construir en uno, se abre otro). */
    freeSolares: 2,
  },

  /**
   * Niveles de los locales (1 a 3). Mejorar cuesta dinero y materiales y lleva
   * unos minutos de obras (el negocio sigue abierto mientras tanto). Cada nivel:
   * - Servicios (diner, bar, recreativos, peluquería, frutería): un puesto más,
   *   así que se atiende a un cliente más a la vez (ver services.serveSeconds).
   * - Productores: otro montón, pozo, bancal o algodonal: producen el doble, el triple...
   * - Taller: otro banco: se fabrican más muebles a la vez, y cabe uno más en la cola.
   * - Tienda: más huecos de venta.
   * - Tienda de ropa: otra máquina de coser (como el taller) y más huecos de venta.
   * Además, cuanto más nivel, más coches paran y más viajeros eligen el local.
   * El nivel se pierde al cerrar el negocio, salvo en los locales construidos.
   */
  lotLevels: {
    max: 3,
    /** Lo que cuesta subir a cada nivel: [a nivel 2, a nivel 3]. */
    upgrades: [
      { price: 250, materials: { sheet_metal: 10, old_wood: 10 } as Materials, seconds: 2 * 60 },
      { price: 600, materials: { sheet_metal: 25, old_wood: 25, tires: 10 } as Materials, seconds: 5 * 60 },
    ],
    /** Tienda: huecos de venta de más por cada nivel por encima del 1. */
    storeListingsPerLevel: 2,
    /** Taller: huecos de cola de más por cada nivel por encima del 1. */
    workshopQueuePerLevel: 1,
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
   * Niveles y rangos. La experiencia (XP) solo se gana con cosas que hacen
   * avanzar el pueblo (vender a viajeros, fabricar, encargos...), nunca
   * comprando o vendiendo entre jugadores: así no se puede subir haciendo
   * trampas con dos cuentas. Ver shared/src/levels.ts.
   */
  levels: {
    xp: {
      /** Un viajero te compra o paga tu servicio: 1 XP por cada tantos dólares. */
      saleDollarsPerXp: 10,
      /** Recoger del taller cada mueble fabricado. */
      craft: 5,
      /** Recoger lo producido por una chatarrería, pozo, invernadero o campo de algodón. */
      collect: 2,
      /** Entregar un encargo de Hank. */
      order: 25,
      /** Completar un turno en la gasolinera. */
      shift: 10,
      /** Alquilar un local y abrir un negocio. */
      openBusiness: 30,
      /** Construir un local en un solar. */
      build: 60,
      /** Subir de nivel un local. */
      upgrade: 40,
      /** Entrar a jugar (una vez al día). */
      daily: 5,
    },
    /**
     * Rangos, del primero al último: XP total para llegar y recompensa. Las
     * ventajas se acumulan (al llegar a Empresario sigues teniendo las de los
     * rangos anteriores). `soon` = recompensa que aún no existe en el juego.
     */
    ranks: [
      { name: 'Forastero', xp: 0, reward: null },
      {
        name: 'Recién llegado',
        xp: 50,
        reward: { text: '$50 y un cactus en maceta', money: 50, items: ['potted_cactus'] as FurniId[] },
      },
      { name: 'Vecino', xp: 150, reward: { text: '+1 hueco en la cola del taller', workshopQueue: 1 } },
      {
        name: 'Tendero',
        xp: 350,
        reward: { text: 'Cartel de neón con tu nombre', items: ['name_sign'] as FurniId[] },
      },
      {
        name: 'Comerciante',
        xp: 700,
        reward: { text: 'Subvención diaria de $45', subsidy: 45 },
      },
      { name: 'Empresario', xp: 1200, reward: { text: '+2 huecos de venta en tu tienda', storeListings: 2 } },
      {
        name: 'Cowboy del asfalto',
        xp: 2000,
        reward: { text: 'Sombrero de vaquero y colores nuevos para el avatar', premiumLook: true },
      },
      {
        name: 'Magnate de la carretera',
        xp: 3200,
        reward: { text: '10 % de descuento en el mostrador de Hank', hankDiscount: 0.1 },
      },
      { name: 'Leyenda de la Ruta', xp: 5000, reward: { text: 'Jukebox dorada', items: ['golden_jukebox'] as FurniId[] } },
      {
        name: 'Alcalde de Pixel Springs',
        xp: 8000,
        reward: { text: 'Tu nombre en la estatua del alcalde, en la calle', mayor: true },
      },
    ] as RankConfig[],
  },

  /**
   * Proveedor de materiales (en el mostrador de la gasolinera). Otra forma de
   * conseguir materiales sin tener chatarrería, a cambio de dinero (salida de
   * dinero). También los compra, mucho más baratos (entrada de dinero).
   */
  supplier: {
    name: 'Suministros del Desierto',
    /** Precio de compra base. Cada día cambia con la oferta del día (ver dailyDeal). */
    prices: { sheet_metal: 8, old_wood: 6, tires: 10, water: 4, fruit: 5 } satisfies Partial<Record<MaterialId, number>>,
    /** Máximo de unidades por compra o venta. */
    maxPerPurchase: 20,
    /**
     * Lo que paga el proveedor al comprarte materiales, como parte de su
     * precio de venta del día. Bajo a propósito: los productores fabrican
     * gratis y, si pagara mucho, vender materiales valdría más que abrir tiendas.
     */
    sellRatio: 0.3,
    /** Cada día un material está rebajado y otro más caro (al azar, igual para todos). */
    dailyDeal: { discount: 0.4, markup: 0.4 },
  },

  /** La gasolinera de Hank: encargos, turnos de trabajo, rasca y gana y máquinas. */
  gasStation: {
    /**
     * Encargos: Hank pide muebles y paga más de lo que valen. Los comparte
     * todo el pueblo: el primero que los entrega se lleva la recompensa.
     */
    orders: {
      /** Encargos abiertos a la vez como mucho. */
      max: 3,
      /** Cada cuánto aparece uno nuevo si hay hueco. */
      newEverySeconds: 3 * 60,
      /** Si nadie lo entrega en este tiempo, Hank lo retira. */
      expireSeconds: 24 * 60 * 60,
      /** Recompensa = valor de referencia × cantidad × este multiplicador. */
      rewardMultiplier: 1.4,
      /** Cuántos muebles pide (los de valor 100 o más, siempre de uno en uno). */
      quantity: { min: 1, max: 3 },
    },
    /** Turnos en la caja: quedarse dentro de la gasolinera hasta que acaba. */
    shift: {
      seconds: 2 * 60,
      /** Sueldo por turno completo (unos $40 cada 12 minutos como mucho, con el descanso). */
      wage: 40,
      /** Descanso obligatorio entre un turno y el siguiente. */
      cooldownSeconds: 10 * 60,
      /** Propina por cada coche que reposta mientras trabajas. */
      tipPerCar: 5,
    },
    /** Rasca y gana: casi siempre pierdes (es una salida de dinero), a veces no. */
    scratch: {
      price: 10,
      maxPerDay: 5,
      /** Premios y su peso (probabilidad relativa). Premio medio ≈ $7,4. */
      prizes: [
        { amount: 0, weight: 65 },
        { amount: 5, weight: 18 },
        { amount: 15, weight: 10 },
        { amount: 40, weight: 5 },
        { amount: 150, weight: 2 },
      ],
    },
    /** Máquina de refrescos: el avatar lleva la lata en la mano un rato. */
    soda: { price: 3, seconds: 60 },
    /** Máquina recreativa: una partida por un dólar. */
    pinball: { price: 1 },
    /** Coches de paso que paran a repostar delante de la gasolinera. */
    refuel: { chance: 0.3, seconds: 5 },
    /** Autobús de turistas: de vez en cuando bajan varios viajeros a la vez. */
    bus: {
      everySeconds: { min: 20 * 60, max: 40 * 60 },
      passengers: { min: 4, max: 6 },
    },
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
    /**
     * Talleres públicos: otros jugadores pueden fabricar en tu taller (con sus
     * materiales) y te pagan, por cada mueble, esta parte de su valor de
     * referencia (como poco, $1). Con 0,07, unos $5 de media: un neumático
     * $1, una jukebox $11. El dueño decide si su taller es público o privado
     * (los nuevos empiezan públicos).
     */
    feeRate: 0.07,
  },

  services: {
    /** Máximo de cada material que cabe en el almacén de un negocio de servicios. */
    stockCap: 20,
    minPrice: 1,
    maxPrice: 999,
    /**
     * Segundos que tarda en atenderse a un cliente. Cada puesto atiende a uno a
     * la vez: si están todos ocupados, el viajero espera su turno.
     */
    serveSeconds: 12,
    /** Veces que un viajero vuelve a mirar si hay un puesto libre antes de irse (unos 2-3 s cada vez). */
    queuePatience: 8,
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

  /**
   * Vecinos que venden muebles EXCLUSIVOS (no se fabrican ni se venden en las
   * tiendas). Se les compra en persona: tocando al vecino, estando cerca. Es
   * una salida de dinero: los precios están por encima de los muebles normales.
   */
  vendors: {
    'npc-dolores': {
      pitch: 'Cosas de mi casa que ya no caben. ¡Están como nuevas!',
      items: [
        { defId: 'pink_flamingo', price: 150 },
        { defId: 'lava_lamp', price: 240 },
      ],
    },
    'npc-tito': {
      pitch: 'Esto lo rescaté de la Ruta cuando era joven. Ya no se hace.',
      items: [
        { defId: 'wagon_wheel', price: 180 },
        { defId: 'gas_pump', price: 360 },
      ],
    },
    'npc-nina': {
      pitch: 'Lo hago yo misma en el garaje. ¡No lo vas a ver en otro sitio!',
      items: [
        { defId: 'neon_cactus', price: 220 },
        { defId: 'retro_tv', price: 280 },
      ],
    },
  } as Record<string, Vendor>,

  /**
   * Decoración propia de cada negocio: solo la compra el dueño de ese tipo de
   * negocio, desde su ventana, y la de más nivel pide el local mejorado. Va
   * al inventario y se coloca como cualquier mueble (exclusiva: no se fabrica
   * ni se vende en las tiendas). Es una salida de dinero.
   */
  businessDecor: {
    scrapyard: [
      { defId: 'oil_drum', price: 40, minLevel: 1 },
      { defId: 'engine_block', price: 90, minLevel: 2 },
      { defId: 'scrap_robot', price: 160, minLevel: 3 },
    ],
    well: [
      { defId: 'water_bucket', price: 40, minLevel: 1 },
      { defId: 'hand_pump', price: 90, minLevel: 2 },
      { defId: 'windmill', price: 160, minLevel: 3 },
    ],
    greenhouse: [
      { defId: 'seed_sacks', price: 40, minLevel: 1 },
      { defId: 'flower_box', price: 90, minLevel: 2 },
      { defId: 'scarecrow', price: 160, minLevel: 3 },
    ],
    workshop: [
      { defId: 'toolbox', price: 40, minLevel: 1 },
      { defId: 'sawhorse', price: 90, minLevel: 2 },
      { defId: 'tool_rack', price: 160, minLevel: 3 },
    ],
    store: [
      { defId: 'cash_register', price: 40, minLevel: 1 },
      { defId: 'gift_boxes', price: 90, minLevel: 2 },
      { defId: 'mannequin', price: 160, minLevel: 3 },
    ],
    diner: [
      { defId: 'menu_board', price: 40, minLevel: 1 },
      { defId: 'pie_stand', price: 90, minLevel: 2 },
      { defId: 'neon_burger', price: 160, minLevel: 3 },
    ],
    barber: [
      { defId: 'barber_pole', price: 40, minLevel: 1 },
      { defId: 'standing_mirror', price: 90, minLevel: 2 },
      { defId: 'hair_dryer', price: 160, minLevel: 3 },
    ],
    greengrocer: [
      { defId: 'orange_crate', price: 40, minLevel: 1 },
      { defId: 'watermelons', price: 90, minLevel: 2 },
      { defId: 'old_scale', price: 160, minLevel: 3 },
    ],
    cotton_field: [
      { defId: 'cotton_basket', price: 40, minLevel: 1 },
      { defId: 'cotton_bales', price: 90, minLevel: 2 },
      { defId: 'spinning_wheel', price: 160, minLevel: 3 },
    ],
    clothing: [
      { defId: 'fabric_rolls', price: 40, minLevel: 1 },
      { defId: 'dress_form', price: 90, minLevel: 2 },
      { defId: 'neon_hanger', price: 160, minLevel: 3 },
    ],
    bar: [
      { defId: 'bottle_crate', price: 40, minLevel: 1 },
      { defId: 'bottle_shelf', price: 90, minLevel: 2 },
      { defId: 'neon_cocktail', price: 160, minLevel: 3 },
    ],
    arcade: [
      { defId: 'token_jar', price: 40, minLevel: 1 },
      { defId: 'prize_case', price: 90, minLevel: 2 },
      { defId: 'neon_joystick', price: 160, minLevel: 3 },
    ],
  } as Record<BusinessType, BusinessDecorOffer[]>,

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
    cow_skull: { materials: { old_wood: 1 }, seconds: 10 },
    rocking_chair: { materials: { old_wood: 3 }, seconds: 25 },
    radio: { materials: { sheet_metal: 1, old_wood: 2 }, seconds: 30 },
    open_sign: { materials: { sheet_metal: 2 }, seconds: 30 },
    sofa: { materials: { old_wood: 2, tires: 2 }, seconds: 35 },
    bed: { materials: { old_wood: 3, sheet_metal: 1 }, seconds: 35 },
    milkshake_machine: { materials: { sheet_metal: 3 }, seconds: 35 },
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
