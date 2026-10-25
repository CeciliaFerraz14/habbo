// Punto de entrada del cliente.
import {
  createDefaultRoom,
  GAME_NAME,
  isInsideRoom,
  type Avatar,
  type FurniItem,
  type GameState,
} from '@juego/shared';
import { centerCamera, type Camera } from './engine/camera';
import { attachInput } from './engine/input';
import type { Point } from './engine/iso';
import { Renderer } from './engine/renderer';
import { AvatarViews } from './game/avatarViews';
import { LocalTransport, type Transport } from './game/transport';
import { buildRoomSprites, WALL_HEIGHT } from './sprites/room';
import './ui/styles.css';

/**
 * Escala de píxel: cada píxel "lógico" del juego ocupa SCALE x SCALE píxeles
 * reales de pantalla. Dibujamos en un canvas pequeño y el navegador lo amplía
 * sin suavizar (image-rendering: pixelated), lo que da el aspecto retro.
 */
const SCALE = 2;

/** Id del avatar que controla este jugador. En la fase 2 lo asignará el servidor. */
const PLAYER_ID = 'player';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ctx = canvas.getContext('2d')!;
const debug = document.querySelector<HTMLDivElement>('#debug')!;

document.title = GAME_NAME;

const player: Avatar = {
  id: PLAYER_ID,
  name: 'Tú',
  x: 4,
  y: 4,
  direction: 'SE',
  path: [],
  look: { hair: '#5a3a1e', skin: '#f0c090', shirt: '#d94040', pants: '#3050a0' },
  isBot: false,
};

// Muebles de prueba. En el paso 4 se colocarán desde el catálogo.
const initialFurniture: FurniItem[] = [
  { id: 'f1', defId: 'lamp', x: 0, y: 0, rotation: 0 },
  { id: 'f2', defId: 'shelf', x: 2, y: 0, rotation: 1 },
  { id: 'f3', defId: 'bed', x: 6, y: 0, rotation: 1 },
  { id: 'f4', defId: 'plant', x: 9, y: 0, rotation: 0 },
  { id: 'f5', defId: 'sofa', x: 0, y: 3, rotation: 0 },
  { id: 'f6', defId: 'table', x: 2, y: 4, rotation: 0 },
  { id: 'f7', defId: 'chair', x: 3, y: 4, rotation: 2 },
  { id: 'f8', defId: 'rug', x: 5, y: 5, rotation: 0 },
  { id: 'f9', defId: 'plant', x: 0, y: 9, rotation: 0 },
];

const initialState: GameState = {
  room: createDefaultRoom(),
  avatars: {},
  furniture: Object.fromEntries(initialFurniture.map((f) => [f.id, f])),
};
const transport: Transport = new LocalTransport(initialState);
transport.dispatch({ type: 'JOIN', avatar: player });

// Copia local del último estado recibido. El renderer lee de aquí.
let state = initialState;
transport.subscribe((next) => {
  state = next;
});

const renderer = new Renderer(ctx, buildRoomSprites());
const views = new AvatarViews();

let camera: Camera = { originX: 0, originY: 0 };
let hoverTile: Point | null = null;

/** Ajusta la resolución interna del canvas al tamaño de la ventana y recentra la sala. */
function resize(): void {
  canvas.width = Math.floor(window.innerWidth / SCALE);
  canvas.height = Math.floor(window.innerHeight / SCALE);
  // Al cambiar el tamaño, el contexto se reinicia: hay que volver a desactivar el suavizado.
  ctx.imageSmoothingEnabled = false;
  camera = centerCamera(state.room, canvas.width, canvas.height, WALL_HEIGHT);
}

function updateDebug(): void {
  const inside = hoverTile && isInsideRoom(state.room, hoverTile.x, hoverTile.y);
  debug.textContent = `Ratón: ${inside ? `(${hoverTile!.x}, ${hoverTile!.y})` : '-'}`;
}

attachInput(canvas, () => camera, {
  onHover: (tile) => {
    hoverTile = tile;
    updateDebug();
  },
  // Al hacer clic no movemos el avatar: pedimos moverlo con una acción.
  onClick: (tile) => {
    if (!isInsideRoom(state.room, tile.x, tile.y)) return;
    transport.dispatch({ type: 'MOVE', avatarId: PLAYER_ID, x: tile.x, y: tile.y });
  },
});

/** Bucle principal: se ejecuta en cada fotograma (normalmente 60 veces por segundo). */
let lastTime = performance.now();
function frame(now: number): void {
  // Limitamos dt por si la pestaña estuvo en segundo plano mucho rato.
  const dt = Math.min(now - lastTime, 100);
  lastTime = now;

  views.update(state, dt);
  renderer.render({ state, views, camera, hoverTile, now });
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
updateDebug();
requestAnimationFrame(frame);
