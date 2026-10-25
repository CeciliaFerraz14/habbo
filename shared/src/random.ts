// Números "aleatorios" deterministas.
//
// La simulación no puede usar Math.random(): el servidor y los clientes
// obtendrían resultados distintos. En su lugar usamos un generador
// pseudoaleatorio: una fórmula que, a partir de un número (la SEMILLA),
// produce un valor que parece aleatorio y la semilla siguiente. Con la misma
// semilla de partida, la secuencia es siempre la misma.
//
// La semilla vive en el estado (state.seed), así que forma parte de la
// simulación como cualquier otro dato.

/**
 * Un paso del algoritmo mulberry32 (rápido y suficiente para un juego).
 * Devuelve un número en [0, 1) y la semilla siguiente.
 */
export function nextRandom(seed: number): [value: number, nextSeed: number] {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/**
 * Crea una función random() que va avanzando una semilla. Al terminar,
 * `seed()` devuelve la semilla final para guardarla en el estado.
 */
export function createRandom(seed: number): { random: () => number; seed: () => number } {
  let current = seed;
  return {
    random: () => {
      const [value, next] = nextRandom(current);
      current = next;
      return value;
    },
    seed: () => current,
  };
}
