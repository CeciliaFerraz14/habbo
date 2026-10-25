// Elige con quién habla el cliente:
// - Si hay servidor configurado (VITE_SERVER_URL), modo MULTIJUGADOR: el
//   estado vive en el servidor y llega por Socket.IO.
// - Si no, modo LOCAL: el navegador simula el servidor él solo (como en la
//   fase 1). Sirve para desarrollar y probar sin arrancar nada más.
import {
  createInitialState,
  START_SCENE,
  START_TILE,
  type Avatar,
  type AvatarLook,
} from '@juego/shared';
import { currentToken, supabase } from './auth';
import { SocketTransport } from './socketTransport';
import { showLoginScreen } from '../ui/loginScreen';
import { LocalTransport, type Transport } from './transport';

export interface Connection {
  transport: Transport;
  /** Id de nuestro avatar (en multijugador lo asigna el servidor). */
  playerId: string;
  online: boolean;
}

export async function connect(look: AvatarLook): Promise<Connection> {
  const serverUrl = import.meta.env.VITE_SERVER_URL as string | undefined;

  if (serverUrl) {
    // Con Supabase configurado hace falta sesión: la guardada o la del login.
    const token = supabase ? ((await currentToken()) ?? (await showLoginScreen())) : undefined;
    const { transport, playerId } = await SocketTransport.connect(serverUrl, { look, token });
    return { transport, playerId, online: true };
  }

  // Modo local: creamos el mundo y nuestro avatar aquí mismo.
  const playerId = 'player';
  const player: Avatar = {
    id: playerId,
    name: 'Tú',
    sceneId: START_SCENE,
    ...START_TILE,
    direction: 'SE',
    path: [],
    look,
    isBot: false,
    sitting: false,
  };
  const transport = new LocalTransport(createInitialState());
  transport.dispatch({ type: 'JOIN', avatar: player });
  return { transport, playerId, online: false };
}
