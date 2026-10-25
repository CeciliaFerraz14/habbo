// Avisos breves en pantalla ("Local cerrado", "No tienes dinero"...).

const DURATION_MS = 2500;

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
  }, DURATION_MS);
}
