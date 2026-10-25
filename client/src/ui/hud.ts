// Barra inferior: caja de chat y botones principales.
import { MAX_MESSAGE_LENGTH } from '@juego/shared';

export interface HudButton {
  label: string;
  onClick: () => void;
  /** Texto de ayuda al pasar el ratón. */
  hint?: string;
  disabled?: boolean;
}

export interface Hud {
  /** Pone el cursor en la caja de chat. */
  focusChat: () => void;
}

export function createHud(onSay: (text: string) => void, buttons: HudButton[]): Hud {
  const bar = document.createElement('div');
  bar.id = 'hud';

  // Caja de chat: un <form> para que Enter lo envíe sin código extra.
  const form = document.createElement('form');
  form.className = 'chat-form';
  const input = document.createElement('input');
  input.className = 'chat-input';
  input.placeholder = 'Escribe y pulsa Enter...';
  input.maxLength = MAX_MESSAGE_LENGTH;
  input.autocomplete = 'off';
  form.append(input);
  form.addEventListener('submit', (e) => {
    e.preventDefault(); // un <form> recargaría la página al enviarse
    if (input.value.trim()) onSay(input.value);
    input.value = '';
  });
  // Esc quita el foco del chat para volver a usar los atajos del juego.
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') input.blur();
  });
  bar.append(form);

  for (const b of buttons) {
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = b.label;
    button.disabled = b.disabled ?? false;
    if (b.hint) button.title = b.hint;
    button.addEventListener('click', b.onClick);
    bar.append(button);
  }

  // Pulsar Enter en cualquier sitio lleva al chat.
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !(e.target instanceof HTMLInputElement)) {
      e.preventDefault();
      input.focus();
    }
  });

  document.querySelector('#ui')!.append(bar);
  return { focusChat: () => input.focus() };
}
