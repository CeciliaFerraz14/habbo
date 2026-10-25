// Registro de modelos: relaciona cada mueble del catálogo con su dibujo.
import type { FurniId } from '@juego/shared';
import { bed } from './bed';
import { chair } from './chair';
import { lamp } from './lamp';
import type { FurniModel } from './model';
import { plant } from './plant';
import { rug } from './rug';
import { shelf } from './shelf';
import { sofa } from './sofa';
import { table } from './table';

export const MODELS: Record<FurniId, FurniModel> = {
  sofa,
  chair,
  table,
  lamp,
  plant,
  bed,
  rug,
  shelf,
};
