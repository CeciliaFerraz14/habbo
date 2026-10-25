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
  createInitialState,
  diffState,
  MOVE_TICK_MS,
  tick,
  type Action,
  type Avatar,
  type GameState,
} from '@juego/shared';
import type { Server, Socket } from 'socket.io';

/** Cada cuánto se mandan los cambios a los clientes (ms). */
const BROADCAST_MS = 50;

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
  'BUY_MATERIAL',
]);

export class GameServer {
  private state: GameState = createInitialState();
  /** Último estado enviado a los clientes (para calcular el parche). */
  private sent: GameState = this.state;

  constructor(private readonly io: Server) {
    setInterval(() => {
      this.state = tick(this.state);
    }, MOVE_TICK_MS);
    setInterval(() => this.broadcast(), BROADCAST_MS);
  }

  /**
   * Un jugador se conecta: creamos su avatar, le mandamos el estado completo
   * y a partir de ahí escuchamos sus acciones.
   */
  connect(socket: Socket, avatar: Avatar): void {
    // Antes de que entre, mandamos a todos lo pendiente: así el estado
    // completo que recibe el nuevo coincide con el "último enviado".
    this.broadcast();
    this.state = applyAction(this.state, { type: 'JOIN', avatar });
    this.broadcast();
    socket.emit('welcome', { playerId: avatar.id, state: this.state });
    console.log(`+ ${avatar.name} (${avatar.id}) · ${this.playerCount()} conectados`);

    socket.on('action', (raw: unknown) => this.handleAction(avatar.id, raw));
    socket.on('disconnect', () => {
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
