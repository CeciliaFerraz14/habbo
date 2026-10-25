// =============================================================================
//  NPC: VECINOS DEL PUEBLO
// =============================================================================
//
// Los NPC son avatares normales (isBot = true) con un "cerebro" muy simple
// guardado en state.npcs. Cada cierto tiempo, cuando no están andando,
// "piensan" y eligen qué hacer:
//   - pasear por la acera,
//   - entrar a curiosear en una tienda abierta (y salir al rato),
//   - decir algo (más animado cuantos más negocios abiertos haya),
//   - contestar si un jugador saluda cerca.
//
// Lo que hacen lo hacen con las MISMAS acciones que un jugador (MOVE y SAY),
// aplicadas con el reducer. Y como todo ocurre dentro del tick de la
// simulación usando la semilla del estado, es determinista: en la fase 2 lo
// ejecutará el servidor y todos los jugadores verán a los vecinos igual.
// =============================================================================

import { secondsToTicks } from './economy';
import { createWalkableCheck } from './furniture';
import { randomLook } from './looks';
import { isDoorLocked } from './movement';
import { createRandom } from './random';
import { applyAction } from './reducer';
import type { TravelerBrain } from './travelers';
import type { Avatar, GameState, TilePoint } from './types';
import { SCENES } from './world.ids';

/** Lo que recuerda un vecino entre una decisión y la siguiente. */
export interface NeighborBrain {
  id: string;
  role: 'neighbor';
  /** Tick a partir del cual volverá a pensar. */
  nextThinkAt: number;
  /** Dentro de una tienda: cuántas vueltas dará antes de irse. */
  visitLeft: number;
  /** Último mensaje del chat que ha "oído" (para no contestar dos veces). */
  lastHeardId: string | null;
}

/** Cerebro de cualquier NPC: vecino o viajero (ver travelers.ts). */
export type NpcBrain = NeighborBrain | TravelerBrain;

/** Los vecinos del pueblo y dónde aparecen. */
const NEIGHBORS = [
  { id: 'npc-dolores', name: 'Dolores', x: 10, y: 5 },
  { id: 'npc-tito', name: 'Abuelo Tito', x: 20, y: 6 },
  { id: 'npc-nina', name: 'Nina', x: 30, y: 5 },
];

/** Cada cuánto piensan (segundos, entre un mínimo y un máximo al azar). */
const THINK_SECONDS = { min: 3, max: 8 };

/** Zona de la calle por la que pasean (filas de la acera y la carretera). */
const STREET_WANDER_ROWS = { from: 4, to: 9 };

const PHRASES = {
  street: [
    'Qué calor hace hoy...',
    'Antes por aquí paraban muchos coches.',
    'Mi abuelo tenía un diner en esta calle.',
    '¿Has visto la gasolinera? Lleva años cerrada.',
    'Hoy sopla viento del desierto.',
    '¿Sabes si alguien va a abrir un taller?',
  ],
  // Según cuántos negocios estén abiertos, el ánimo del pueblo cambia.
  dead: ['Este pueblo está muerto...', 'Hay tantos locales vacíos...'],
  lively: ['¡Cuántos neones encendidos!', 'El pueblo está reviviendo.', 'Hoy he visto más coches que en todo el año.'],
  store: ['Mira qué precio...', '¿Eso es una máquina de discos de verdad?', 'Solo estoy mirando, gracias.', 'Qué cosas más bonitas.'],
  greeting: ['¡Hola, forastero!', '¡Buenas! Bienvenido a Pixel Springs.', 'Hola, hola. ¿Eres nuevo por aquí?'],
};

const GREETING = /\b(hola|buenas|hey|saludos)\b/i;

/** Crea los vecinos al generar el mundo, con un aspecto al azar cada uno. */
export function setupNeighbors(state: GameState): GameState {
  const rng = createRandom(state.seed);
  const avatars = { ...state.avatars };
  const npcs = { ...state.npcs };
  for (const n of NEIGHBORS) {
    const avatar: Avatar = {
      id: n.id,
      name: n.name,
      sceneId: SCENES.street,
      x: n.x,
      y: n.y,
      direction: 'SW',
      path: [],
      look: randomLook(rng.random),
      isBot: true,
      sitting: false,
    };
    avatars[n.id] = avatar;
    npcs[n.id] = { id: n.id, role: 'neighbor', nextThinkAt: 0, visitLeft: 0, lastHeardId: null };
  }
  return { ...state, avatars, npcs, seed: rng.seed() };
}

/** Un paso de "pensamiento" de todos los NPC. Se llama en cada tick. */
export function npcTick(state: GameState): GameState {
  let next = state;
  let someoneGreeted = false;

  for (const brain of Object.values(state.npcs)) {
    // Los viajeros tienen su propia lógica (travelers.ts).
    if (brain.role !== 'neighbor') continue;
    const avatar = next.avatars[brain.id];
    if (!avatar) continue;

    // 1. ¿Un jugador ha saludado en su escena? Contesta uno solo de los vecinos.
    const heard = lastPlayerMessage(next, avatar.sceneId);
    if (heard && heard.id !== brain.lastHeardId) {
      next = updateBrain<NeighborBrain>(next, brain.id, { lastHeardId: heard.id });
      if (!someoneGreeted && GREETING.test(heard.text)) {
        someoneGreeted = true;
        // La frase depende del tick: variada pero determinista.
        next = say(next, avatar.id, PHRASES.greeting, () => (next.tick % 7) / 7);
        continue;
      }
    }

    // 2. Solo piensan si están quietos y les toca.
    if (avatar.path.length > 0 || next.tick < next.npcs[brain.id].nextThinkAt) continue;
    next = think(next, next.npcs[brain.id] as NeighborBrain, avatar);
  }
  return next;
}

/** Decide y hace UNA cosa, y programa cuándo volverá a pensar. */
function think(state: GameState, brain: NeighborBrain, avatar: Avatar): GameState {
  const rng = createRandom(state.seed);
  let next: GameState = state;
  const lot = state.lots[avatar.sceneId];

  if (lot) {
    // Dentro de una tienda: curiosea unas vueltas y luego se va.
    if (brain.visitLeft > 0 && rng.random() < 0.8) {
      next = rng.random() < 0.3 ? say(next, avatar.id, PHRASES.store, rng.random) : wander(next, avatar, rng.random);
      next = updateBrain<NeighborBrain>(next, brain.id, { visitLeft: brain.visitLeft - 1 });
    } else {
      const exit = state.scenes[avatar.sceneId].doors[0];
      next = move(next, avatar.id, exit);
    }
  } else {
    const roll = rng.random();
    const store = roll < 0.25 ? pickOpenStoreDoor(state, rng.random) : null;
    if (store) {
      // Entrar a curiosear: dará entre 2 y 4 vueltas antes de salir.
      next = move(next, avatar.id, store);
      next = updateBrain<NeighborBrain>(next, brain.id, { visitLeft: 2 + Math.floor(rng.random() * 3) });
    } else if (roll < 0.5) {
      next = say(next, avatar.id, streetPhrases(state), rng.random);
    } else {
      next = wander(next, avatar, rng.random);
    }
  }

  const wait = THINK_SECONDS.min + rng.random() * (THINK_SECONDS.max - THINK_SECONDS.min);
  next = updateBrain<NeighborBrain>(next, brain.id, { nextThinkAt: next.tick + secondsToTicks(wait) });
  return { ...next, seed: rng.seed() };
}

// --- Ayudantes ----------------------------------------------------------------

export function updateBrain<B extends NpcBrain>(
  state: GameState,
  id: string,
  changes: Partial<B>,
): GameState {
  return {
    ...state,
    npcs: { ...state.npcs, [id]: { ...state.npcs[id], ...changes } as NpcBrain },
  };
}

export function move(state: GameState, avatarId: string, to: TilePoint): GameState {
  return applyAction(state, { type: 'MOVE', avatarId, x: to.x, y: to.y });
}

export function say(
  state: GameState,
  avatarId: string,
  phrases: readonly string[],
  random: () => number = () => 0,
): GameState {
  const text = phrases[Math.floor(random() * phrases.length)];
  return applyAction(state, { type: 'SAY', avatarId, text });
}

/** Camina a una baldosa libre al azar (en la calle, solo por la acera y la carretera). */
export function wander(state: GameState, avatar: Avatar, random: () => number): GameState {
  const scene = state.scenes[avatar.sceneId];
  const walkable = createWalkableCheck(state, scene.id);
  const street = scene.kind === 'street';
  for (let attempt = 0; attempt < 10; attempt++) {
    const x = Math.floor(random() * scene.width);
    const y = street
      ? STREET_WANDER_ROWS.from +
        Math.floor(random() * (STREET_WANDER_ROWS.to - STREET_WANDER_ROWS.from + 1))
      : Math.floor(random() * scene.depth);
    // Las puertas no cuentan como destino de paseo (te cambiarían de escena).
    if (walkable(x, y) && !scene.doors.some((d) => d.x === x && d.y === y)) {
      return move(state, avatar.id, { x, y });
    }
  }
  return state;
}

/** Puerta de una tienda abierta de la calle, al azar (o null si no hay). */
function pickOpenStoreDoor(state: GameState, random: () => number): TilePoint | null {
  const street = state.scenes[SCENES.street];
  const doors = street.doors.filter((d) => {
    const lot = d.lotId ? state.lots[d.lotId] : undefined;
    return lot?.business === 'store' && !isDoorLocked(state, d);
  });
  return doors.length > 0 ? doors[Math.floor(random() * doors.length)] : null;
}

/** Frases de la calle, más alegres o más tristes según los negocios abiertos. */
function streetPhrases(state: GameState): string[] {
  const open = Object.values(state.lots).filter((l) => l.ownerId !== null).length;
  if (open <= 2) return [...PHRASES.street, ...PHRASES.dead];
  if (open >= 4) return [...PHRASES.street, ...PHRASES.lively];
  return PHRASES.street;
}

/** Último mensaje dicho por un jugador (no un NPC) en una escena. */
function lastPlayerMessage(state: GameState, sceneId: string) {
  for (let i = state.messages.length - 1; i >= 0; i--) {
    const m = state.messages[i];
    if (m.sceneId !== sceneId) continue;
    return state.avatars[m.avatarId]?.isBot ? null : m;
  }
  return null;
}
