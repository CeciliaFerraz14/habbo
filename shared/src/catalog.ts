// Catálogo de muebles: qué muebles existen y cómo se comportan.
// Aquí NO hay nada de dibujo: el aspecto está en client/src/sprites/furniture.
import type { Direction } from './types';

/** Muebles que los jugadores pueden tener, colocar y vender (estética de carretera). */
export type DecorId =
  | 'diner_booth'
  | 'bar_stool'
  | 'formica_table'
  | 'jukebox'
  | 'neon_lamp'
  | 'potted_cactus'
  | 'road_sign'
  | 'tire'
  | 'vintage_fridge'
  | 'bar_counter'
  | 'beer_barrel'
  | 'dartboard'
  | 'arcade_machine'
  | 'pinball'
  // Hogar
  | 'bed'
  | 'sofa'
  | 'radio'
  | 'rocking_chair'
  // Diner y desierto
  | 'open_sign'
  | 'milkshake_machine'
  | 'cow_skull';

/**
 * Estructuras FIJAS del escenario (edificios, farolas...). Se dibujan, ordenan
 * y bloquean el paso exactamente igual que los muebles, pero nadie puede
 * moverlas, recogerlas ni comprarlas.
 */
export type StructureId =
  | 'shop'
  | 'trailer'
  | 'gas_station'
  | 'street_lamp'
  | 'saguaro'
  | 'welcome_sign'
  | 'solar'
  // Puestos de trabajo de los negocios (dentro de los locales)
  | 'scrap_pile'
  | 'workbench'
  | 'shop_counter'
  | 'water_well'
  | 'fruit_planter'
  | 'diner_grill'
  | 'barber_chair'
  | 'fruit_stand'
  | 'cotton_bed'
  | 'bar_tap'
  | 'token_machine'
  | 'sewing_machine'
  // Expositor de una prenda a la venta en la tienda de ropa (ver FurniItem.garment)
  | 'clothes_rack'
  // Gasolinera (interior)
  | 'gas_counter'
  | 'minimart_shelf'
  | 'soda_machine'
  | 'arcade_cabinet'
  | 'notice_board'
  // Vehículos (no se colocan como muebles, pero se dibujan igual)
  | 'car'
  | 'bus'
  // Estatua del alcalde (aparece en la calle con el primer jugador de nivel 10)
  | 'mayor_statue'
  // Plazas
  | 'fountain'
  | 'park_bench';

/**
 * Muebles EXCLUSIVOS: solo se consiguen como recompensa de rango,
 * comprándoselos a los vecinos del pueblo (ver vendors.ts) o, la decoración
 * de cada negocio, desde la ventana de tu negocio (ECONOMY.businessDecor). Se
 * colocan como cualquier mueble, pero no se fabrican, no se venden en tiendas
 * y Hank no los pide.
 */
export type ExclusiveId = 'name_sign' | 'golden_jukebox' | VendorItemId | BusinessDecorId;

/** Decoración propia de cada negocio (ver ECONOMY.businessDecor). */
export type BusinessDecorId =
  // Chatarrería
  | 'oil_drum'
  | 'engine_block'
  | 'scrap_robot'
  // Pozo
  | 'water_bucket'
  | 'hand_pump'
  | 'windmill'
  // Invernadero
  | 'seed_sacks'
  | 'flower_box'
  | 'scarecrow'
  // Taller
  | 'toolbox'
  | 'sawhorse'
  | 'tool_rack'
  // Tienda
  | 'cash_register'
  | 'gift_boxes'
  | 'mannequin'
  // Diner
  | 'menu_board'
  | 'pie_stand'
  | 'neon_burger'
  // Peluquería
  | 'barber_pole'
  | 'standing_mirror'
  | 'hair_dryer'
  // Frutería
  | 'orange_crate'
  | 'watermelons'
  | 'old_scale';

/** Exclusivos que venden los vecinos (ver ECONOMY.vendors). */
export type VendorItemId =
  | 'pink_flamingo'
  | 'lava_lamp'
  | 'wagon_wheel'
  | 'gas_pump'
  | 'neon_cactus'
  | 'retro_tv';

export type FurniId = DecorId | ExclusiveId | StructureId;

/**
 * Rotación de un mueble: 0, 1, 2 o 3 cuartos de vuelta.
 * En la rotación 0 el mueble mira hacia SE (+x): su parte de atrás (respaldo,
 * cabecero...) está en el lado de x pequeña.
 */
export type Rotation = 0 | 1 | 2 | 3;

/** Hacia dónde mira el mueble en cada rotación (y hacia dónde mira quien se sienta). */
export const ROTATION_DIRECTION: Record<Rotation, Direction> = {
  0: 'SE',
  1: 'SW',
  2: 'NW',
  3: 'NE',
};

export interface FurniDef {
  id: FurniId;
  name: string;
  /** Baldosas que ocupa en el eje X con rotación 0. */
  width: number;
  /** Baldosas que ocupa en el eje Y con rotación 0. */
  depth: number;
  /** ¿Se puede sentar un avatar en él? */
  sittable: boolean;
  /** ¿Se puede caminar por encima? (alfombras) */
  walkable: boolean;
  /** Estructura fija del escenario: no se puede mover, recoger ni comprar. */
  fixed?: true;
  /** Exclusivo: no se fabrica ni se vende en las tiendas (ver ExclusiveId). */
  exclusive?: true;
}

/** Atajo para definir muebles normales. */
function decor(
  id: DecorId,
  name: string,
  width: number,
  depth: number,
  sittable = false,
): FurniDef {
  return { id, name, width, depth, sittable, walkable: false };
}

/** Atajo para definir los exclusivos que venden los vecinos. */
function vendorItem(id: VendorItemId, name: string): FurniDef {
  return { id, name, width: 1, depth: 1, sittable: false, walkable: false, exclusive: true };
}

/** Atajo para definir la decoración de los negocios (sentable o no). */
function businessDecor(id: BusinessDecorId, name: string, sittable = false): FurniDef {
  return { id, name, width: 1, depth: 1, sittable, walkable: false, exclusive: true };
}

/** Atajo para definir estructuras fijas (no sentables ni pisables). */
function structure(id: StructureId, name: string, width: number, depth: number): FurniDef {
  return { id, name, width, depth, sittable: false, walkable: false, fixed: true };
}

export const CATALOG: Record<FurniId, FurniDef> = {
  diner_booth: decor('diner_booth', 'Sillón de diner', 1, 2, true),
  bar_stool: decor('bar_stool', 'Taburete de barra', 1, 1, true),
  formica_table: decor('formica_table', 'Mesa de formica', 1, 1),
  jukebox: decor('jukebox', 'Máquina de discos', 1, 1),
  neon_lamp: decor('neon_lamp', 'Lámpara de neón', 1, 1),
  potted_cactus: decor('potted_cactus', 'Cactus en maceta', 1, 1),
  road_sign: decor('road_sign', 'Señal de tráfico', 1, 1),
  tire: decor('tire', 'Neumático', 1, 1),
  vintage_fridge: decor('vintage_fridge', 'Nevera vintage', 1, 1),
  bar_counter: decor('bar_counter', 'Barra de bar', 1, 2),
  beer_barrel: decor('beer_barrel', 'Barril', 1, 1),
  dartboard: decor('dartboard', 'Diana', 1, 1),
  arcade_machine: decor('arcade_machine', 'Máquina recreativa', 1, 1),
  pinball: decor('pinball', 'Pinball', 1, 2),
  bed: decor('bed', 'Cama', 1, 2, true),
  sofa: decor('sofa', 'Sofá', 1, 2, true),
  radio: decor('radio', 'Radio antigua', 1, 1),
  rocking_chair: decor('rocking_chair', 'Mecedora', 1, 1, true),
  open_sign: decor('open_sign', 'Cartel de neón OPEN', 1, 1),
  milkshake_machine: decor('milkshake_machine', 'Máquina de batidos', 1, 1),
  cow_skull: decor('cow_skull', 'Calavera de vaca', 1, 1),

  // Estructuras de la calle. Como todo mueble, en rotación 0 miran a +x; en la
  // calle se colocan con rotación 1 para que su fachada mire a la carretera (+y).
  shop: structure('shop', 'Local', 4, 4),
  trailer: structure('trailer', 'Caravana', 3, 5),
  gas_station: structure('gas_station', 'Gasolinera', 4, 5),
  street_lamp: structure('street_lamp', 'Farola', 1, 1),
  saguaro: structure('saguaro', 'Cactus', 1, 1),
  welcome_sign: structure('welcome_sign', 'Cartel de bienvenida', 1, 2),
  solar: structure('solar', 'Solar en venta', 4, 4),
  scrap_pile: structure('scrap_pile', 'Montón de chatarra', 2, 2),
  workbench: structure('workbench', 'Banco de trabajo', 1, 2),
  shop_counter: structure('shop_counter', 'Mostrador', 1, 2),
  water_well: structure('water_well', 'Pozo', 2, 2),
  fruit_planter: structure('fruit_planter', 'Bancal', 2, 2),
  diner_grill: structure('diner_grill', 'Plancha', 1, 2),
  barber_chair: structure('barber_chair', 'Sillón de barbero', 1, 2),
  fruit_stand: structure('fruit_stand', 'Puesto de fruta', 1, 2),
  cotton_bed: structure('cotton_bed', 'Algodonal', 2, 2),
  bar_tap: structure('bar_tap', 'Barra con grifo', 1, 2),
  token_machine: structure('token_machine', 'Cambio de fichas', 1, 2),
  sewing_machine: structure('sewing_machine', 'Máquina de coser', 1, 2),
  clothes_rack: structure('clothes_rack', 'Burro de ropa', 1, 1),
  gas_counter: structure('gas_counter', 'Mostrador de Hank', 1, 2),
  minimart_shelf: structure('minimart_shelf', 'Estantería', 1, 2),
  soda_machine: structure('soda_machine', 'Máquina de refrescos', 1, 1),
  arcade_cabinet: structure('arcade_cabinet', 'Máquina recreativa', 1, 1),
  notice_board: structure('notice_board', 'Tablón de anuncios', 1, 1),
  // Exclusivos (recompensas de rango)
  name_sign: { id: 'name_sign', name: 'Cartel de neón con tu nombre', width: 1, depth: 1, sittable: false, walkable: false, exclusive: true },
  golden_jukebox: { id: 'golden_jukebox', name: 'Jukebox dorada', width: 1, depth: 1, sittable: false, walkable: false, exclusive: true },
  // Exclusivos de los vecinos
  pink_flamingo: vendorItem('pink_flamingo', 'Flamenco rosa'),
  lava_lamp: vendorItem('lava_lamp', 'Lámpara de lava'),
  wagon_wheel: vendorItem('wagon_wheel', 'Rueda de carreta'),
  gas_pump: vendorItem('gas_pump', 'Surtidor antiguo'),
  neon_cactus: vendorItem('neon_cactus', 'Cactus de neón'),
  retro_tv: vendorItem('retro_tv', 'Televisor retro'),
  // Decoración de cada negocio
  oil_drum: businessDecor('oil_drum', 'Bidón de aceite'),
  engine_block: businessDecor('engine_block', 'Motor viejo'),
  scrap_robot: businessDecor('scrap_robot', 'Robot de chatarra'),
  water_bucket: businessDecor('water_bucket', 'Cubo de agua'),
  hand_pump: businessDecor('hand_pump', 'Bomba de mano'),
  windmill: businessDecor('windmill', 'Molino de viento'),
  seed_sacks: businessDecor('seed_sacks', 'Sacos de semillas'),
  flower_box: businessDecor('flower_box', 'Jardinera de flores'),
  scarecrow: businessDecor('scarecrow', 'Espantapájaros'),
  toolbox: businessDecor('toolbox', 'Caja de herramientas'),
  sawhorse: businessDecor('sawhorse', 'Caballete', true),
  tool_rack: businessDecor('tool_rack', 'Panel de herramientas'),
  cash_register: businessDecor('cash_register', 'Caja registradora'),
  gift_boxes: businessDecor('gift_boxes', 'Pila de regalos'),
  mannequin: businessDecor('mannequin', 'Maniquí'),
  menu_board: businessDecor('menu_board', 'Pizarra del menú'),
  pie_stand: businessDecor('pie_stand', 'Vitrina de tartas'),
  neon_burger: businessDecor('neon_burger', 'Hamburguesa de neón'),
  barber_pole: businessDecor('barber_pole', 'Poste de barbero'),
  standing_mirror: businessDecor('standing_mirror', 'Espejo de pie'),
  hair_dryer: businessDecor('hair_dryer', 'Secador de casco', true),
  orange_crate: businessDecor('orange_crate', 'Caja de naranjas'),
  watermelons: businessDecor('watermelons', 'Montón de sandías'),
  old_scale: businessDecor('old_scale', 'Báscula antigua'),
  mayor_statue: structure('mayor_statue', 'Estatua del alcalde', 2, 2),
  fountain: structure('fountain', 'Fuente', 2, 2),
  // Banco de la plaza: fijo, pero se puede uno sentar.
  park_bench: { id: 'park_bench', name: 'Banco', width: 1, depth: 2, sittable: true, walkable: false, fixed: true },
  car: structure('car', 'Coche', 2, 1),
  bus: structure('bus', 'Autobús', 3, 1),
};

/** Muebles que se pueden tener (excluye las estructuras fijas). */
export const DECOR_IDS = (Object.keys(CATALOG) as FurniId[]).filter(
  (id): id is DecorId => !CATALOG[id].fixed && !CATALOG[id].exclusive,
);
