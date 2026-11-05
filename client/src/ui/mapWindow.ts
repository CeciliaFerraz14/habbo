// Mapa del pueblo: todo Pixel Springs visto desde arriba (la calle, la
// gasolinera, el Ensanche, la avenida y sus plazas), con los locales del color
// de su neón, tu casa y tus locales recuadrados y un punto por cada jugador.
// Tocar el mapa te lleva andando hasta allí (si tocas un edificio, hasta su
// puerta).
import {
  areaNameAt,
  ECONOMY,
  getFootprint,
  isNpcId,
  SCENES,
  type FurniItem,
  type GameState,
} from '@juego/shared';
import { PixelWindow } from './window';

export interface MapWindow {
  win: PixelWindow;
  update: (state: GameState, playerId: string) => void;
}

/** Colores del suelo, por carácter del mapa `ground` de la calle. */
const GROUND: Record<string, string> = {
  '.': '#e4c38e',
  s: '#d8cfbd',
  r: '#4a4448',
  '-': '#4a4448',
  p: '#efe2c8',
  c: '#d9875a',
};
const LINE = '#f2c94c';
const OUTLINE = '#2a1a14';
const ME = '#ff3d8b';

/** Color de cada estructura en el mapa (los locales se pintan aparte, con su neón). */
const STRUCTURE: Partial<Record<string, string>> = {
  trailer: '#f3ead8',
  gas_station: '#d8443c',
  solar: '#b48a5c',
  fountain: '#4fa3ff',
  park_bench: '#8a5a34',
  saguaro: '#3f9b4a',
  welcome_sign: '#c9b99a',
  mayor_statue: '#c9a227',
};

export function createMapWindow(onGo: (x: number, y: number) => void): MapWindow {
  const width = Math.min(window.innerWidth - 16, 900);
  const win = new PixelWindow({
    title: 'Mapa del pueblo',
    x: Math.max(8, (window.innerWidth - width) / 2),
    y: 60,
    width,
  });
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;image-rendering:pixelated;display:block;cursor:pointer';
  const legend = document.createElement('p');
  legend.className = 'hint';
  win.body.append(canvas, legend);
  const ctx = canvas.getContext('2d')!;

  /** Píxeles por baldosa con los que se dibujó el último mapa. */
  let scale = 1;
  let onStreet = false;

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) * (canvas.width / rect.width)) / scale);
    const y = Math.floor(((e.clientY - rect.top) * (canvas.height / rect.height)) / scale);
    if (!onStreet) return;
    onGo(x, y);
    win.close();
  });

  const update = (state: GameState, playerId: string) => {
    if (!win.isOpen) return;
    const street = state.scenes[SCENES.street];
    if (!street?.ground) return;
    // El ancho de la ventana manda: cuantos más píxeles por baldosa quepan, mejor.
    scale = Math.max(4, Math.floor((win.body.clientWidth || width - 24) / street.width));
    if (canvas.width !== street.width * scale) canvas.width = street.width * scale;
    if (canvas.height !== street.depth * scale) canvas.height = street.depth * scale;
    const px = scale;
    const tile = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x * px, y * px, w * px, h * px);
    };

    // Suelo, con la raya central de las carreteras.
    street.ground.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        tile(x, y, 1, 1, GROUND[row[x]] ?? GROUND['.']);
        if (row[x] === '-') {
          ctx.fillStyle = LINE;
          ctx.fillRect(x * px + px / 4, y * px + px / 2 - 1, px / 2, 2);
        }
      }
    });

    // Edificios y decoración. Tu caravana y tus locales, recuadrados.
    const mine = (item: FurniItem) => {
      if (item.id === `trailer-building:${playerId}`) return true;
      const lot = state.lots[item.id.replace(/-building$/, '')];
      return !!lot && (lot.ownerId === playerId || lot.builtBy === playerId);
    };
    for (const item of Object.values(state.furniture)) {
      if (item.sceneId !== SCENES.street) continue;
      const color = item.defId === 'shop' ? shopColor(state, item) : STRUCTURE[item.defId];
      if (!color) continue;
      const f = getFootprint(item);
      const big = f.width > 1 || f.depth > 1;
      tile(f.x, f.y, f.width, f.depth, color);
      if (big) {
        ctx.strokeStyle = mine(item) ? ME : OUTLINE;
        ctx.lineWidth = mine(item) ? 3 : 1;
        ctx.strokeRect(f.x * px + 0.5, f.y * px + 0.5, f.width * px - 1, f.depth * px - 1);
      }
    }

    // Coches y autobuses.
    for (const car of Object.values(state.vehicles)) {
      tile(car.x, car.y, car.kind === 'bus' ? 3 : 2, 1, car.color);
    }

    // Nombres de las zonas.
    ctx.font = `${Math.max(9, px * 2)}px "Pixelify Sans", sans-serif`;
    ctx.textBaseline = 'middle';
    const label = (text: string, x: number, y: number) => {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff6e0';
      ctx.strokeText(text, x * px, y * px);
      ctx.fillStyle = OUTLINE;
      ctx.fillText(text, x * px, y * px);
    };
    label('Calle Mayor', 8, 8.5);
    const solars = Object.values(state.furniture).filter((f) => f.defId === 'solar' || f.id.startsWith('lot-e'));
    if (solars.length > 0) label('El Ensanche', Math.min(...solars.map((f) => f.x)), 8.5);
    for (const f of Object.values(state.furniture)) {
      if (!/^plaza-\d+:fountain$/.test(f.id)) continue;
      const name = areaNameAt(state, f.x, f.y);
      if (name) label(name, f.x - name.length * 0.45, f.y - 2);
    }
    if (street.depth > 20) label('Avenida de las Plazas', 8, 22.5);

    // Gente: los vecinos y viajeros, pequeños; los jugadores, más grandes; tú, en rosa.
    const me = state.avatars[playerId];
    for (const avatar of Object.values(state.avatars)) {
      if (avatar.sceneId !== SCENES.street || avatar.id === playerId) continue;
      const r = avatar.isBot || isNpcId(avatar.id) ? px * 0.3 : px * 0.45;
      dot(ctx, (avatar.x + 0.5) * px, (avatar.y + 0.5) * px, r, avatar.isBot ? '#6a5c56' : '#ffffff');
    }
    // Si estás dentro de un edificio, sales en su puerta.
    const where = me?.sceneId === SCENES.street ? me : street.doors.find((d) => d.to.sceneId === me?.sceneId);
    if (where) dot(ctx, (where.x + 0.5) * px, (where.y + 0.5) * px, px * 0.8, ME);

    onStreet = me?.sceneId === SCENES.street;
    legend.textContent = onStreet
      ? 'Toca un sitio del mapa para ir andando (si es un edificio, hasta su puerta). En rosa, tú y lo tuyo.'
      : 'En rosa, tú y lo tuyo. Sal a la calle para ir andando a cualquier sitio tocando el mapa.';
  };

  return { win, update };
}

/** Color de un local en el mapa: el de su neón si está abierto; gris si está cerrado; amarillo en obras. */
function shopColor(state: GameState, item: FurniItem): string {
  if (item.variant === 'construction') return '#f0c020';
  const lot = state.lots[item.id.replace(/-building$/, '')];
  return lot?.business ? ECONOMY.businesses[lot.business].neon : '#9a8a7a';
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}
