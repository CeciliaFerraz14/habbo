// Ventana de una tienda vista como CLIENTE: sus productos y el botón de comprar.
import { CATALOG, getListings, type GameState } from '@juego/shared';
import { formatMoney } from './economyUi';
import { furniIcon } from './icons';
import { PixelWindow } from './window';

export interface ShopWindow {
  open: (lotId: string) => void;
  update: (state: GameState, playerId: string) => void;
}

export function createShopWindow(onBuy: (itemId: string) => void): ShopWindow {
  const win = new PixelWindow({
    title: 'Tienda',
    x: Math.max(24, window.innerWidth - 420),
    y: 110,
    width: 380,
  });
  let lotId: string | null = null;
  let signature = '';

  const update = (state: GameState, playerId: string) => {
    if (!win.isOpen || !lotId) return;
    const lot = state.lots[lotId];
    if (!lot || lot.business !== 'store') {
      win.close();
      return;
    }
    const products = getListings(state, lotId);
    const money = state.money[playerId] ?? 0;
    const inside = state.avatars[playerId]?.sceneId === lotId;
    // Solo reconstruimos si cambian los productos, el dinero o dónde estás.
    const next = JSON.stringify([products, money, inside]);
    if (next === signature) return;
    signature = next;

    win.setTitle(lot.ownerName ? `Tienda de ${lot.ownerName}` : 'Tienda');
    const list = document.createElement('div');
    list.className = 'recipes';
    if (products.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = 'No queda nada a la venta. Vuelve más tarde.';
      list.append(empty);
    }
    // Primero los más baratos.
    for (const item of [...products].sort((a, b) => a.price! - b.price!)) {
      const row = document.createElement('div');
      row.className = 'recipe';
      const name = document.createElement('div');
      name.textContent = `${CATALOG[item.defId].name} · ${formatMoney(item.price!)}`;
      const buy = document.createElement('button');
      buy.className = 'btn btn-small';
      buy.textContent = 'Comprar';
      buy.disabled = !inside || money < item.price!;
      if (money < item.price!) buy.title = 'No tienes dinero suficiente';
      buy.addEventListener('click', () => onBuy(item.id));
      row.append(furniIcon(item.defId), name, buy);
      list.append(row);
    }
    const note = document.createElement('p');
    note.className = 'hint';
    note.textContent = inside
      ? `Llevas ${formatMoney(money)}. Lo que compres va a tu inventario.`
      : 'Entra en la tienda para comprar.';
    win.body.replaceChildren(list, note);
  };

  return {
    open(id) {
      lotId = id;
      signature = '';
      win.open();
    },
    update,
  };
}
