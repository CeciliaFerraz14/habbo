// Constantes compartidas entre cliente y servidor.

/** Nombre del juego. Cambiarlo aquí lo cambia en toda la interfaz. */
export const GAME_NAME = 'Pixel Springs';

/**
 * Milisegundos que dura un turno de simulación (tick). En cada tick la
 * economía da un paso y los avatares avanzan WALK_STEPS_PER_TICK baldosas.
 * (No se cambia a la ligera: los tiempos guardados están en ticks.)
 */
export const MOVE_TICK_MS = 400;

/** Baldosas que anda un avatar en cada tick (la velocidad de caminar). */
export const WALK_STEPS_PER_TICK = 2;
