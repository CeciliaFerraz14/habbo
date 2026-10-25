// El Transport es la frontera entre el cliente y "quien manda" sobre el estado.
//
//   Interfaz / bots ──dispatch(acción)──▶ Transport ──▶ applyAction + tick
//                                                          │
//   Renderer ◀──────── subscribe(estado) ──────────────────┘
//
// El resto del cliente solo conoce esta interfaz. En la fase 1 usamos
// LocalTransport, que simula el servidor dentro del navegador. En la fase 2
// crearemos SocketTransport (dispatch = socket.emit, subscribe = socket.on) y
// el resto del cliente no tendrá que cambiar.

import { applyAction, MOVE_TICK_MS, tick, type Action, type GameState } from '@juego/shared';

export type StateListener = (state: GameState) => void;

export interface Transport {
  /** Envía una acción para que se aplique al estado. */
  dispatch(action: Action): void;
  /** Avisa cada vez que cambia el estado. Devuelve una función para darse de baja. */
  subscribe(listener: StateListener): () => void;
}

/** Simula el servidor en local: guarda el estado autoritativo y ejecuta los ticks. */
export class LocalTransport implements Transport {
  private state: GameState;
  private readonly listeners = new Set<StateListener>();

  constructor(initialState: GameState) {
    this.state = initialState;
    setInterval(() => this.setState(tick(this.state)), MOVE_TICK_MS);
  }

  dispatch(action: Action): void {
    this.setState(applyAction(this.state, action));
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private setState(next: GameState): void {
    // Como el reducer devuelve el mismo objeto si nada cambia, comparar
    // referencias basta para saber si hay que avisar.
    if (next === this.state) return;
    this.state = next;
    for (const listener of this.listeners) listener(next);
  }
}
