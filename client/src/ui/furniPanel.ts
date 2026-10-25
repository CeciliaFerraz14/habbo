// Panel con las opciones del mueble seleccionado: mover, girar y recoger.
import { CATALOG, type FurniItem } from '@juego/shared';
import { PixelWindow } from './window';

export interface FurniPanelActions {
  onMove: () => void;
  onRotate: () => void;
  onPickUp: () => void;
  onClose: () => void;
}

export interface FurniPanel {
  /** Muestra el panel para un mueble, o lo oculta si es null. */
  show: (item: FurniItem | null) => void;
}

export function createFurniPanel(actions: FurniPanelActions): FurniPanel {
  const win = new PixelWindow({
    title: 'Mueble',
    x: window.innerWidth - 260,
    y: 24,
    width: 236,
  });
  win.onClose = actions.onClose;

  const buttons = document.createElement('div');
  buttons.className = 'row';
  const add = (label: string, onClick: () => void) => {
    const b = document.createElement('button');
    b.className = 'btn btn-small';
    b.textContent = label;
    b.addEventListener('click', onClick);
    buttons.append(b);
  };
  add('Mover', actions.onMove);
  add('Girar', actions.onRotate);
  add('Recoger', actions.onPickUp);

  const info = document.createElement('p');
  info.className = 'hint';
  win.body.append(buttons, info);

  return {
    show(item) {
      if (!item) {
        win.close();
        return;
      }
      const def = CATALOG[item.defId];
      win.setTitle(def.name);
      info.textContent = def.sittable ? 'Haz clic en él para sentarte.' : '';
      if (!win.isOpen) win.open();
    },
  };
}
