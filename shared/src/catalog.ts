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
  // Puestos de trabajo de los negocios (dentro de los locales)
  | 'scrap_pile'
  | 'workbench'
  | 'shop_counter'
  | 'water_well'
  | 'fruit_planter'
  | 'diner_grill'
  | 'barber_chair'
  | 'fruit_stand'
  // Gasolinera (interior)
  | 'gas_counter'
  | 'minimart_shelf'
  | 'soda_machine'
  | 'arcade_cabinet'
  | 'notice_board'
  // Vehículos (no se colocan como muebles, pero se dibujan igual)
  | 'car'
  | 'bus';

export type FurniId = DecorId | StructureId;

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
  scrap_pile: structure('scrap_pile', 'Montón de chatarra', 2, 2),
  workbench: structure('workbench', 'Banco de trabajo', 1, 2),
  shop_counter: structure('shop_counter', 'Mostrador', 1, 2),
  water_well: structure('water_well', 'Pozo', 2, 2),
  fruit_planter: structure('fruit_planter', 'Bancal', 2, 2),
  diner_grill: structure('diner_grill', 'Plancha', 1, 2),
  barber_chair: structure('barber_chair', 'Sillón de barbero', 1, 2),
  fruit_stand: structure('fruit_stand', 'Puesto de fruta', 1, 2),
  gas_counter: structure('gas_counter', 'Mostrador de Hank', 1, 2),
  minimart_shelf: structure('minimart_shelf', 'Estantería', 1, 2),
  soda_machine: structure('soda_machine', 'Máquina de refrescos', 1, 1),
  arcade_cabinet: structure('arcade_cabinet', 'Máquina recreativa', 1, 1),
  notice_board: structure('notice_board', 'Tablón de anuncios', 1, 1),
  car: structure('car', 'Coche', 2, 1),
  bus: structure('bus', 'Autobús', 3, 1),
};

/** Muebles que se pueden tener (excluye las estructuras fijas). */
export const DECOR_IDS = (Object.keys(CATALOG) as FurniId[]).filter(
  (id): id is DecorId => !CATALOG[id].fixed,
);
