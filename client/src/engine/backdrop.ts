// Fondo del desierto para cada momento del día: cielo en franjas de color
// (sin degradado suave, que no sería pixel art), dunas en el horizonte y, de
// noche, estrellas.
import { PALETTE } from '../sprites/palette';
import type { DayPhase } from './daylight';

interface SkyColors {
  /** Franjas del cielo, de arriba abajo. */
  bands: readonly string[];
  dunes: string;
  dunesShade: string;
  stars: boolean;
}

const SKIES: Record<'day' | 'twilight' | 'night', SkyColors> = {
  day: { bands: PALETTE.sky, dunes: PALETTE.dunes, dunesShade: PALETTE.dunesShade, stars: false },
  // Atardecer y amanecer: cielo de puesta de sol, de violeta a mostaza.
  twilight: {
    bands: ['#3f4a8a', '#8a4f8a', '#d0606a', '#f09a5a'],
    dunes: '#c08a5a',
    dunesShade: '#a06a48',
    stars: false,
  },
  night: {
    bands: ['#0e1230', '#141a40', '#1a2150', '#232a5c'],
    dunes: '#3a3050',
    dunesShade: '#2e2640',
    stars: true,
  },
};

function skyFor(phase: DayPhase): SkyColors {
  if (phase === 'day') return SKIES.day;
  if (phase === 'night') return SKIES.night;
  return SKIES.twilight;
}

/** Genera el fondo para un tamaño de canvas y una fase. */
export function createBackdrop(width: number, height: number, phase: DayPhase): HTMLCanvasElement {
  const sky = skyFor(phase);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d')!;

  // Cielo: franjas horizontales, más claras cerca del horizonte.
  const horizon = Math.round(height * 0.62);
  const bandHeight = Math.ceil(horizon / sky.bands.length);
  sky.bands.forEach((color, i) => {
    g.fillStyle = color;
    g.fillRect(0, i * bandHeight, width, bandHeight);
  });

  // Estrellas: posiciones "aleatorias" pero siempre las mismas, con un
  // generador pseudoaleatorio muy simple (congruencial lineal) de semilla fija.
  if (sky.stars) {
    let seed = 12345;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const count = Math.floor((width * horizon) / 900);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(random() * width);
      const y = Math.floor(random() * (horizon - 10));
      g.fillStyle = random() < 0.15 ? PALETTE.neonYellow : '#e8ecff';
      g.fillRect(x, y, 1, 1);
    }
  }

  // Dunas: para cada columna calculamos una altura con dos ondas (seno) de
  // distinto tamaño, redondeada a múltiplos de 2 para que tenga escalones pixel.
  for (let x = 0; x < width; x++) {
    const wave = Math.sin(x / 37) * 8 + Math.sin(x / 13) * 3;
    const top = horizon - 6 + Math.round(wave / 2) * 2;
    g.fillStyle = sky.dunes;
    g.fillRect(x, top, 1, height - top);
    g.fillStyle = sky.dunesShade;
    g.fillRect(x, top + 10, 1, height - top - 10);
  }

  return canvas;
}
