// Paleta de colores de Pixel Springs: desierto de día, neones de noche.
//
// Todos los sprites generados por código sacan sus colores de aquí, así que
// cambiar el ambiente del juego es tocar este archivo. En pixel art conviene
// usar pocos colores y fuertes: cada uno tiene un papel claro.

export const PALETTE = {
  /** Contorno de todos los sprites: marrón casi negro (más cálido que el negro puro). */
  outline: '#2a1a14',

  // Desierto
  sand: '#e8c48a',
  sandDark: '#d4a96a',
  ochre: '#c98a3a',
  terracotta: '#b5532f',
  terracottaDark: '#8f3f22',
  adobe: '#e0b07a',
  adobeLight: '#ecc28e',
  cream: '#f6e7c8',

  // Cielo de día (de arriba abajo) y horizonte
  sky: ['#3fb8af', '#5cc8bd', '#7fd6cb', '#a6e3d4'],
  dunes: '#e2b77c',
  dunesShade: '#cf9f62',

  // Noche y neones (se usarán en el ciclo día/noche)
  night: '#1a1f3a',
  neonPink: '#ff4fa3',
  neonCyan: '#39e6ff',
  neonYellow: '#ffe14d',

  // Acentos
  turquoise: '#2f8f8a',
  turquoiseLight: '#5cc8bd',
} as const;
