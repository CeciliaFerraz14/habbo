// Punto de entrada del cliente: crea las piezas y las conecta entre sí.
import {
  createInitialState,
  DEFAULT_LOOK,
  GAME_NAME,
  isValidLook,
  START_SCENE,
  START_TILE,
  type Avatar,
  type AvatarLook,
  type GameState,
} from '@juego/shared';
import { centerCamera, followCamera, type Camera } from './engine/camera';
import { DayClock, PHASE_NAMES } from './engine/daylight';
import { attachInput } from './engine/input';
import { tileToScreen, type Point } from './engine/iso';
import { Renderer } from './engine/renderer';
import { AvatarViews } from './game/avatarViews';
import { GameController } from './game/controller';
import { LocalTransport, type Transport } from './game/transport';
import { WALL_HEIGHT } from './sprites/room';
import { createAvatarEditor } from './ui/avatarEditor';
import { createBusinessWindow } from './ui/businessWindow';
import { ChatBubbles } from './ui/chatBubbles';
import { createChatHistory } from './ui/chatHistory';
import { createFurniPanel } from './ui/furniPanel';
import { createHud } from './ui/hud';
import { createWallet } from './ui/economyUi';
import { createInventoryWindow } from './ui/inventoryWindow';
import { createRentWindow } from './ui/rentWindow';
import { showToast } from './ui/toast';
import './ui/styles.css';

/**
 * Escala de píxel: cada píxel "lógico" del juego ocupa SCALE x SCALE píxeles
 * reales de pantalla. Dibujamos en un canvas pequeño y el navegador lo amplía
 * sin suavizar (image-rendering: pixelated), lo que da el aspecto retro.
 */
const SCALE = 2;

/** Altura que asoman los edificios más altos de la calle por encima del suelo. */
const STREET_EXTRA_TOP = 90;

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

/**
 * El aspecto se recuerda en este navegador (localStorage) para no perderlo al
 * recargar. Es solo una comodidad de la fase 1: en la fase 2 lo guardará el
 * servidor. localStorage puede fallar (modo privado...), por eso el try/catch.
 */
const LOOK_STORAGE_KEY = 'pixel-springs:look';

function loadLook(): AvatarLook {
  try {
    const saved = JSON.parse(localStorage.getItem(LOOK_STORAGE_KEY) ?? 'null');
    if (saved && isValidLook(saved)) return saved;
  } catch {
    // Sin acceso o datos corruptos: usamos el aspecto por defecto.
  }
  return DEFAULT_LOOK;
}

function saveLook(look: AvatarLook): void {
  try {
    localStorage.setItem(LOOK_STORAGE_KEY, JSON.stringify(look));
  } catch {
    // No pasa nada si no se puede guardar.
  }
}

const player: Avatar = {
  id: PLAYER_ID,
  name: 'Tú',
  sceneId: START_SCENE,
  ...START_TILE,
  direction: 'SE',
  path: [],
  look: loadLook(),
  isBot: false,
  sitting: false,
};

// --- Piezas del juego ---------------------------------------------------------

const transport: Transport = new LocalTransport(createInitialState());
transport.dispatch({ type: 'JOIN', avatar: player });

// Copia local del último estado recibido. El renderer y la interfaz leen de aquí.
// subscribe() llama enseguida con el estado actual, así que nunca queda sin asignar.
let state!: GameState;

const renderer = new Renderer(ctx);
const views = new AvatarViews();
const controller = new GameController(
  transport,
  PLAYER_ID,
  () => state,
  (p) => renderer.pickAt(p.x, p.y),
  {
    notify: showToast,
    openRent: (lotId) => rentWindow.open(lotId, state, PLAYER_ID),
    openBusiness: (lotId) => {
      businessWindow.open(lotId);
      businessWindow.update(state, PLAYER_ID);
    },
  },
);

const clock = new DayClock();
let camera: Camera = { originX: 0, originY: 0 };
let hoverTile: Point | null = null;
/** Escena que se está mostrando; cuando el jugador cambia de escena, recolocamos la cámara. */
let shownSceneId: string | null = null;

/** Escena en la que está el jugador. */
function playerSceneId(): string {
  return state.avatars[PLAYER_ID]?.sceneId ?? START_SCENE;
}

// --- Interfaz -----------------------------------------------------------------

const wallet = createWallet();
const rentWindow = createRentWindow((lotId, business) => {
  transport.dispatch({ type: 'RENT_LOT', avatarId: PLAYER_ID, lotId, business });
  showToast('¡Local alquilado! Ya puedes entrar.');
});
const businessWindow = createBusinessWindow({
  collectMaterials: (lotId) =>
    transport.dispatch({ type: 'COLLECT_MATERIALS', avatarId: PLAYER_ID, lotId }),
  craft: (lotId, defId) => transport.dispatch({ type: 'CRAFT', avatarId: PLAYER_ID, lotId, defId }),
  collectCrafted: (lotId) =>
    transport.dispatch({ type: 'COLLECT_CRAFTED', avatarId: PLAYER_ID, lotId }),
});
const inventory = createInventoryWindow((itemId) => controller.startPlacing(itemId));
const furniPanel = createFurniPanel({
  onMove: () => controller.startMovingSelected(),
  onRotate: () => controller.rotate(),
  onPickUp: () => controller.pickUpSelected(),
  onClose: () => controller.cancel(),
});

const avatarEditor = createAvatarEditor((look) => {
  transport.dispatch({ type: 'SET_LOOK', avatarId: PLAYER_ID, look });
  saveLook(look);
});

const chatHistory = createChatHistory();
let bubbles: ChatBubbles | null = null;

createHud((text) => transport.dispatch({ type: 'SAY', avatarId: PLAYER_ID, text }), [
  { label: 'Inventario', onClick: () => inventory.win.toggle() },
  { label: 'Avatar', onClick: () => avatarEditor.win.toggle(), hint: 'Cambiar tu aspecto' },
  { label: 'Chat', onClick: () => chatHistory.win.toggle(), hint: 'Historial del chat' },
]);

/** Refleja en la interfaz el estado del juego y la selección actual. */
function refreshUi(): void {
  const sceneId = playerSceneId();
  if (sceneId !== shownSceneId) {
    shownSceneId = sceneId;
    resize(); // recentra la cámara en la escena nueva
  }
  updateLocationSign();
  inventory.update(state.inventories[PLAYER_ID] ?? []);
  wallet.update(state.money[PLAYER_ID] ?? 0, state.materials[PLAYER_ID] ?? {});
  rentWindow.update(state);
  businessWindow.update(state, PLAYER_ID);
  const me = state.avatars[PLAYER_ID];
  if (me) avatarEditor.update(me.look);
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
  updateCamera();
}

/**
 * Los interiores caben en pantalla: se centran. La calle es más grande que la
 * pantalla: la cámara sigue la posición VISUAL del jugador (la interpolada),
 * así se mueve suave mientras camina.
 */
function updateCamera(): void {
  const scene = state.scenes[playerSceneId()];
  if (scene.kind === 'interior') {
    camera = centerCamera(scene, canvas.width, canvas.height, WALL_HEIGHT);
    return;
  }
  const view = views.get(PLAYER_ID);
  const player = state.avatars[PLAYER_ID];
  const focus = view ?? player ?? { x: 0, y: 0 };
  const p = tileToScreen(focus.x + 0.5, focus.y + 0.5);
  camera = followCamera(scene, p.x, p.y, canvas.width, canvas.height, STREET_EXTRA_TOP);
}

/** Bucle principal: se ejecuta en cada fotograma (normalmente 60 veces por segundo). */
let lastTime = performance.now();
function frame(now: number): void {
  // Limitamos dt por si la pestaña estuvo en segundo plano mucho rato.
  const dt = Math.min(now - lastTime, 100);
  lastTime = now;

  const sceneId = playerSceneId();
  views.update(state, dt);
  updateCamera();
  renderer.render({
    state,
    sceneId,
    views,
    camera,
    hoverTile,
    selectedId: controller.selected,
    ghost: controller.getGhost(hoverTile),
    now,
    phase: clock.phase(),
  });
  bubbles?.update(state, sceneId, views, renderer, camera, canvasToScreen, now);
  requestAnimationFrame(frame);
}

/** Convierte un punto del canvas (resolución reducida) a píxeles de la pantalla. */
function canvasToScreen(p: Point): Point {
  const scale = canvas.clientWidth / canvas.width;
  return { x: p.x * scale, y: p.y * scale };
}

// Solo en desarrollo: deja el estado accesible desde la consola del navegador
// (escribe `game.state` en las DevTools para inspeccionarlo).
if (import.meta.env.DEV) {
  Object.assign(window, {
    game: {
      get state() {
        return state;
      },
      dispatch: transport.dispatch.bind(transport),
    },
  });
}

/** Cartel bajo la marquesina: dónde estás y qué hora es. */
function updateLocationSign(): void {
  const scene = state.scenes[playerSceneId()];
  const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const forced = clock.isForced ? ` (${PHASE_NAMES[clock.phase()]})` : '';
  locationSign.textContent = `${scene?.name ?? ''} · ${time}${forced}`;
}
setInterval(updateLocationSign, 10_000);

// Tecla N (depuración): fuerza día, atardecer, noche, amanecer o vuelve a la hora real.
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key !== 'n' && e.key !== 'N') return;
  const forced = clock.cycleOverride();
  showToast(forced ? `Forzado: ${PHASE_NAMES[forced]}` : 'Hora real del sistema');
  updateLocationSign();
});

window.addEventListener('resize', resize);
resize();
refreshUi();
requestAnimationFrame(frame);
