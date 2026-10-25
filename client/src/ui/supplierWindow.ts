// Ventana del proveedor de materiales (en la gasolinera).
import { ECONOMY, MATERIAL_IDS, type GameState, type MaterialId } from '@juego/shared';
import { formatMoney, materialChips } from './economyUi';
import { PixelWindow } from './window';

export interface SupplierWindow {
  open: () => void;
  update: (state: GameState, playerId: string) => void;
}

export function createSupplierWindow(
  onBuy: (material: MaterialId, quantity: number) => void,
): SupplierWindow {
  const { name, prices, maxPerPurchase } = ECONOMY.supplier;
  const win = new PixelWindow({
    title: name,
    x: Math.max(24, window.innerWidth - 420),
    y: 110,
    width: 380,
  });
  let signature = '';

  const update = (state: GameState, playerId: string) => {
    if (!win.isOpen) return;
    const money = state.money[playerId] ?? 0;
    const onStreet = state.avatars[playerId]?.sceneId === 'street';
    // El proveedor está en la calle: si entras en un edificio, se cierra.
    if (!onStreet) {
      win.close();
      return;
    }
    const next = JSON.stringify([money, onStreet]);
    if (next === signature) return;
    signature = next;

    const list = document.createElement('div');
    list.className = 'recipes';
    for (const id of MATERIAL_IDS) {
      const row = document.createElement('div');
      row.className = 'recipe';
      const info = document.createElement('div');
      info.className = 'recipe-info';
      info.append(materialChips({ [id]: 1 }, { nameOnly: true }), `${formatMoney(prices[id])} la unidad`);

      const qty = document.createElement('input');
      qty.type = 'number';
      qty.className = 'price-input';
      qty.min = '1';
      qty.max = String(maxPerPurchase);
      qty.value = '5';
      const buy = document.createElement('button');
      buy.className = 'btn btn-small';
      buy.textContent = 'Comprar';
      buy.disabled = !onStreet || money < prices[id];
      buy.addEventListener('click', () => onBuy(id, Math.round(Number(qty.value))));
      const controls = document.createElement('div');
      controls.className = 'row';
      controls.append(qty, buy);
      row.append(document.createElement('span'), info, controls);
      list.append(row);
    }
    const note = document.createElement('p');
    note.className = 'hint';
    note.textContent = onStreet
      ? `Llevas ${formatMoney(money)}. Máximo ${maxPerPurchase} unidades por compra.`
      : 'El proveedor está en la gasolinera de la calle.';
    win.body.replaceChildren(list, note);
  };

  return {
    open() {
      signature = '';
      win.open();
    },
    update,
  };
}
