// Punto de entrada del cliente: crea las piezas y las conecta entre sí.
import {
  createInitialState,
  GAME_NAME,
  START_SCENE,
  START_TILE,
  type Avatar,
  type GameState,
} from '@juego/shared';
import { centerCamera, type Camera } from './engine/camera';
import { attachInput } from './engine/input';
import type { Point } from './engine/iso';
import { Renderer } from './engine/renderer';
import { AvatarViews } from './game/avatarViews';
import { GameController } from './game/controller';
import { LocalTransport, type Transport } from './game/transport';
import { buildRoomSprites, WALL_HEIGHT } from './sprites/room';
import { createCatalogWindow } from './ui/catalogWindow';
import { ChatBubbles } from './ui/chatBubbles';
import { createChatHistory } from './ui/chatHistory';
import { createFurniPanel } from './ui/furniPanel';
import { createHud } from './ui/hud';
import { createInventoryWindow } from './ui/inventoryWindow';
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
const uiRoot = document.querySelector<HTMLDivElement>('#ui')!;

document.title = GAME_NAME;

// Letrero con el nombre del juego y, debajo, el nombre del sitio donde estás.
const logo = document.createElement('div');
logo.id = 'logo';
logo.textContent = GAME_NAME.toUpperCase();
const locationSign = document.createElement('div');
locationSign.id = 'location';
uiRoot.append(logo, locationSign);

// --- Estado inicial ----------------------------------------------------------

const player: Avatar = {
  id: PLAYER_ID,
  name: 'Tú',
  sceneId: START_SCENE,
  ...START_TILE,
  direction: 'SE',
  path: [],
  look: { hair: '#5a3a1e', skin: '#f0c090', shirt: '#d94040', pants: '#3050a0' },
  isBot: false,
  sitting: false,
};

// --- Piezas del juego ---------------------------------------------------------

const transport: Transport = new LocalTransport(createInitialState());
transport.dispatch({ type: 'JOIN', avatar: player });

// Copia local del último estado recibido. El renderer y la interfaz leen de aquí.
// subscribe() llama enseguida con el estado actual, así que nunca queda sin asignar.
let state!: GameState;

const renderer = new Renderer(ctx, buildRoomSprites());
const views = new AvatarViews();
const controller = new GameController(
  transport,
  PLAYER_ID,
  () => state,
  (p) => renderer.pickAt(p.x, p.y),
);

let camera: Camera = { originX: 0, originY: 0 };
let hoverTile: Point | null = null;
/** Escena que se está mostrando; cuando el jugador cambia de escena, recolocamos la cámara. */
let shownSceneId: string | null = null;

/** Escena en la que está el jugador. */
function playerSceneId(): string {
  return state.avatars[PLAYER_ID]?.sceneId ?? START_SCENE;
}

// --- Interfaz -----------------------------------------------------------------

const catalog = createCatalogWindow((defId) => controller.buy(defId));
const inventory = createInventoryWindow((itemId) => controller.startPlacing(itemId));
const furniPanel = createFurniPanel({
  onMove: () => controller.startMovingSelected(),
  onRotate: () => controller.rotate(),
  onPickUp: () => controller.pickUpSelected(),
  onClose: () => controller.cancel(),
});

const chatHistory = createChatHistory();
let bubbles: ChatBubbles | null = null;

createHud((text) => transport.dispatch({ type: 'SAY', avatarId: PLAYER_ID, text }), [
  { label: 'Catálogo', onClick: () => catalog.toggle() },
  { label: 'Inventario', onClick: () => inventory.win.toggle() },
  { label: 'Avatar', onClick: () => {}, disabled: true, hint: 'Próximamente' },
  { label: 'Chat', onClick: () => chatHistory.win.toggle(), hint: 'Historial del chat' },
]);

/** Refleja en la interfaz el estado del juego y la selección actual. */
function refreshUi(): void {
  const sceneId = playerSceneId();
  if (sceneId !== shownSceneId) {
    shownSceneId = sceneId;
    resize(); // recentra la cámara en la escena nueva
  }
  locationSign.textContent = state.scenes[sceneId]?.name ?? '';
  inventory.update(state.inventories[PLAYER_ID] ?? []);
  chatHistory.update(state.messages, sceneId);
  bubbles?.sync(state.messages, sceneId, performance.now());
  furniPanel.show(controller.selected ? (state.furniture[controller.selected] ?? null) : null);
  canvas.style.cursor = controller.isPlacing ? 'crosshair' : '';
}

transport.subscribe((next) => {
  state = next;
  bubbles ??= new ChatBubbles(state.messages);
  controller.syncWithState(state);
  refreshUi();
});
controller.onChange(refreshUi);

// --- Entrada y bucle principal ---------------------------------------------

attachInput(canvas, () => camera, {
  onHover: (pointer) => {
    hoverTile = pointer?.tile ?? null;
  },
  onClick: (pointer) => controller.handleClick(pointer),
  onRightClick: () => controller.handleRightClick(),
});

/** Ajusta la resolución interna del canvas al tamaño de la ventana y recentra la escena. */
function resize(): void {
  canvas.width = Math.floor(window.innerWidth / SCALE);
  canvas.height = Math.floor(window.innerHeight / SCALE);
  // Al cambiar el tamaño, el contexto se reinicia: hay que volver a desactivar el suavizado.
  ctx.imageSmoothingEnabled = false;
  const scene = state.scenes[playerSceneId()];
  // Las paredes de los interiores necesitan sitio por arriba; la calle no tiene.
  const extraTop = scene.kind === 'interior' ? WALL_HEIGHT : 0;
  camera = centerCamera(scene, canvas.width, canvas.height, extraTop);
}

/** Bucle principal: se ejecuta en cada fotograma (normalmente 60 veces por segundo). */
let lastTime = performance.now();
function frame(now: number): void {
  // Limitamos dt por si la pestaña estuvo en segundo plano mucho rato.
  const dt = Math.min(now - lastTime, 100);
  lastTime = now;

  const sceneId = playerSceneId();
  views.update(state, dt);
  renderer.render({
    state,
    sceneId,
    views,
    camera,
    hoverTile,
    selectedId: controller.selected,
    ghost: controller.getGhost(hoverTile),
    now,
  });
  bubbles?.update(state, sceneId, views, renderer, camera, canvasToScreen, now);
  requestAnimationFrame(frame);
}

/** Convierte un punto del canvas (resolución reducida) a píxeles de la pantalla. */
function canvasToScreen(p: Point): Point {
  const scale = canvas.clientWidth / canvas.width;
  return { x: p.x * scale, y: p.y * scale };
}

window.addEventListener('resize', resize);
resize();
refreshUi();
requestAnimationFrame(frame);
