// Ids de las escenas fijas del mundo. Están en un archivo aparte (y no en
// world.ts) para que cualquier módulo pueda usarlos sin importaciones circulares.
export const SCENES = {
  street: 'street',
  /**
   * Alias de "la caravana de cada uno": no existe ninguna escena con este id.
   * Cada jugador tiene la suya, `trailer:<id>` (ver trailerSceneId). Una
   * puerta que lleva a 'trailer', o un JOIN en 'trailer', se resuelven a la
   * caravana del avatar que la cruza.
   */
  trailer: 'trailer',
} as const;

/** Id de la escena de la caravana de un jugador. */
export function trailerSceneId(ownerId: string): string {
  return `${SCENES.trailer}:${ownerId}`;
}
