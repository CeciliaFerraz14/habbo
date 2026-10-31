// =============================================================================
//  SINCRONIZACIÓN SERVIDOR → CLIENTES
// =============================================================================
//
// El servidor tiene el estado "de verdad" y los clientes una copia. Mandar el
// estado ENTERO 20 veces por segundo sería un desperdicio: casi nada cambia de
// un instante a otro. Así que mandamos solo un PARCHE con lo que ha cambiado.
//
// ¿Cómo sabemos qué ha cambiado sin recorrer todo el estado? Gracias a que el
// estado es INMUTABLE: el reducer nunca modifica un objeto, crea uno nuevo.
// Así que si un avatar es el mismo objeto (===) que antes, no ha cambiado.
// Comparar referencias es instantáneo, aunque el objeto sea enorme.
//
// El parche tiene dos partes:
// - Colecciones (avatares, muebles, locales...): qué entradas se han añadido o
//   cambiado (`set`) y cuáles se han borrado (`del`).
// - Valores sueltos (tick, mensajes del chat...): el valor nuevo entero.
// =============================================================================

import type { GameState } from './types';

/** Partes del estado que son colecciones (objetos id → valor). */
const RECORD_KEYS = [
  'scenes',
  'avatars',
  'furniture',
  'inventories',
  'lots',
  'money',
  'materials',
  'subsidies',
  'gasPlayers',
  'progress',
  'vehicles',
] as const;

/** Partes del estado que se mandan enteras si cambian. */
const VALUE_KEYS = [
  'messages',
  'notices',
  'tick',
  'nextCarAt',
  'nextId',
  'orders',
  'pinballRecord',
] as const;

// No se sincronizan: los "cerebros" de los NPC, la semilla del azar y cuándo
// llegará el próximo encargo o autobús solo los necesita el servidor, que es
// quien simula.

type RecordKey = (typeof RECORD_KEYS)[number];
type ValueKey = (typeof VALUE_KEYS)[number];

export interface StatePatch {
  set: Partial<Record<RecordKey, Record<string, unknown>>>;
  del: Partial<Record<RecordKey, string[]>>;
  values: Partial<Pick<GameState, ValueKey>>;
}

/** Parche para pasar de `prev` a `next`, o null si no hay nada que mandar. */
export function diffState(prev: GameState, next: GameState): StatePatch | null {
  const patch: StatePatch = { set: {}, del: {}, values: {} };
  let empty = true;

  for (const key of RECORD_KEYS) {
    const before = prev[key] as Record<string, unknown>;
    const after = next[key] as Record<string, unknown>;
    if (before === after) continue; // la colección entera no ha cambiado

    const set: Record<string, unknown> = {};
    const del: string[] = [];
    for (const id in after) {
      if (after[id] !== before[id]) set[id] = after[id];
    }
    for (const id in before) {
      if (!(id in after)) del.push(id);
    }
    if (Object.keys(set).length > 0) {
      patch.set[key] = set;
      empty = false;
    }
    if (del.length > 0) {
      patch.del[key] = del;
      empty = false;
    }
  }

  for (const key of VALUE_KEYS) {
    if (prev[key] !== next[key]) {
      (patch.values as Record<string, unknown>)[key] = next[key];
      empty = false;
    }
  }
  return empty ? null : patch;
}

/** Aplica un parche y devuelve el estado nuevo (sin modificar el anterior). */
export function applyPatch(state: GameState, patch: StatePatch): GameState {
  const next = { ...state, ...patch.values } as GameState;
  for (const key of RECORD_KEYS) {
    const set = patch.set[key];
    const del = patch.del[key];
    if (!set && !del) continue;
    const record = { ...(state[key] as Record<string, unknown>), ...set };
    for (const id of del ?? []) delete record[id];
    (next as unknown as Record<string, unknown>)[key] = record;
  }
  return next;
}
