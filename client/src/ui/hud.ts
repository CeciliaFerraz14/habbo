// Barra inferior con los botones principales.

export interface HudButton {
  label: string;
  onClick: () => void;
  /** Texto de ayuda al pasar el ratón. */
  hint?: string;
  disabled?: boolean;
}

export function createHud(buttons: HudButton[]): HTMLDivElement {
  const bar = document.createElement('div');
  bar.id = 'hud';
  for (const b of buttons) {
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = b.label;
    button.disabled = b.disabled ?? false;
    if (b.hint) button.title = b.hint;
    button.addEventListener('click', b.onClick);
    bar.append(button);
  }
  document.querySelector('#ui')!.append(bar);
  return bar;
}
