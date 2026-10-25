// Ventana del catálogo: lista todos los muebles y permite obtenerlos.
import { CATALOG, FURNI_IDS, type FurniId } from '@juego/shared';
import { furniIcon } from './icons';
import { PixelWindow } from './window';

export function createCatalogWindow(onBuy: (defId: FurniId) => void): PixelWindow {
  const win = new PixelWindow({ title: 'Catálogo', x: 24, y: 24, width: 400 });

  const grid = document.createElement('div');
  grid.className = 'grid';
  for (const id of FURNI_IDS) {
    const def = CATALOG[id];
    const card = document.createElement('div');
    card.className = 'card';

    const name = document.createElement('div');
    name.className = 'card-name';
    name.textContent = def.name;

    const button = document.createElement('button');
    button.className = 'btn btn-small';
    button.textContent = 'Obtener';
    button.addEventListener('click', () => onBuy(id));

    card.append(furniIcon(id), name, button);
    grid.append(card);
  }

  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = 'Los muebles van a tu inventario.';
  win.body.append(grid, hint);
  return win;
}
