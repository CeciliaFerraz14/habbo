// Ids de las escenas fijas del mundo. Están en un archivo aparte (y no en
// world.ts) para que cualquier módulo pueda usarlos sin importaciones circulares.
export const SCENES = {
  street: 'street',
  trailer: 'trailer',
} as const;
