// Ventana con estilo pixel que se puede arrastrar por su barra de título.

const root = () => document.querySelector<HTMLDivElement>('#ui')!;

/** Cada ventana que se toca pasa por encima de las demás. */
let topZ = 10;

/** Distancia mínima entre una ventana y el borde de la pantalla. */
const SCREEN_MARGIN = 8;

/** Ventanas abiertas, para volver a encajarlas si cambia el tamaño de la pantalla. */
const openWindows = new Set<PixelWindow>();
window.addEventListener('resize', () => {
  for (const win of openWindows) win.fitToScreen();
});

export interface WindowOptions {
  title: string;
  /** Posición inicial en píxeles desde la esquina superior izquierda. */
  x: number;
  y: number;
  width: number;
  /** Si es false, no se puede cerrar con la X (paneles fijos). */
  closable?: boolean;
}

export class PixelWindow {
  readonly el: HTMLDivElement;
  readonly body: HTMLDivElement;
  private readonly titleEl: HTMLSpanElement;
  /** Se llama cuando el usuario cierra la ventana con la X. */
  onClose: (() => void) | null = null;

  constructor(options: WindowOptions) {
    this.el = document.createElement('div');
    this.el.className = 'win';
    this.el.style.left = `${options.x}px`;
    this.el.style.top = `${options.y}px`;
    this.el.style.width = `${options.width}px`;
    this.el.hidden = true;

    const bar = document.createElement('div');
    bar.className = 'win-title';
    this.titleEl = document.createElement('span');
    this.titleEl.textContent = options.title;
    bar.append(this.titleEl);

    if (options.closable !== false) {
      const close = document.createElement('button');
      close.className = 'win-close';
      close.textContent = 'x';
      close.title = 'Cerrar';
      close.addEventListener('click', () => {
        this.close();
        this.onClose?.();
      });
      bar.append(close);
    }

    this.body = document.createElement('div');
    this.body.className = 'win-body';
    this.el.append(bar, this.body);
    root().append(this.el);

    this.el.addEventListener('pointerdown', () => this.bringToFront());
    this.makeDraggable(bar);
  }

  get isOpen(): boolean {
    return !this.el.hidden;
  }

  setTitle(title: string): void {
    this.titleEl.textContent = title;
  }

  open(): void {
    this.el.hidden = false;
    openWindows.add(this);
    this.bringToFront();
    this.fitToScreen();
  }

  close(): void {
    this.el.hidden = true;
    openWindows.delete(this);
  }

  /**
   * Mueve la ventana lo justo para que quepa entera en la pantalla. Su alto
   * máximo lo limita el CSS (si el contenido no cabe, se hace scroll dentro).
   */
  fitToScreen(): void {
    const maxX = Math.max(SCREEN_MARGIN, window.innerWidth - this.el.offsetWidth - SCREEN_MARGIN);
    const maxY = Math.max(SCREEN_MARGIN, window.innerHeight - this.el.offsetHeight - SCREEN_MARGIN);
    const x = Math.min(Math.max(this.el.offsetLeft, SCREEN_MARGIN), maxX);
    const y = Math.min(Math.max(this.el.offsetTop, SCREEN_MARGIN), maxY);
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  private bringToFront(): void {
    this.el.style.zIndex = String(++topZ);
  }

  /**
   * Arrastre: al pulsar en la barra guardamos la distancia entre el ratón y la
   * esquina de la ventana. Mientras se mueve el ratón, colocamos la ventana a
   * esa misma distancia. setPointerCapture hace que sigamos recibiendo los
   * movimientos aunque el ratón salga de la barra.
   */
  private makeDraggable(handle: HTMLElement): void {
    let offsetX = 0;
    let offsetY = 0;
    let dragging = false;

    handle.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      dragging = true;
      offsetX = e.clientX - this.el.offsetLeft;
      offsetY = e.clientY - this.el.offsetTop;
      handle.setPointerCapture(e.pointerId);
    });

    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      // Limitamos la posición para que la ventana no se pierda fuera de la pantalla.
      const maxX = window.innerWidth - this.el.offsetWidth;
      const maxY = window.innerHeight - handle.offsetHeight;
      const x = Math.max(0, Math.min(maxX, e.clientX - offsetX));
      const y = Math.max(0, Math.min(maxY, e.clientY - offsetY));
      this.el.style.left = `${x}px`;
      this.el.style.top = `${y}px`;
    });

    const stop = () => {
      dragging = false;
    };
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
  }
}
