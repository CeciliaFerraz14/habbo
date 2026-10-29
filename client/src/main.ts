// Punto de entrada del cliente: crea las piezas y las conecta entre sí.
import {
  DEFAULT_LOOK,
  GAME_NAME,
  isValidLook,
  SCENES,
  subsidyTicksLeft,
  trailerSceneId,
  type AvatarLook,
  type GameState,
} from '@juego/shared';
import { followCamera, type Camera } from './engine/camera';
import { DayClock, PHASE_NAMES } from './engine/daylight';
import { attachInput } from './engine/input';
import { tileToScreen, type Point } from './engine/iso';
import { Renderer } from './engine/renderer';
import { AvatarViews } from './game/avatarViews';
import { signOut, supabase } from './game/auth';
import { connect, type Connection } from './game/connection';
import { GameController } from './game/controller';
import { DoorStates } from './game/doorStates';
import { VehicleViews } from './game/vehicleViews';
import { WALL_HEIGHT } from './sprites/room';
import { createAvatarEditor } from './ui/avatarEditor';
import { createBusinessWindow } from './ui/businessWindow';
import { ChatBubbles } from './ui/chatBubbles';
import { createChatHistory } from './ui/chatHistory';
import { createFurniPanel } from './ui/furniPanel';
import { createHud } from './ui/hud';
import { createWallet } from './ui/economyUi';
import { createInventoryWindow } from './ui/inventoryWindow';
import { PriceTags } from './ui/priceTags';
import { createRentWindow } from './ui/rentWindow';
import { createShopWindow } from './ui/shopWindow';
import { createSupplierWindow } from './ui/supplierWindow';
import { showToast } from './ui/toast';
import logoUrl from './assets/pixel-springs-logo.png';

/**
 * Zoom = escala de píxel: cada píxel "lógico" del juego ocupa scale x scale
 * píxeles reales de pantalla. Dibujamos en un canvas pequeño y el navegador lo
 * amplía sin suavizar (image-rendering: pixelated), lo que da el aspecto retro.
 *
 * Solo permitimos escalas ENTERAS: con x1,5 unos píxeles se verían de 1 y
 * otros de 2 y el pixel art quedaría deformado.
 */
const ZOOM_LEVELS = [1, 2, 3, 4];
let scale = 2;

/** Altura que asoman los edificios más altos de la calle por encima del suelo. */
const STREET_EXTRA_TOP = 90;

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ctx = canvas.getContext('2d')!;
const uiRoot = document.querySelector<HTMLDivElement>('#ui')!;
const fade = document.querySelector<HTMLDivElement>('#fade')!;

document.title = GAME_NAME;

// Pantalla de carga (está en index.html): aquí solo escribimos el estado.
const splash = document.querySelector<HTMLDivElement>('#splash')!;
const splashContent = splash.querySelector<HTMLDivElement>('.splash-content')!;
const splashStatus = splash.querySelector<HTMLParagraphElement>('.splash-status')!;

// Logo del juego y, debajo, el nombre del sitio donde estás.
const logo = document.createElement('img');
logo.id = 'logo';
logo.src = logoUrl;
logo.alt = GAME_NAME;
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

// --- Conexión ---------------------------------------------------------------

/**
 * Antes de nada, nos conectamos: al servidor (multijugador) o a la simulación
 * local, según la configuración (ver game/connection.ts). Usamos `await` en lo
 * alto del módulo: el resto del juego no arranca hasta tener conexión.
 */
let connection: Connection;
splashStatus.textContent = 'Conectando…';
try {
  connection = await connect(loadLook(), splashContent);
} catch (error) {
  // Si la sesión guardada ya no vale, la borramos para que salga el login.
  if ((error as Error).message === 'Sesión no válida') {
    await signOut();
    location.reload();
  }
  splashStatus.textContent = `No se puede conectar: ${(error as Error).message}`;
  throw error;
}
window.addEventListener('game-kicked', (e) => {
  showToast((e as CustomEvent<string>).detail);
  locationSign.textContent = 'Desconectado';
});
const { transport } = connection;
/** Id del avatar que controla este jugador (en multijugador lo asigna el servidor). */
const PLAYER_ID = connection.playerId;

// --- Piezas del juego ---------------------------------------------------------

// Copia local del último estado recibido. El renderer y la interfaz leen de aquí.
// subscribe() llama enseguida con el estado actual, así que nunca queda sin asignar.
let state!: GameState;

const renderer = new Renderer(ctx);
const views = new AvatarViews();
const vehicleViews = new VehicleViews();
const doors = new DoorStates();
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
    openShop: (lotId) => {
      shopWindow.open(lotId);
      shopWindow.update(state, PLAYER_ID);
    },
    openSupplier: () => {
      supplierWindow.open();
      supplierWindow.update(state, PLAYER_ID);
    },
  },
);

const clock = new DayClock();
let camera: Camera = { originX: 0, originY: 0 };

/**
 * Desplazamiento que el jugador ha añadido arrastrando el mapa, en píxeles del
 * canvas. Se suma a la cámara normal (que sigue al jugador) y vuelve a 0 al
 * cambiar de escena o al echar a andar.
 */
const pan = { x: 0, y: 0 };
let playerWasWalking = false;

let hoverTile: Point | null = null;
/** Escena que se está mostrando; cuando el jugador cambia de escena, recolocamos la cámara. */
let shownSceneId: string | null = null;
/** Duración del fundido al cambiar de escena, en milisegundos. */
const SCENE_FADE_MS = 400;

/** Escena en la que está el jugador. */
function playerSceneId(): string {
  return state.avatars[PLAYER_ID]?.sceneId ?? SCENES.street;
}

// --- Interfaz -----------------------------------------------------------------

const wallet = createWallet(() =>
  transport.dispatch({ type: 'CLAIM_SUBSIDY', avatarId: PLAYER_ID }),
);
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
  listItem: (lotId, itemId, price) =>
    transport.dispatch({ type: 'LIST_ITEM', avatarId: PLAYER_ID, lotId, itemId, price }),
  setPrice: (itemId, price) =>
    transport.dispatch({ type: 'SET_PRICE', avatarId: PLAYER_ID, itemId, price }),
  setFacade: (lotId, facade) =>
    transport.dispatch({ type: 'SET_FACADE', avatarId: PLAYER_ID, lotId, facade }),
  stockLot: (lotId) => transport.dispatch({ type: 'STOCK_LOT', avatarId: PLAYER_ID, lotId }),
  setServicePrice: (lotId, price) =>
    transport.dispatch({ type: 'SET_SERVICE_PRICE', avatarId: PLAYER_ID, lotId, price }),
  // Retirar un producto es recogerlo: vuelve al inventario.
  unlist: (itemId) => transport.dispatch({ type: 'PICKUP_FURNI', avatarId: PLAYER_ID, itemId }),
});
const shopWindow = createShopWindow((itemId) => {
  const before = state.money[PLAYER_ID];
  transport.dispatch({ type: 'BUY_ITEM', avatarId: PLAYER_ID, itemId });
  if (state.money[PLAYER_ID] !== before) showToast('¡Comprado! Está en tu inventario.');
});
const supplierWindow = createSupplierWindow((material, quantity) =>
  transport.dispatch({ type: 'BUY_MATERIAL', avatarId: PLAYER_ID, material, quantity }),
);
const priceTags = new PriceTags();

/**
 * Avisos del juego para este jugador ("Has vendido...", "Alquiler...").
 * Viven en el estado; aquí recordamos cuáles hemos enseñado ya.
 */
const seenNotices = new Set<string>();
let noticesReady = false;
function showNewNotices(): void {
  for (const notice of state.notices) {
    if (seenNotices.has(notice.id)) continue;
    seenNotices.add(notice.id);
    // Los que ya existían al arrancar no se muestran.
    if (noticesReady && notice.avatarId === PLAYER_ID) showToast(notice.text);
  }
  noticesReady = true;
}
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
  // Con cuenta de Supabase, botón para cerrar sesión.
  ...(supabase && connection.online
    ? [{ label: 'Salir', onClick: () => void signOut().then(() => location.reload()), hint: 'Cerrar sesión' }]
    : []),
]);

/** Refleja en la interfaz el estado del juego y la selección actual. */
function refreshUi(): void {
  const sceneId = playerSceneId();
  if (sceneId !== shownSceneId) {
    // Fundido al entrar o salir de un local: el servidor cambia de escena al
    // instante, así que solo podemos fundir hacia dentro. La capa se pone negra
    // de golpe y vuelve a la escena en 4 pasos, con aire retro. No se hace con
    // la primera escena al cargar ni si el usuario prefiere menos movimiento.
    const previousSceneId = shownSceneId;
    if (previousSceneId !== null && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      fade.animate([{ opacity: 1 }, { opacity: 0 }], { duration: SCENE_FADE_MS, easing: 'steps(4, end)' });
    }
    shownSceneId = sceneId;
    resetPan(); // en una escena nueva, la cámara vuelve al jugador
    resize();
  }
  updateLocationSign();
  inventory.update(state.inventories[PLAYER_ID] ?? []);
  wallet.update(
    state.money[PLAYER_ID] ?? 0,
    state.materials[PLAYER_ID] ?? {},
    subsidyTicksLeft(state, PLAYER_ID),
  );
  rentWindow.update(state);
  businessWindow.update(state, PLAYER_ID);
  shopWindow.update(state, PLAYER_ID);
  supplierWindow.update(state, PLAYER_ID);
  showNewNotices();
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
  onPan: (dx, dy) => {
    pan.x += dx;
    pan.y += dy;
  },
  onZoom: (direction) => setZoom(direction),
});

// --- Zoom y desplazamiento manual de la cámara ------------------------------

function resetPan(): void {
  pan.x = 0;
  pan.y = 0;
}

/** Acerca (+1) o aleja (-1) un nivel de zoom. */
function setZoom(direction: 1 | -1): void {
  const i = ZOOM_LEVELS.indexOf(scale);
  const next = ZOOM_LEVELS[Math.max(0, Math.min(ZOOM_LEVELS.length - 1, i + direction))];
  if (next === scale) return;
  // Al cambiar de escala, el canvas cambia de tamaño: el desplazamiento
  // manual se ajusta en proporción para que no salte la vista.
  pan.x = (pan.x * scale) / next;
  pan.y = (pan.y * scale) / next;
  scale = next;
  resize();
}

// Botones de zoom (abajo a la derecha) y teclas + y -.
const zoomBar = document.createElement('div');
zoomBar.id = 'zoom';
for (const [label, direction, hint] of [
  ['+', 1, 'Acercar (rueda o tecla +)'],
  ['−', -1, 'Alejar (rueda o tecla -)'],
] as const) {
  const button = document.createElement('button');
  button.className = 'btn';
  button.textContent = label;
  button.title = hint;
  button.addEventListener('click', () => setZoom(direction));
  zoomBar.append(button);
}
uiRoot.append(zoomBar);
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === '+') setZoom(1);
  if (e.key === '-') setZoom(-1);
});

/** Ajusta la resolución interna del canvas al tamaño de la ventana y al zoom. */
function resize(): void {
  canvas.width = Math.floor(window.innerWidth / scale);
  canvas.height = Math.floor(window.innerHeight / scale);
  // Al cambiar el tamaño, el contexto se reinicia: hay que volver a desactivar el suavizado.
  ctx.imageSmoothingEnabled = false;
  updateCamera();
}

/**
 * La cámara sigue la posición VISUAL del jugador (la interpolada), así se
 * mueve suave mientras camina. followCamera() centra la escena si cabe entera
 * en pantalla (un interior con poco zoom) y si no, la sigue sin enseñar
 * demasiado vacío por los bordes. Encima sumamos el desplazamiento manual.
 */
function updateCamera(): void {
  const scene = state.scenes[playerSceneId()];
  const view = views.get(PLAYER_ID);
  const player = state.avatars[PLAYER_ID];
  const focus = view ?? player ?? { x: 0, y: 0 };
  const p = tileToScreen(focus.x + 0.5, focus.y + 0.5);
  // Las paredes de los interiores y los edificios de la calle asoman por arriba.
  const extraTop = scene.kind === 'interior' ? WALL_HEIGHT : STREET_EXTRA_TOP;
  const base = followCamera(scene, p.x, p.y, canvas.width, canvas.height, extraTop);

  // El arrastre no puede llevarse la escena más de media pantalla.
  pan.x = Math.max(-canvas.width / 2, Math.min(canvas.width / 2, pan.x));
  pan.y = Math.max(-canvas.height / 2, Math.min(canvas.height / 2, pan.y));
  camera = {
    originX: Math.round(base.originX + pan.x),
    originY: Math.round(base.originY + pan.y),
  };
}

/** Bucle principal: se ejecuta en cada fotograma (normalmente 60 veces por segundo). */
let lastTime = performance.now();
function frame(now: number): void {
  // Limitamos dt por si la pestaña estuvo en segundo plano mucho rato.
  const dt = Math.min(now - lastTime, 100);
  lastTime = now;

  const sceneId = playerSceneId();
  views.update(state, dt);
  // Si el jugador echa a andar, la cámara deja de estar desplazada a mano.
  const walking = (state.avatars[PLAYER_ID]?.path.length ?? 0) > 0;
  if (walking && !playerWasWalking) resetPan();
  playerWasWalking = walking;
  vehicleViews.update(state, dt);
  updateCamera();
  renderer.render({
    state,
    sceneId,
    views,
    vehicles: vehicleViews,
    openDoors: doors.update(state, sceneId, views, now),
    camera,
    hoverTile,
    selectedId: controller.selected,
    ghost: controller.getGhost(hoverTile),
    now,
    phase: clock.phase(),
  });
  bubbles?.update(state, sceneId, views, renderer, camera, canvasToScreen, now);
  priceTags.update(state, sceneId, renderer, canvasToScreen);
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
  // Tu propia caravana se llama "Tu caravana" (para los demás, "Caravana de ...").
  const name = scene?.id === trailerSceneId(PLAYER_ID) ? 'Tu caravana' : (scene?.name ?? '');
  locationSign.textContent = `${name} · ${time}${forced}`;
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
// Ya hay estado y bucle de dibujo: fuera la pantalla de carga.
splash.remove();
