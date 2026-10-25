// Punto de entrada del cliente: crea las piezas y las conecta entre sí.
import { createDefaultRoom, GAME_NAME, type Avatar, type FurniItem, type GameState } from '@juego/shared';
import { centerCamera, type Camera } from './engine/camera';
import { attachInput } from './engine/input';
import type { Point } from './engine/iso';
import { Renderer } from './engine/renderer';
import { AvatarViews } from './game/avatarViews';
import { GameController } from './game/controller';
import { LocalTransport, type Transport } from './game/transport';
import { buildRoomSprites, WALL_HEIGHT } from './sprites/room';
import { createCatalogWindow } from './ui/catalogWindow';
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

document.title = GAME_NAME;

// --- Estado inicial ----------------------------------------------------------

const player: Avatar = {
  id: PLAYER_ID,
  name: 'Tú',
  x: 4,
  y: 4,
  direction: 'SE',
  path: [],
  look: { hair: '#5a3a1e', skin: '#f0c090', shirt: '#d94040', pants: '#3050a0' },
  isBot: false,
  sitting: false,
};

// Muebles con los que empieza la sala.
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
  inventories: {},
  nextId: 100,
};

// --- Piezas del juego ---------------------------------------------------------

const transport: Transport = new LocalTransport(initialState);
transport.dispatch({ type: 'JOIN', avatar: player });

// Copia local del último estado recibido. El renderer y la interfaz leen de aquí.
let state = initialState;

const renderer = new Renderer(ctx, buildRoomSprites());
const views = new AvatarViews();
const controller = new GameController(
  transport,
  PLAYER_ID,
  () => state,
  (p) => renderer.pickFurniAt(p.x, p.y),
);

let camera: Camera = { originX: 0, originY: 0 };
let hoverTile: Point | null = null;

// --- Interfaz -----------------------------------------------------------------

const catalog = createCatalogWindow((defId) => controller.buy(defId));
const inventory = createInventoryWindow((itemId) => controller.startPlacing(itemId));
const furniPanel = createFurniPanel({
  onMove: () => controller.startMovingSelected(),
  onRotate: () => controller.rotate(),
  onPickUp: () => controller.pickUpSelected(),
  onClose: () => controller.cancel(),
});

createHud([
  { label: 'Catálogo', onClick: () => catalog.toggle() },
  { label: 'Inventario', onClick: () => inventory.win.toggle() },
  { label: 'Avatar', onClick: () => {}, disabled: true, hint: 'Próximamente (paso 7)' },
  { label: 'Chat', onClick: () => {}, disabled: true, hint: 'Próximamente (paso 5)' },
]);

/** Refleja en la interfaz el estado del juego y la selección actual. */
function refreshUi(): void {
  inventory.update(state.inventories[PLAYER_ID] ?? []);
  furniPanel.show(controller.selected ? (state.furniture[controller.selected] ?? null) : null);
  canvas.style.cursor = controller.isPlacing ? 'crosshair' : '';
}

transport.subscribe((next) => {
  state = next;
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

/** Ajusta la resolución interna del canvas al tamaño de la ventana y recentra la sala. */
function resize(): void {
  canvas.width = Math.floor(window.innerWidth / SCALE);
  canvas.height = Math.floor(window.innerHeight / SCALE);
  // Al cambiar el tamaño, el contexto se reinicia: hay que volver a desactivar el suavizado.
  ctx.imageSmoothingEnabled = false;
  camera = centerCamera(state.room, canvas.width, canvas.height, WALL_HEIGHT);
}

/** Bucle principal: se ejecuta en cada fotograma (normalmente 60 veces por segundo). */
let lastTime = performance.now();
function frame(now: number): void {
  // Limitamos dt por si la pestaña estuvo en segundo plano mucho rato.
  const dt = Math.min(now - lastTime, 100);
  lastTime = now;

  views.update(state, dt);
  renderer.render({
    state,
    views,
    camera,
    hoverTile,
    selectedId: controller.selected,
    ghost: controller.getGhost(hoverTile),
    now,
  });
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
refreshUi();
requestAnimationFrame(frame);
