// Punto de entrada del servidor: HTTP + Socket.IO.
import {
  DEFAULT_LOOK,
  isValidLook,
  START_SCENE,
  START_TILE,
  type Avatar,
  type AvatarLook,
} from '@juego/shared';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { identify, supabase, type PlayerIdentity } from './auth';
import { GameServer } from './gameServer';
import { Persistence } from './persistence';

const PORT = Number(process.env.PORT ?? 3001);
/** Desde qué web se permite conectar (el cliente de Vite en desarrollo). */
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const http = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Servidor de Pixel Springs funcionando.\n');
});
const io = new Server(http, { cors: { origin: CLIENT_ORIGIN } });
// Antes de aceptar a nadie, cargamos el mundo guardado (si hay Supabase).
const { state, persistence } = await Persistence.load();
const game = new GameServer(io, state, persistence);

/** Al parar el servidor (Ctrl+C), guardamos antes de salir. */
async function shutdown(): Promise<void> {
  console.log('Guardando antes de salir...');
  await game.save();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/**
 * "Middleware" de Socket.IO: se ejecuta ANTES de aceptar la conexión. Si el
 * jugador no se identifica bien, se rechaza y nunca llega a entrar al mundo.
 */
io.use(async (socket, next) => {
  try {
    const identity = await identify(socket.handshake.auth?.token);
    if (!identity) return next(new Error('Sesión no válida'));
    socket.data.identity = identity;
    next();
  } catch (error) {
    console.error('Error al identificar:', error);
    next(new Error('No se pudo verificar la sesión'));
  }
});

io.on('connection', (socket) => {
  const { id, name } = socket.data.identity as PlayerIdentity;
  // El cliente propone su aspecto, pero solo aceptamos colores permitidos.
  const proposed = socket.handshake.auth?.look as AvatarLook | undefined;
  // Aceptamos también los colores especiales: al entrar (JOIN), el juego le
  // quita lo que su rango aún no permite.
  const look = proposed && isValidLook(proposed, true) ? proposed : DEFAULT_LOOK;

  const avatar: Avatar = {
    id,
    name,
    sceneId: START_SCENE,
    ...START_TILE,
    direction: 'SE',
    path: [],
    look,
    isBot: false,
    sitting: false,
  };
  game.connect(socket, avatar);
});

http.listen(PORT, () => {
  console.log(`Pixel Springs escuchando en http://localhost:${PORT}`);
  console.log(`Se aceptan clientes de ${CLIENT_ORIGIN}`);
  console.log(supabase ? 'Login: Supabase Auth' : 'Login: invitados (Supabase no configurado)');
});
