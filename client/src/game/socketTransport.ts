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

/** Cuánto espera cada intento de conexión antes de reintentar (ms). */
const CONNECT_ATTEMPT_MS = 30_000;
/** Cuánto esperamos en total a que el servidor despierte antes de rendirnos (ms). */
const CONNECT_GIVE_UP_MS = 3 * 60_000;
/** Mensaje del servidor cuando la sesión no vale (ver server/src/index.ts). */
const SESSION_REJECTED = 'Sesión no válida';

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
   *
   * El servidor gratuito se duerme cuando no hay nadie y tarda en despertar
   * (a veces más de un minuto). Por eso, si no contesta, NO nos rendimos al
   * primer intento: Socket.IO reintenta solo y esperamos hasta
   * CONNECT_GIVE_UP_MS. Solo se abandona enseguida si la sesión no vale.
   */
  static connect(url: string, auth: Record<string, unknown>): Promise<{
    transport: SocketTransport;
    playerId: string;
  }> {
    return new Promise((resolve, reject) => {
      const socket = io(url, { auth, timeout: CONNECT_ATTEMPT_MS, reconnectionDelayMax: 5000 });
      let welcomed = false;
      const giveUp = setTimeout(() => {
        if (welcomed) return;
        socket.disconnect();
        reject(new Error('el servidor no responde. Prueba otra vez en un rato.'));
      }, CONNECT_GIVE_UP_MS);
      socket.on('welcome', ({ playerId, state }: Welcome) => {
        if (welcomed) {
          // Si se cortó la conexión y el servidor nos da la bienvenida otra
          // vez, somos un jugador nuevo para él: lo más sencillo es recargar.
          window.location.reload();
          return;
        }
        welcomed = true;
        clearTimeout(giveUp);
        resolve({ transport: new SocketTransport(socket, state), playerId });
      });
      socket.on('connect_error', (error) => {
        if (welcomed) return;
        // Sesión rechazada por el servidor: no tiene sentido reintentar.
        // Cualquier otro error (servidor dormido, timeout...): seguimos esperando.
        if (error.message === SESSION_REJECTED) {
          clearTimeout(giveUp);
          socket.disconnect();
          reject(error);
        }
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
