// =============================================================================
//  ORDENACIÓN DE PROFUNDIDAD (depth sorting)
// =============================================================================
//
// En canvas no hay "profundidad": lo último que se dibuja queda encima. Para
// que un avatar se vea DETRÁS de un sofá, hay que dibujar primero al avatar y
// luego el sofá. Es el "algoritmo del pintor": de lo más lejano a lo más cercano.
//
// En isométrico, el espectador está en la esquina de +x, +y y arriba (+z).
// Así que algo está más LEJOS cuanto más pequeños son su x, su y o su z.
//
// Con objetos de 1 baldosa bastaría ordenar por x + y de su centro. Pero con
// objetos de varias baldosas falla. Ejemplo: un mueble largo de 1x4 que ocupa
// de (3,0) a (3,3) y un avatar en (2,3), justo a su izquierda. Por x + y del
// centro, el mueble da 3.5 + 2 = 5.5 y el avatar 2.5 + 3.5 = 6, así que el
// avatar se dibujaría encima. Pero el avatar tiene x menor: está DETRÁS.
//
// Solución: comparar las cajas que ocupan. A está detrás de B si hay un eje en
// el que A queda entero "antes" que B:
//
//   A.x1 <= B.x0   (A termina antes de que empiece B en el eje X)
//   A.y1 <= B.y0   (ídem en Y)
//   A.z1 <= B.z0   (A está entero por debajo de B)
//
// Si se cumple en ambos sentidos (A detrás de B por un eje y B detrás de A por
// otro), sus dibujos no se solapan en pantalla y el orden da igual.
//
// Con esas relaciones "A antes que B" se forma un grafo, y lo recorremos con
// una ORDENACIÓN TOPOLÓGICA (algoritmo de Kahn): vamos dibujando objetos que
// no tienen a nadie pendiente detrás de ellos.
// =============================================================================

export interface DepthBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Altura inferior y superior. Si se omiten, la caja va del suelo al infinito. */
  z0?: number;
  z1?: number;
}

function isBehind(a: DepthBox, b: DepthBox): boolean {
  return a.x1 <= b.x0 || a.y1 <= b.y0 || (a.z1 ?? Infinity) <= (b.z0 ?? 0);
}

/**
 * Devuelve los elementos ordenados de atrás hacia delante.
 * @param getBox caja que ocupa cada elemento.
 * @param tieKey desempate cuando el orden da igual: menor primero.
 */
export function depthSort<T>(
  items: readonly T[],
  getBox: (item: T) => DepthBox,
  tieKey: (item: T, index: number) => number,
): T[] {
  const n = items.length;
  const boxes = items.map(getBox);
  const keys = items.map(tieKey);

  // Construimos el grafo: behindCount[i] = cuántos elementos deben dibujarse antes que i.
  const before: number[][] = Array.from({ length: n }, () => []); // before[a] = los que van después de a
  const behindCount = new Array<number>(n).fill(0);
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      const aBehind = isBehind(boxes[a], boxes[b]);
      const bBehind = isBehind(boxes[b], boxes[a]);
      if (aBehind && !bBehind) {
        before[a].push(b);
        behindCount[b]++;
      } else if (bBehind && !aBehind) {
        before[b].push(a);
        behindCount[a]++;
      }
    }
  }

  // Algoritmo de Kahn: en cada vuelta sacamos, de los que ya no tienen nada
  // pendiente detrás, el de menor tieKey.
  const result: T[] = [];
  const done = new Array<boolean>(n).fill(false);
  for (let step = 0; step < n; step++) {
    let pick = -1;
    for (let i = 0; i < n; i++) {
      if (done[i] || behindCount[i] > 0) continue;
      if (pick === -1 || keys[i] < keys[pick]) pick = i;
    }
    // Si hay un ciclo (no debería pasar con cajas que no se atraviesan),
    // rompemos el empate cogiendo el pendiente de menor tieKey.
    if (pick === -1) {
      for (let i = 0; i < n; i++) {
        if (!done[i] && (pick === -1 || keys[i] < keys[pick])) pick = i;
      }
    }
    done[pick] = true;
    result.push(items[pick]);
    for (const next of before[pick]) behindCount[next]--;
  }
  return result;
}
