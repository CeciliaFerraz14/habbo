// Tablón de anuncios de la gasolinera: lo que pasa en el pueblo de un vistazo.
// Negocios abiertos (y quién los lleva), locales en alquiler, encargos de
// Hank, la oferta del día y el récord de la máquina recreativa.
import {
  CATALOG,
  ECONOMY,
  getListings,
  SCENES,
  type GameState,
  type Lot,
} from '@juego/shared';
import { formatMoney } from './economyUi';
import { dealText } from './gasWindow';
import { PixelWindow } from './window';

export interface BoardWindow {
  open: () => void;
  update: (state: GameState, playerId: string) => void;
}

/** Una línea del tablón sobre un local. */
function lotLine(state: GameState, lot: Lot): string {
  if (!lot.business || !lot.ownerName) {
    const cheapest = Math.min(...Object.values(ECONOMY.businesses).map((b) => b.deposit));
    return `${lot.label} · En alquiler (desde ${formatMoney(cheapest)})`;
  }
  const config = ECONOMY.businesses[lot.business];
  const head = `${lot.label} · ${config.name} de ${lot.ownerName}`;
  if (config.service) return `${head} · ${config.service.name} ${formatMoney(lot.price)}`;
  if (config.kind === 'store') {
    const listings = getListings(state, lot.id);
    if (listings.length === 0) return `${head} · sin género`;
    const cheapest = Math.min(...listings.map((l) => l.price ?? 0));
    return `${head} · ${listings.length} productos desde ${formatMoney(cheapest)}`;
  }
  return head;
}

export function createBoardWindow(): BoardWindow {
  const win = new PixelWindow({
    title: 'Tablón del pueblo',
    x: 24,
    y: 110,
    width: 420,
  });
  let signature = '';

  const section = (title: string, lines: string[]) => {
    const h = document.createElement('p');
    h.className = 'section-title';
    h.textContent = title;
    const list = document.createElement('ul');
    list.className = 'board-list';
    for (const line of lines) {
      const li = document.createElement('li');
      li.textContent = line;
      list.append(li);
    }
    win.body.append(h, list);
  };

  const update = (state: GameState, playerId: string) => {
    if (!win.isOpen) return;
    if (state.avatars[playerId]?.sceneId !== SCENES.gas) {
      win.close();
      return;
    }
    const lots = Object.values(state.lots);
    const lines = lots.map((lot) => lotLine(state, lot));
    const orders = state.orders.map(
      (o) => `${o.quantity} × ${CATALOG[o.defId].name} · paga ${formatMoney(o.reward)}`,
    );
    const record = state.pinballRecord;
    const next = JSON.stringify([lines, orders, dealText(state.tick), record]);
    if (next === signature) return;
    signature = next;

    win.body.replaceChildren();
    section('Negocios', lines);
    section('Encargos de Hank', orders.length > 0 ? orders : ['Ninguno ahora mismo.']);
    section('Oferta de hoy en el mostrador', [dealText(state.tick)]);
    section('Récord de la máquina recreativa', [
      record ? `${record.name}: ${record.score.toLocaleString('es-ES')} puntos` : 'Nadie ha jugado todavía.',
    ]);
  };

  return {
    open() {
      signature = '';
      win.open();
    },
    update,
  };
}
