// Avisos breves en pantalla ("Local cerrado", "No tienes dinero"...).

/**
 * Cuánto se ve un aviso: un mínimo y un poco más por cada letra, para que dé
 * tiempo a leer los largos ("¡Subes a nivel 5: Comerciante! Recompensa: ..."),
 * con un máximo.
 */
const MIN_DURATION_MS = 4000;
const MS_PER_CHAR = 60;
const MAX_DURATION_MS = 9000;

let el: HTMLDivElement | null = null;
let timer: number | undefined;

/** Muestra un aviso unos segundos. Si ya había uno, lo sustituye. */
export function showToast(text: string): void {
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.querySelector('#ui')!.append(el);
  }
  el.textContent = text;
  el.hidden = false;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    if (el) el.hidden = true;
  }, Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, text.length * MS_PER_CHAR)));
}
