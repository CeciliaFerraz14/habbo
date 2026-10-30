// =============================================================================
//  SERVIDOR DE JUEGO
// =============================================================================
//
// Aquí vive el estado "de verdad" del mundo. El servidor:
//   1. Ejecuta la simulación (tick) cada MOVE_TICK_MS, exactamente con el
//      mismo código de /shared que usaba el cliente en modo local.
//   2. Recibe las acciones de los jugadores, las VALIDA y las aplica.
//   3. Cada poco tiempo manda a todos un parche con lo que ha cambiado.
//
// Regla de oro: nunca confiar en el cliente. Por eso el servidor sustituye el
// `avatarId` de cada acción por el del jugador conectado a ese socket, y
// descarta las acciones que un cliente no debería poder mandar (JOIN, LEAVE).
// =============================================================================

import {
  applyAction,
  diffState,
  MOVE_TICK_MS,
  tick,
  type Action,
  type Avatar,
  type GameState,
} from '@juego/shared';
import type { Server, Socket } from 'socket.io';
import type { Persistence } from './persistence';

/** Cada cuánto se mandan los cambios a los clientes (ms). */
const BROADCAST_MS = 50;
/** Cada cuánto se guardan los cambios en Supabase (ms). */
const SAVE_MS = 10_000;

/** Acciones que un cliente puede pedir. JOIN y LEAVE solo las hace el servidor. */
const CLIENT_ACTIONS = new Set<Action['type']>([
  'MOVE',
  'SAY',
  'SET_LOOK',
  'PLACE_FURNI',
  'MOVE_FURNI',
  'PICKUP_FURNI',
  'RENT_LOT',
  'COLLECT_MATERIALS',
  'CRAFT',
  'COLLECT_CRAFTED',
  'LIST_ITEM',
  'SET_PRICE',
  'BUY_ITEM',
  'SET_FACADE',
  'STOCK_LOT',
  'SET_SERVICE_PRICE',
  'BUY_MATERIAL',
  'SELL_MATERIAL',
  'DELIVER_ORDER',
  'START_SHIFT',
  'BUY_SCRATCH',
  'BUY_SODA',
  'PLAY_PINBALL',
  'CLAIM_SUBSIDY',
]);

export class GameServer {
  /** Último estado enviado a los clientes (para calcular el parche). */
  private sent: GameState;
  /** Socket activo de cada jugador (para echar la sesión vieja si entra dos veces). */
  private readonly sockets = new Map<string, Socket>();

  constructor(
    private readonly io: Server,
    private state: GameState,
    /** null si no hay Supabase: entonces no se guarda nada. */
    private readonly persistence: Persistence | null,
  ) {
    this.sent = state;
    setInterval(() => {
      this.state = tick(this.state);
    }, MOVE_TICK_MS);
    setInterval(() => this.broadcast(), BROADCAST_MS);
    setInterval(() => void this.save(), SAVE_MS);
  }

  /** Guarda en Supabase lo que haya cambiado (si hay persistencia). */
  save(): Promise<void> {
    return this.persistence?.save(this.state) ?? Promise.resolve();
  }

  /**
   * Un jugador se conecta: creamos su avatar, le mandamos el estado completo
   * y a partir de ahí escuchamos sus acciones.
   */
  connect(socket: Socket, joining: Avatar): void {
    // Si ya tenía perfil guardado, entra con su nombre y aspecto de siempre.
    const saved = this.persistence?.profile(joining.id);
    const avatar = saved ? { ...joining, name: saved.name, look: saved.look } : joining;
    this.persistence?.register(avatar.id, { name: avatar.name, look: avatar.look });

    // Si el mismo usuario ya estaba conectado (otra pestaña), cerramos aquella.
    const previous = this.sockets.get(avatar.id);
    this.sockets.set(avatar.id, socket);
    if (previous) {
      previous.emit('kicked', 'Has entrado desde otro sitio.');
      previous.disconnect(true);
    }

    // Antes de que entre, mandamos a todos lo pendiente: así el estado
    // completo que recibe el nuevo coincide con el "último enviado".
    this.broadcast();
    this.state = applyAction(this.state, { type: 'JOIN', avatar });
    this.broadcast();
    socket.emit('welcome', { playerId: avatar.id, state: this.state });
    console.log(`+ ${avatar.name} (${avatar.id}) · ${this.playerCount()} conectados`);

    socket.on('action', (raw: unknown) => this.handleAction(avatar.id, raw));
    socket.on('disconnect', () => {
      // Si este socket ya fue sustituido por otro del mismo jugador, el avatar
      // sigue en el mundo con la conexión nueva: no lo quitamos.
      if (this.sockets.get(avatar.id) !== socket) return;
      this.sockets.delete(avatar.id);
      this.state = applyAction(this.state, { type: 'LEAVE', avatarId: avatar.id });
      console.log(`- ${avatar.name} (${avatar.id}) · ${this.playerCount()} conectados`);
    });
  }

  /** Valida una acción recibida de un cliente y la aplica en su nombre. */
  private handleAction(playerId: string, raw: unknown): void {
    if (typeof raw !== 'object' || raw === null) return;
    const action = raw as Action;
    if (!CLIENT_ACTIONS.has(action.type)) return;
    // Sea cual sea el avatarId que mande el cliente, actúa como SU avatar.
    const safe = { ...action, avatarId: playerId } as Action;
    this.state = applyAction(this.state, safe);
  }

  /** Manda a todos los clientes lo que ha cambiado desde el último envío. */
  private broadcast(): void {
    const patch = diffState(this.sent, this.state);
    this.sent = this.state;
    if (patch) this.io.emit('patch', patch);
  }

  private playerCount(): number {
    return Object.values(this.state.avatars).filter((a) => !a.isBot).length;
  }
}
