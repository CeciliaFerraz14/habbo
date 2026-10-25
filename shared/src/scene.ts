// =============================================================================
//  SISTEMA DE ESCENAS
// =============================================================================
//
// El mundo de Pixel Springs está dividido en ESCENAS: la calle, la caravana
// del jugador, el interior de cada local... Cada escena es una cuadrícula
// isométrica independiente, con su tamaño, sus muebles y sus avatares.
//
// - Cada avatar, mueble y mensaje de chat lleva un `sceneId` que dice dónde está.
// - El renderer solo dibuja la escena en la que está el jugador, pero la
//   simulación avanza en TODAS a la vez (una tienda puede vender aunque no
//   haya nadie mirando).
//
// Las escenas se conectan con PUERTAS. Una puerta es una baldosa especial:
//
//   Calle                                    Caravana (interior)
//   ┌──────────────────┐                     ┌─────────────┐
//   │      [caravana]  │                     │▓ puerta     │
//   │        (D)       │  ── to ──────────▶  │(D) S        │
//   │         S        │  ◀───────── to ──   │             │
//   └──────────────────┘                     └─────────────┘
//   D = baldosa de la puerta    S = baldosa donde apareces al llegar (spawn)
//
// Si un avatar TERMINA su camino sobre una puerta, pasa a la escena destino y
// aparece en el `spawn` de la puerta enlazada. El spawn está al lado de la
// puerta (no encima), para no volver a cruzarla sin querer.
// =============================================================================

import type { TilePoint } from './types';

/**
 * Tipo de escena:
 * - 'street': exterior, suelo de arena y sin paredes.
 * - 'interior': habitación con dos paredes al fondo, como la sala original.
 */
export type SceneKind = 'street' | 'interior';

/** A qué puerta de qué escena lleva una puerta. */
export interface DoorLink {
  sceneId: string;
  doorId: string;
}

export interface Door {
  id: string;
  /** Baldosa de la puerta: llegar hasta aquí te lleva a la otra escena. */
  x: number;
  y: number;
  /** Baldosa donde aparece quien LLEGA a esta escena por esta puerta. */
  spawn: TilePoint;
  to: DoorLink;
  /** Edificio (mueble fijo) al que pertenece la puerta: clicar el edificio lleva a ella. */
  buildingId?: string;
  /** Local al que da acceso. Mientras el local no esté alquilado, la puerta está cerrada. */
  lotId?: string;
}

/**
 * Tipos de suelo de una escena exterior, uno por carácter del mapa `ground`:
 *   '.' arena   's' acera   'r' asfalto   '-' asfalto con línea central
 */
export type GroundChar = '.' | 's' | 'r' | '-';

export type InteriorTheme = 'adobe' | 'trailer';

export interface Scene {
  id: string;
  name: string;
  kind: SceneKind;
  /** Número de baldosas en el eje X. */
  width: number;
  /** Número de baldosas en el eje Y. */
  depth: number;
  doors: Door[];
  /**
   * Estilo de un interior: 'adobe' (paredes de adobe y barro cocido, el de los
   * locales) o 'trailer' (madera y suelo de damero, el de la caravana).
   */
  theme?: InteriorTheme;
  /**
   * Mapa del suelo (solo exteriores): una string por fila (y) y un carácter
   * por baldosa (x). Es el mismo truco que los sprites de matriz.
   */
  ground?: string[];
}

/** ¿La baldosa (x, y) está dentro de la escena? */
export function isInsideScene(scene: Scene, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < scene.width && y < scene.depth;
}

/** Puerta que hay en la baldosa (x, y), si la hay. */
export function getDoorAt(scene: Scene, x: number, y: number): Door | undefined {
  return scene.doors.find((d) => d.x === x && d.y === y);
}
