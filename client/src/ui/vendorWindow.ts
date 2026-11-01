// Ventana de un vecino que vende muebles EXCLUSIVOS (ver shared/src/vendors.ts):
// lo que vende, su precio y el botón de comprar. Solo se compra a su lado.
import { CATALOG, isNearVendor, vendorOf, type GameState, type VendorItemId } from '@juego/shared';
import { formatMoney } from './economyUi';
import { furniIcon } from './icons';
import { PixelWindow } from './window';

export interface VendorWindow {
  open: (npcId: string) => void;
  update: (state: GameState, playerId: string) => void;
}

export function createVendorWindow(onBuy: (npcId: string, defId: VendorItemId) => void): VendorWindow {
  const win = new PixelWindow({
    title: 'Vecino',
    x: Math.max(24, window.innerWidth - 420),
    y: 110,
    width: 380,
  });
  let npcId: string | null = null;
  let signature = '';

  const update = (state: GameState, playerId: string) => {
    if (!win.isOpen || !npcId) return;
    const vendor = vendorOf(npcId);
    const npc = state.avatars[npcId];
    const me = state.avatars[playerId];
    // Si alguno de los dos se va a otra escena, la ventana se cierra sola.
    if (!vendor || !npc || !me || npc.sceneId !== me.sceneId) {
      win.close();
      return;
    }
    const money = state.money[playerId] ?? 0;
    const near = isNearVendor(state, playerId, npcId);
    const owned = (state.inventories[playerId] ?? []).map((i) => i.defId);
    const next = JSON.stringify([money, near, owned]);
    if (next === signature) return;
    signature = next;

    win.setTitle(`Lo que vende ${npc.name}`);
    const pitch = document.createElement('p');
    pitch.className = 'hint';
    pitch.textContent = `«${vendor.pitch}»`;

    const list = document.createElement('div');
    list.className = 'recipes';
    for (const offer of vendor.items) {
      const row = document.createElement('div');
      row.className = 'recipe';
      const name = document.createElement('div');
      const have = owned.filter((d) => d === offer.defId).length;
      name.textContent = `${CATALOG[offer.defId].name} · ${formatMoney(offer.price)}${have ? ` (tienes ${have})` : ''}`;
      const buy = document.createElement('button');
      buy.className = 'btn btn-small';
      buy.textContent = 'Comprar';
      buy.disabled = !near || money < offer.price;
      if (money < offer.price) buy.title = 'No tienes dinero suficiente';
      buy.addEventListener('click', () => onBuy(npcId!, offer.defId));
      row.append(furniIcon(offer.defId), name, buy);
      list.append(row);
    }

    const note = document.createElement('p');
    note.className = 'hint';
    note.textContent = near
      ? `Exclusivo: no se fabrica ni se vende en las tiendas. Llevas ${formatMoney(money)}.`
      : `Acércate a ${npc.name} para comprarle.`;
    win.body.replaceChildren(pitch, list, note);
  };

  return {
    open(id) {
      npcId = id;
      signature = '';
      win.open();
    },
    update,
  };
}
