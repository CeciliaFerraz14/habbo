// Registro de modelos: relaciona cada mueble (y cada estructura de la calle)
// del catálogo con su dibujo.
import type { FurniId } from '@juego/shared';
import { gasStation } from '../structures/gasStation';
import { saguaro } from '../structures/saguaro';
import { shop } from '../structures/shop';
import { streetLamp } from '../structures/streetLamp';
import { trailer } from '../structures/trailer';
import { welcomeSign } from '../structures/welcomeSign';
import { bed } from './bed';
import { chair } from './chair';
import { lamp } from './lamp';
import type { ModelSource } from './model';
import { plant } from './plant';
import { rug } from './rug';
import { shelf } from './shelf';
import { sofa } from './sofa';
import { table } from './table';

export const MODELS: Record<FurniId, ModelSource> = {
  sofa,
  chair,
  table,
  lamp,
  plant,
  bed,
  rug,
  shelf,
  // Estructuras de la calle
  shop,
  trailer,
  gas_station: gasStation,
  street_lamp: streetLamp,
  saguaro,
  welcome_sign: welcomeSign,
};
