// Ventana con el historial del chat de la sala.
import type { ChatMessage } from '@juego/shared';
import { PixelWindow } from './window';

export interface ChatHistory {
  win: PixelWindow;
  update: (messages: readonly ChatMessage[]) => void;
}

export function createChatHistory(): ChatHistory {
  const win = new PixelWindow({ title: 'Chat', x: 24, y: 360, width: 320 });
  const list = document.createElement('div');
  list.className = 'chat-log';
  win.body.append(list);

  let last: readonly ChatMessage[] | null = null;

  const update = (messages: readonly ChatMessage[]) => {
    if (messages === last) return;
    last = messages;
    // Solo bajamos el scroll si el usuario ya estaba abajo del todo
    // (si está leyendo mensajes antiguos, no le movemos la vista).
    const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 4;
    list.replaceChildren(
      ...messages.map((m) => {
        const line = document.createElement('div');
        const name = document.createElement('b');
        name.textContent = `${m.name}: `;
        line.append(name, document.createTextNode(m.text));
        return line;
      }),
    );
    if (messages.length === 0) list.textContent = 'Todavía no ha hablado nadie.';
    if (atBottom) list.scrollTop = list.scrollHeight;
  };

  return { win, update };
}
