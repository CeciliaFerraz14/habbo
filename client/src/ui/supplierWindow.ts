// Ventana del proveedor de materiales (en la gasolinera).
import { ECONOMY, SUPPLIER_MATERIAL_IDS, type GameState, type MaterialId, type SupplierMaterialId } from '@juego/shared';
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

  // Las filas se crean una sola vez: así la cantidad que escribe el jugador
  // se conserva entre compras. Al cambiar el dinero solo se tocan los botones y la nota.
  const buttons = new Map<SupplierMaterialId, HTMLButtonElement>();
  const list = document.createElement('div');
  list.className = 'recipes';
  for (const id of SUPPLIER_MATERIAL_IDS) {
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
    buy.addEventListener('click', () => onBuy(id, Math.round(Number(qty.value))));
    buttons.set(id, buy);
    const controls = document.createElement('div');
    controls.className = 'row';
    controls.append(qty, buy);
    row.append(document.createElement('span'), info, controls);
    list.append(row);
  }
  const note = document.createElement('p');
  note.className = 'hint';
  win.body.replaceChildren(list, note);

  let shownMoney: number | null = null;

  const update = (state: GameState, playerId: string) => {
    if (!win.isOpen) return;
    // El proveedor está en la calle: si entras en un edificio, se cierra.
    if (state.avatars[playerId]?.sceneId !== 'street') {
      win.close();
      return;
    }
    const money = state.money[playerId] ?? 0;
    if (money === shownMoney) return;
    shownMoney = money;
    for (const [id, buy] of buttons) buy.disabled = money < prices[id];
    note.textContent = `Llevas ${formatMoney(money)}. Máximo ${maxPerPurchase} unidades por compra.`;
  };

  return {
    open() {
      shownMoney = null;
      win.open();
    },
    update,
  };
}
