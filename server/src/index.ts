// Punto de entrada del servidor: HTTP + Socket.IO.
//
// De momento los jugadores entran como INVITADOS (sin cuenta). En el paso
// F2-3 el login pasará a hacerse con Supabase Auth.
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
import { GameServer } from './gameServer';

const PORT = Number(process.env.PORT ?? 3001);
/** Desde qué web se permite conectar (el cliente de Vite en desarrollo). */
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const http = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Servidor de Pixel Springs funcionando.\n');
});
const io = new Server(http, { cors: { origin: CLIENT_ORIGIN } });
const game = new GameServer(io);

let guestCounter = 0;

io.on('connection', (socket) => {
  // El cliente puede proponer su aspecto (lo guarda en su navegador), pero lo
  // validamos: solo se aceptan colores de la lista permitida.
  const proposed = socket.handshake.auth?.look as AvatarLook | undefined;
  const look = proposed && isValidLook(proposed) ? proposed : DEFAULT_LOOK;

  guestCounter++;
  const avatar: Avatar = {
    id: `guest-${guestCounter}`,
    name: `Invitado ${guestCounter}`,
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
});
