// Registro de modelos: relaciona cada mueble (y cada estructura de la calle)
// del catálogo con su dibujo.
import type { FurniId } from '@juego/shared';
import { barberChair } from '../structures/barberChair';
import { car } from '../structures/car';
import { dinerGrill } from '../structures/dinerGrill';
import { fruitPlanter } from '../structures/fruitPlanter';
import { fruitStand } from '../structures/fruitStand';
import { gasStation } from '../structures/gasStation';
import { saguaro } from '../structures/saguaro';
import { scrapPile } from '../structures/scrapPile';
import { shop } from '../structures/shop';
import { shopCounter } from '../structures/shopCounter';
import { streetLamp } from '../structures/streetLamp';
import { trailer } from '../structures/trailer';
import { waterWell } from '../structures/waterWell';
import { welcomeSign } from '../structures/welcomeSign';
import { workbench } from '../structures/workbench';
import { barStool } from './barStool';
import { bed } from './bed';
import { cowSkull } from './cowSkull';
import { dinerBooth } from './dinerBooth';
import { formicaTable } from './formicaTable';
import { jukebox } from './jukebox';
import { milkshakeMachine } from './milkshakeMachine';
import type { ModelSource } from './model';
import { neonLamp } from './neonLamp';
import { openSign } from './openSign';
import { pottedCactus } from './pottedCactus';
import { radio } from './radio';
import { roadSign } from './roadSign';
import { rockingChair } from './rockingChair';
import { sofa } from './sofa';
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
  bed,
  sofa,
  radio,
  rocking_chair: rockingChair,
  open_sign: openSign,
  milkshake_machine: milkshakeMachine,
  cow_skull: cowSkull,
  // Estructuras de la calle
  shop,
  trailer,
  gas_station: gasStation,
  street_lamp: streetLamp,
  saguaro,
  welcome_sign: welcomeSign,
  // Puestos de trabajo de los negocios
  scrap_pile: scrapPile,
  workbench,
  shop_counter: shopCounter,
  water_well: waterWell,
  fruit_planter: fruitPlanter,
  diner_grill: dinerGrill,
  barber_chair: barberChair,
  fruit_stand: fruitStand,
  car,
};
