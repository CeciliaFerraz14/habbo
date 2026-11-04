// Registro de modelos: relaciona cada mueble (y cada estructura de la calle)
// del catálogo con su dibujo.
import type { FurniId } from '@juego/shared';
import { barTap } from '../structures/barTap';
import { barberChair } from '../structures/barberChair';
import { car } from '../structures/car';
import { clothesRack } from '../structures/clothesRack';
import { cottonBed } from '../structures/cottonBed';
import { dinerGrill } from '../structures/dinerGrill';
import { fruitPlanter } from '../structures/fruitPlanter';
import { fruitStand } from '../structures/fruitStand';
import { gasStation } from '../structures/gasStation';
import { plotSign } from '../structures/plotSign';
import { saguaro } from '../structures/saguaro';
import { scrapPile } from '../structures/scrapPile';
import { sewingMachine } from '../structures/sewingMachine';
import { shop } from '../structures/shop';
import { shopCounter } from '../structures/shopCounter';
import { streetLamp } from '../structures/streetLamp';
import { tokenMachine } from '../structures/tokenMachine';
import { trailer } from '../structures/trailer';
import { waterWell } from '../structures/waterWell';
import { welcomeSign } from '../structures/welcomeSign';
import { workbench } from '../structures/workbench';
import { arcadeMachine } from './arcadeMachine';
import { barCounter } from './barCounter';
import { barStool } from './barStool';
import { beerBarrel } from './beerBarrel';
import { dartboard } from './dartboard';
import { dinerBooth } from './dinerBooth';
import { formicaTable } from './formicaTable';
import { jukebox } from './jukebox';
import type { ModelSource } from './model';
import { neonLamp } from './neonLamp';
import { pinball } from './pinball';
import { pottedCactus } from './pottedCactus';
import { roadSign } from './roadSign';
import { tire } from './tire';
import { vintageFridge } from './vintageFridge';

export const MODELS: Record<FurniId, ModelSource> = {
  // Muebles
  diner_booth: dinerBooth,
  bar_stool: barStool,
  formica_table: formicaTable,
  jukebox,
  neon_lamp: neonLamp,
  potted_cactus: pottedCactus,
  road_sign: roadSign,
  tire,
  vintage_fridge: vintageFridge,
  bar_counter: barCounter,
  beer_barrel: beerBarrel,
  dartboard,
  arcade_machine: arcadeMachine,
  pinball,
  // Estructuras de la calle
  shop,
  trailer,
  gas_station: gasStation,
  street_lamp: streetLamp,
  saguaro,
  welcome_sign: welcomeSign,
  plot_sign: plotSign,
  // Puestos de trabajo de los negocios
  scrap_pile: scrapPile,
  workbench,
  shop_counter: shopCounter,
  water_well: waterWell,
  fruit_planter: fruitPlanter,
  diner_grill: dinerGrill,
  barber_chair: barberChair,
  fruit_stand: fruitStand,
  cotton_bed: cottonBed,
  bar_tap: barTap,
  token_machine: tokenMachine,
  sewing_machine: sewingMachine,
  // Expositor de la tienda de ropa
  clothes_rack: clothesRack,
  car,
};
