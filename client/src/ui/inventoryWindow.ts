// Ventana del inventario: muebles que tiene el jugador sin colocar.
import { CATALOG, type InventoryItem } from '@juego/shared';
import { furniIcon } from './icons';
import { PixelWindow } from './window';

export interface InventoryWindow {
  win: PixelWindow;
  /** Vuelve a dibujar la lista con los objetos actuales. */
  update: (items: readonly InventoryItem[]) => void;
}

export function createInventoryWindow(onPick: (itemId: string) => void): InventoryWindow {
  const win = new PixelWindow({ title: 'Inventario', x: 440, y: 24, width: 400 });
  const grid = document.createElement('div');
  grid.className = 'grid';
  const hint = document.createElement('p');
  hint.className = 'hint';
  win.body.append(grid, hint);

  let lastItems: readonly InventoryItem[] | null = null;

  const update = (items: readonly InventoryItem[]) => {
    // El estado es inmutable: si la lista es el mismo objeto, no ha cambiado.
    if (items === lastItems) return;
    lastItems = items;
    grid.replaceChildren();

    // Agrupamos por tipo de mueble para mostrar "Silla x3" en lugar de tres tarjetas.
    const groups = new Map<string, InventoryItem[]>();
    for (const item of items) {
      const group = groups.get(item.defId) ?? [];
      group.push(item);
      groups.set(item.defId, group);
    }

    for (const group of groups.values()) {
      const def = CATALOG[group[0].defId];
      const card = document.createElement('button');
      card.className = 'card card-button';
      card.title = 'Clic para colocarlo en la sala';

      const name = document.createElement('div');
      name.className = 'card-name';
      name.textContent = def.name;

      const count = document.createElement('div');
      count.className = 'badge';
      count.textContent = `x${group.length}`;

      card.append(furniIcon(def.id), name, count);
      card.addEventListener('click', () => onPick(group[0].id));
      grid.append(card);
    }

    hint.textContent =
      items.length === 0
        ? 'Vacío. Consigue muebles en el catálogo.'
        : 'Elige un mueble y haz clic en la sala. R o clic derecho: girar. Esc: cancelar.';
  };

  return { win, update };
}
