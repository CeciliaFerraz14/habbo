// Registro de modelos: relaciona cada mueble (y cada estructura de la calle)
// del catálogo con su dibujo.
import type { FurniId } from '@juego/shared';
import { gasStation } from '../structures/gasStation';
import { saguaro } from '../structures/saguaro';
import { scrapPile } from '../structures/scrapPile';
import { shop } from '../structures/shop';
import { streetLamp } from '../structures/streetLamp';
import { trailer } from '../structures/trailer';
import { welcomeSign } from '../structures/welcomeSign';
import { workbench } from '../structures/workbench';
import { barStool } from './barStool';
import { dinerBooth } from './dinerBooth';
import { formicaTable } from './formicaTable';
import { jukebox } from './jukebox';
import type { ModelSource } from './model';
import { neonLamp } from './neonLamp';
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
};
