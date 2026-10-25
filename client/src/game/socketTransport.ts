// Transport que habla con el servidor por Socket.IO (modo multijugador).
//
// Cumple la MISMA interfaz que LocalTransport, así que el resto del cliente
// (renderer, interfaz, controlador) no sabe ni le importa con cuál habla:
//   dispatch(acción) → se envía al servidor con socket.emit('action')
//   subscribe(...)   ← el servidor manda el estado completo al entrar
//                      ('welcome') y luego parches con los cambios ('patch')
import { applyPatch, type Action, type GameState, type StatePatch } from '@juego/shared';
import { io, type Socket } from 'socket.io-client';
import type { StateListener, Transport } from './transport';

/** Lo que manda el servidor al conectarse: quiénes somos y el estado completo. */
interface Welcome {
  playerId: string;
  state: GameState;
}

export class SocketTransport implements Transport {
  private readonly listeners = new Set<StateListener>();

  private constructor(
    private readonly socket: Socket,
    private state: GameState,
  ) {
    socket.on('patch', (patch: StatePatch) => {
      this.state = applyPatch(this.state, patch);
      for (const listener of this.listeners) listener(this.state);
    });
  }

  /**
   * Se conecta al servidor y espera a su bienvenida. `auth` son los datos que
   * mandamos al conectar (por ejemplo, nuestro aspecto guardado).
   */
  static connect(url: string, auth: Record<string, unknown>): Promise<{
    transport: SocketTransport;
    playerId: string;
  }> {
    return new Promise((resolve, reject) => {
      const socket = io(url, { auth });
      let welcomed = false;
      socket.on('welcome', ({ playerId, state }: Welcome) => {
        if (welcomed) {
          // Si se cortó la conexión y el servidor nos da la bienvenida otra
          // vez, somos un jugador nuevo para él: lo más sencillo es recargar.
          window.location.reload();
          return;
        }
        welcomed = true;
        resolve({ transport: new SocketTransport(socket, state), playerId });
      });
      socket.on('connect_error', (error) => {
        if (!welcomed) reject(error);
      });
      // El servidor nos echa si entramos con la misma cuenta desde otro sitio.
      socket.on('kicked', (reason: string) => {
        window.dispatchEvent(new CustomEvent('game-kicked', { detail: reason }));
      });
    });
  }

  dispatch(action: Action): void {
    this.socket.emit('action', action);
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }
}
