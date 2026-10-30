// =============================================================================
//  VIAJEROS Y COCHES
// =============================================================================
//
// Los viajeros son la ENTRADA de dinero al pueblo: traen dinero de fuera y lo
// gastan en las tiendas. Su ciclo de vida:
//
//   1. Cada cierto tiempo pasa un coche por la carretera.
//   2. Puede PARAR o seguir de largo. La probabilidad de parar crece con los
//      negocios abiertos: cuanto más vivo está el pueblo, más gente para.
//   3. Si para, aparca frente a un negocio abierto (tienda o servicio) y se
//      baja el viajero.
//   4. El viajero entra, mira y decide si compra algo (o paga el servicio:
//      comer, cortarse el pelo...) según el precio comparado con el valor de
//      referencia.
//   5. Vuelve al coche, desaparece y el coche se va.
//
// Además, algunos coches que no paran en el pueblo se detienen un momento a
// repostar en la gasolinera, y de vez en cuando llega un AUTOBÚS de turistas
// que deja a varios viajeros a la vez.
//
// Todo es determinista (semilla del estado) y ocurre dentro del tick, así que
// en la fase 2 lo hará el servidor igual que aquí.
// =============================================================================

import {
  businessOf,
  canServe,
  getListings,
  isKind,
  secondsToTicks,
  sellProduct,
  serveCustomer,
  servesCustomers,
  type Lot,
} from './economy';
import { addNotice } from './economy';
import { ECONOMY, type BusinessType } from './economy.config';
import { tipWorkers } from './gasStation';
import { randomLook } from './looks';
import { isDoorLocked } from './movement';
import { move, say, updateBrain, wander } from './npcs';
import { createRandom } from './random';
import type { Avatar, FurniItem, GameState } from './types';
import { SCENES } from './world.ids';

/** Un coche (o autobús) en la carretera. Circulan todos hacia +x (calle de sentido único). */
export interface Vehicle {
  id: string;
  /** Baldosa de la parte trasera (un coche ocupa 2 baldosas en x; un autobús, 3). */
  x: number;
  y: number;
  color: string;
  /**
   * passing: sigue de largo · arriving: va a aparcar · parked · leaving: se va ·
   * toPump: va a repostar · fueling: repostando (hasta leaveAt).
   */
  mode: 'passing' | 'arriving' | 'parked' | 'leaving' | 'toPump' | 'fueling';
  /** Dónde aparcará (x de la parte trasera). */
  parkX: number;
  /** Autobús de turistas (si no se indica, es un coche). */
  kind?: 'bus';
  /** Repostando: tick en el que se va. */
  leaveAt?: number;
}

/** Largo de un vehículo en baldosas. */
export function vehicleLength(vehicle: Vehicle): number {
  return vehicle.kind === 'bus' ? 3 : 2;
}

/** Lo que recuerda un viajero. */
export interface TravelerBrain {
  id: string;
  role: 'traveler';
  vehicleId: string;
  /** Tienda que ha venido a visitar. */
  lotId: string;
  /** toStore: va a la tienda · shopping: dentro · toCar: vuelve al coche. */
  phase: 'toStore' | 'shopping' | 'toCar';
  nextThinkAt: number;
  /** Dinero que trae (viene de fuera del pueblo). */
  budget: number;
  /** Vueltas que ha dado mirando dentro de la tienda. */
  looked: number;
  /** Decisiones que le quedan antes de rendirse (por si se queda atascado). */
  patience: number;
}

/** Carril de los coches que van a aparcar (el más cercano a la acera). */
const LANE_Y = 7;
/** Carril de los que siguen de largo, para que no atraviesen a los aparcados. */
const PASSING_LANE_Y = 9;
/** Fila de la acera donde se baja el viajero (junto al bordillo). */
const CURB_Y = 6;
/** Los coches aparecen y desaparecen fuera de la calle. */
const SPAWN_X = -3;
/** Donde paran a repostar: delante de los surtidores de la gasolinera. */
const PUMP_X = 41;
/** Color del autobús de turistas. */
const BUS_COLOR = '#f2b134';

const CAR_COLORS = ['#c83c3c', '#2f8f8a', '#f2b134', '#6a4a8a', '#e8e0d0', '#4a78ab'];
const TRAVELER_NAMES = ['Earl', 'Lupe', 'Moe', 'Irene', 'Sal', 'Trudy', 'Bo', 'Carmen', 'Walt', 'Rita'];

const PHRASES = {
  bought: ['¡Me lo llevo!', 'Esto quedará genial en casa.', 'Buen precio, sí señor.'],
  nothing: ['Todo está carísimo...', 'No veo nada para mí.', 'Volveré otro día.'],
  /** Al pagar un servicio, según el negocio. */
  served: {
    diner: ['¡Qué bien sienta comer!', 'El mejor menú de la carretera.', 'Rico, rico.'],
    barber: ['¡Como nuevo!', 'Me encanta el corte.', '¿A que estoy más guapo?'],
    greengrocer: ['¡Qué fruta más fresca!', 'Para el camino.', 'Esto sí que es fruta.'],
  } as Partial<Record<BusinessType, string[]>>,
  closed: ['¿Cerrado? Si no hay nada...', 'Vaya, se les ha acabado todo.'],
};

/** Un paso de la simulación de coches y viajeros. Se llama en cada tick. */
export function travelerTick(state: GameState): GameState {
  let next = moveVehicles(state);
  next = maybeSpawnCar(next);
  next = maybeSpawnBus(next);
  for (const brain of Object.values(next.npcs)) {
    if (brain.role === 'traveler') next = thinkTraveler(next, brain);
  }
  return next;
}

// --- Coches -------------------------------------------------------------------

/** Puertas de la calle que dan a negocios abiertos al público (tiendas y servicios). */
function openStoreDoors(state: GameState) {
  return state.scenes[SCENES.street].doors.filter((d) => {
    const lot = d.lotId ? state.lots[d.lotId] : undefined;
    return servesCustomers(lot) && !isDoorLocked(state, d);
  });
}

/** Probabilidad de que un coche pare, según los negocios abiertos. */
export function stopChance(state: GameState): number {
  const t = ECONOMY.travelers;
  const open = Object.values(state.lots).filter((l) => l.ownerId !== null).length;
  return Math.min(t.maxStopChance, t.baseStopChance + t.stopChancePerBusiness * open);
}

/** Si toca, aparece un coche nuevo por el principio de la carretera. */
function maybeSpawnCar(state: GameState): GameState {
  if (state.tick < state.nextCarAt) return state;
  const t = ECONOMY.travelers;
  const rng = createRandom(state.seed);

  const travelers = Object.values(state.npcs).filter((b) => b.role === 'traveler').length;
  const doors = openStoreDoors(state);
  // ¿Para? Solo si hay alguna tienda abierta y no hay demasiados viajeros.
  const stops = doors.length > 0 && travelers < t.maxActive && rng.random() < stopChance(state);
  const door = stops ? doors[Math.floor(rng.random() * doors.length)] : null;

  // Si no para en el pueblo, quizá pare a repostar (si el surtidor está libre).
  const pumpFree = !Object.values(state.vehicles).some((v) => v.mode === 'toPump' || v.mode === 'fueling');
  const refuels = !door && pumpFree && rng.random() < ECONOMY.gasStation.refuel.chance;

  const vehicle: Vehicle = {
    id: `car${state.nextId}`,
    x: SPAWN_X,
    y: door || refuels ? LANE_Y : PASSING_LANE_Y,
    color: CAR_COLORS[Math.floor(rng.random() * CAR_COLORS.length)],
    mode: door ? 'arriving' : refuels ? 'toPump' : 'passing',
    // Aparca con la parte delantera justo frente a la puerta (o al surtidor).
    parkX: door ? door.x - 1 : refuels ? PUMP_X : 0,
  };
  // El siguiente coche llega dentro de carIntervalSeconds ± 30 %.
  const interval = t.carIntervalSeconds * (0.7 + rng.random() * 0.6);
  const next: GameState = {
    ...state,
    vehicles: { ...state.vehicles, [vehicle.id]: vehicle },
    nextCarAt: state.tick + secondsToTicks(interval),
    nextId: state.nextId + 1,
    seed: rng.seed(),
  };
  // Si va a parar, apuntamos ya a qué tienda va (el viajero se baja al aparcar).
  return door?.lotId ? withPendingLot(next, vehicle.id, door.lotId) : next;
}

/**
 * Guarda a qué tienda va un coche que viene a aparcar. Lo apuntamos en un
 * "cerebro" provisional del viajero, que aún no tiene avatar.
 */
function withPendingLot(state: GameState, vehicleId: string, lotId: string): GameState {
  const rng = createRandom(state.seed);
  const { min, max } = ECONOMY.travelers.budget;
  const brain: TravelerBrain = {
    id: `trav${state.nextId}`,
    role: 'traveler',
    vehicleId,
    lotId,
    phase: 'toStore',
    nextThinkAt: Number.MAX_SAFE_INTEGER, // no piensa hasta que se baje del coche
    budget: Math.round(min + rng.random() * (max - min)),
    looked: 0,
    patience: 20,
  };
  return {
    ...state,
    npcs: { ...state.npcs, [brain.id]: brain },
    nextId: state.nextId + 1,
    seed: rng.seed(),
  };
}

/** Mueve los coches una baldosa por tick y gestiona aparcar y marcharse. */
function moveVehicles(state: GameState): GameState {
  const width = state.scenes[SCENES.street].width;
  let next = state;
  for (const car of Object.values(state.vehicles)) {
    if (car.mode === 'parked') continue;

    // Repostando: cuando acaba, propina para quien trabaje en la caja y se va.
    if (car.mode === 'fueling') {
      if (next.tick >= (car.leaveAt ?? 0)) next = tipWorkers(setVehicle(next, { ...car, mode: 'leaving' }));
      continue;
    }
    if (car.mode === 'toPump' && car.x >= car.parkX) {
      const leaveAt = next.tick + secondsToTicks(ECONOMY.gasStation.refuel.seconds);
      next = setVehicle(next, { ...car, x: car.parkX, mode: 'fueling', leaveAt });
      continue;
    }

    // Llega a su plaza: aparca y se bajan los viajeros.
    if (car.mode === 'arriving' && car.x + 1 >= car.parkX) {
      next = setVehicle(next, { ...car, x: car.parkX, mode: 'parked' });
      next = dropOffTraveler(next, car.id);
      continue;
    }
    // Sale por el final de la calle: desaparece.
    if (car.x > width + 2) {
      const { [car.id]: _gone, ...vehicles } = next.vehicles;
      next = { ...next, vehicles };
      continue;
    }
    next = setVehicle(next, { ...car, x: car.x + 1 });
  }
  return next;
}

function setVehicle(state: GameState, car: Vehicle): GameState {
  return { ...state, vehicles: { ...state.vehicles, [car.id]: car } };
}

/** Los viajeros de un vehículo (uno en un coche, varios en un autobús) se bajan. */
function dropOffTraveler(state: GameState, vehicleId: string): GameState {
  const passengers = Object.values(state.npcs).filter(
    (b): b is TravelerBrain => b.role === 'traveler' && b.vehicleId === vehicleId,
  );
  return passengers.reduce((s, brain) => dropOffOne(s, brain), state);
}

/** El viajero aparece en la acera junto a su vehículo y va hacia la tienda. */
function dropOffOne(state: GameState, brain: TravelerBrain): GameState {
  const car = state.vehicles[brain.vehicleId];
  if (!car) return state;

  const rng = createRandom(state.seed);
  const avatar: Avatar = {
    id: brain.id,
    name: TRAVELER_NAMES[Math.floor(rng.random() * TRAVELER_NAMES.length)],
    sceneId: SCENES.street,
    x: car.parkX + 1,
    y: CURB_Y,
    direction: 'NE',
    path: [],
    look: randomLook(rng.random),
    isBot: true,
    sitting: false,
  };
  let next: GameState = { ...state, avatars: { ...state.avatars, [avatar.id]: avatar }, seed: rng.seed() };
  const door = next.scenes[SCENES.street].doors.find((d) => d.lotId === brain.lotId);
  if (door) next = move(next, avatar.id, door);
  return updateBrain<TravelerBrain>(next, brain.id, { nextThinkAt: next.tick + 1 });
}

// --- Viajeros -----------------------------------------------------------------

function thinkTraveler(state: GameState, brain: TravelerBrain): GameState {
  const avatar = state.avatars[brain.id];
  if (!avatar || avatar.path.length > 0 || state.tick < brain.nextThinkAt) return state;

  // Si lleva demasiado tiempo sin conseguir nada (camino bloqueado, tienda
  // cerrada...), se rinde y se va.
  if (brain.patience <= 0) return leaveTown(state, brain);

  const rng = createRandom(state.seed);
  let next: GameState = { ...state };
  const changes: Partial<TravelerBrain> = { patience: brain.patience - 1 };

  if (brain.phase === 'toStore') {
    const door = next.scenes[SCENES.street].doors.find((d) => d.lotId === brain.lotId);
    if (avatar.sceneId === brain.lotId) {
      changes.phase = 'shopping';
      next = wander(next, avatar, rng.random);
    } else if (door && avatar.sceneId === SCENES.street && avatar.x === door.x && avatar.y === door.y) {
      // Está en el umbral: la puerta se cruza en el tick siguiente (ver
      // updateDoors). Esperamos en vez de creer que la tienda ha cerrado.
    } else {
      // No ha llegado (¿la tienda ha cerrado?): vuelve al coche.
      changes.phase = 'toCar';
    }
  } else if (brain.phase === 'shopping') {
    if (brain.looked < 2) {
      // Da un par de vueltas mirando los productos.
      next = wander(next, avatar, rng.random);
      changes.looked = brain.looked + 1;
    } else {
      next = decideAndBuy(next, brain, avatar, rng.random);
      next = move(next, avatar.id, next.scenes[avatar.sceneId].doors[0]);
      changes.phase = 'toCar';
    }
  } else {
    // Volviendo al coche: primero sale de la tienda, luego va al bordillo.
    const car = next.vehicles[brain.vehicleId];
    if (avatar.sceneId !== SCENES.street) {
      next = move(next, avatar.id, next.scenes[avatar.sceneId].doors[0]);
    } else if (!car || (avatar.x === car.parkX + 1 && avatar.y === CURB_Y)) {
      return leaveTown({ ...next, seed: rng.seed() }, brain);
    } else {
      next = move(next, avatar.id, { x: car.parkX + 1, y: CURB_Y });
    }
  }

  const wait = 1.5 + rng.random() * 2;
  changes.nextThinkAt = next.tick + secondsToTicks(wait);
  return updateBrain<TravelerBrain>({ ...next, seed: rng.seed() }, brain.id, changes);
}

/**
 * Elige un producto y decide si lo compra.
 *
 * - Descarta lo que no puede pagar y lo que considera un abuso (más de
 *   maxPriceRatio veces su valor de referencia).
 * - De lo que queda, elige la mejor ganga (precio más bajo comparado con su valor).
 * - Probabilidad de comprarlo = base + variedad + lo buena que sea la ganga.
 */
export function chooseProduct(
  state: GameState,
  lotId: string,
  budget: number,
  random: () => number,
): FurniItem | null {
  const t = ECONOMY.travelers;
  const listings = getListings(state, lotId);
  const ratio = (item: FurniItem) => item.price! / ECONOMY.baseValue[item.defId as keyof typeof ECONOMY.baseValue];
  const candidates = listings.filter((item) => item.price! <= budget && ratio(item) <= t.maxPriceRatio);
  if (candidates.length === 0) return null;

  const best = candidates.reduce((a, b) => (ratio(b) < ratio(a) ? b : a));
  const variety = new Set(listings.map((l) => l.defId)).size;
  const chance = t.baseBuyChance + t.varietyBonus * variety + t.bargainBonus * (1 - ratio(best));
  return random() < Math.min(0.95, Math.max(0.05, chance)) ? best : null;
}

/**
 * ¿Paga el viajero el servicio del local? Solo si queda género, le llega el
 * dinero y no le parece un abuso. Probabilidad = base + lo buena que sea la ganga.
 */
export function decideService(lot: Lot, budget: number, random: () => number): boolean {
  const t = ECONOMY.travelers;
  const service = businessOf(lot)?.service;
  if (!service || !canServe(lot) || lot.price > budget) return false;
  const ratio = lot.price / service.baseValue;
  if (ratio > t.maxPriceRatio) return false;
  const chance = t.baseBuyChance + t.bargainBonus * (1 - ratio);
  return random() < Math.min(0.95, Math.max(0.05, chance));
}

function decideAndBuy(
  state: GameState,
  brain: TravelerBrain,
  avatar: Avatar,
  random: () => number,
): GameState {
  const lot = state.lots[brain.lotId];
  if (lot && isKind(lot, 'service')) return decideAndServe(state, brain, avatar, lot, random);
  const product = lot?.ownerId ? chooseProduct(state, brain.lotId, brain.budget, random) : null;
  if (!product || !lot?.ownerId) return say(state, avatar.id, PHRASES.nothing, random);

  // El viajero se lleva el mueble fuera del pueblo: no va a ningún inventario.
  // (Si el dueño es un jugador, sellProduct ya le deja un aviso de la venta.)
  let next = sellProduct(state, product, lot.ownerId, (s) => s);
  next = updateBrain<TravelerBrain>(next, brain.id, { budget: brain.budget - product.price! });
  return say(next, avatar.id, PHRASES.bought, random);
}

function decideAndServe(
  state: GameState,
  brain: TravelerBrain,
  avatar: Avatar,
  lot: Lot,
  random: () => number,
): GameState {
  if (!canServe(lot)) return say(state, avatar.id, PHRASES.closed, random);
  if (!decideService(lot, brain.budget, random)) return say(state, avatar.id, PHRASES.nothing, random);

  let next = serveCustomer(state, lot.id);
  next = updateBrain<TravelerBrain>(next, brain.id, { budget: brain.budget - lot.price });
  // En la peluquería el viajero sale con el pelo de otro color.
  if (lot.business === 'barber') {
    const traveler = next.avatars[avatar.id];
    const look = { ...traveler.look, hair: randomLook(random).hair };
    next = { ...next, avatars: { ...next.avatars, [avatar.id]: { ...traveler, look } } };
  }
  const phrases = (lot.business && PHRASES.served[lot.business]) || PHRASES.bought;
  return say(next, avatar.id, phrases, random);
}

/** El viajero desaparece. Su vehículo se marcha cuando ya no queda nadie por volver. */
function leaveTown(state: GameState, brain: TravelerBrain): GameState {
  const { [brain.id]: _avatar, ...avatars } = state.avatars;
  const { [brain.id]: _brain, ...npcs } = state.npcs;
  const car = state.vehicles[brain.vehicleId];
  const waiting = Object.values(npcs).some((b) => b.role === 'traveler' && b.vehicleId === brain.vehicleId);
  const vehicles =
    car && !waiting ? { ...state.vehicles, [car.id]: { ...car, mode: 'leaving' as const } } : state.vehicles;
  return { ...state, avatars, npcs, vehicles };
}

// --- Autobús de turistas --------------------------------------------------------

/**
 * De vez en cuando llega un autobús de turistas: aparca en la calle y bajan
 * varios viajeros a la vez, cada uno hacia una tienda abierta al azar. No
 * cuenta para el máximo de viajeros. Se avisa a todos los jugadores conectados.
 */
function maybeSpawnBus(state: GameState): GameState {
  const { everySeconds, passengers } = ECONOMY.gasStation.bus;
  const rng = createRandom(state.seed);
  const interval = () =>
    secondsToTicks(everySeconds.min + rng.random() * (everySeconds.max - everySeconds.min));

  // Al arrancar (o tras reiniciar el servidor) solo se programa, no llega en el acto.
  if (state.nextBusAt === 0) return { ...state, nextBusAt: state.tick + interval(), seed: rng.seed() };
  if (state.tick < state.nextBusAt) return state;

  const doors = openStoreDoors(state);
  const busActive = Object.values(state.vehicles).some((v) => v.kind === 'bus');
  // Sin tiendas abiertas (o con otro autobús aún en la calle), lo intenta en un minuto.
  if (doors.length === 0 || busActive) {
    return { ...state, nextBusAt: state.tick + secondsToTicks(60) };
  }

  const stop = doors[Math.floor(rng.random() * doors.length)];
  const bus: Vehicle = {
    id: `bus${state.nextId}`,
    x: SPAWN_X - 1,
    y: LANE_Y,
    color: BUS_COLOR,
    mode: 'arriving',
    kind: 'bus',
    // Aparca con la puerta (en medio del autobús) frente a la tienda.
    parkX: stop.x - 1,
  };
  const count = passengers.min + Math.floor(rng.random() * (passengers.max - passengers.min + 1));
  let next: GameState = {
    ...state,
    vehicles: { ...state.vehicles, [bus.id]: bus },
    nextBusAt: state.tick + interval(),
    nextId: state.nextId + 1,
    seed: rng.seed(),
  };
  for (let i = 0; i < count; i++) {
    const pick = createRandom(next.seed);
    const door = doors[Math.floor(pick.random() * doors.length)];
    next = withPendingLot({ ...next, seed: pick.seed() }, bus.id, door.lotId!);
  }
  for (const avatar of Object.values(next.avatars)) {
    if (!avatar.isBot) next = addNotice(next, avatar.id, '¡Ha llegado un autobús de turistas!');
  }
  return next;
}
