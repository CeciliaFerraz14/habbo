// Ventana para alquilar un local libre y elegir qué negocio abrir en él.
//
// Se reconstruye cuando cambia algo que se ve (una "firma" en JSON), para que
// los botones reflejen en todo momento si el dinero alcanza para la fianza.
import { BUSINESS_TYPES, ECONOMY, type BusinessType, type GameState, type Lot } from '@juego/shared';
import { formatMoney, text } from './economyUi';
import { PixelWindow } from './window';

export interface RentWindow {
  /** Abre la ventana para un local; update la rellena. */
  open: (lotId: string) => void;
  /** Refleja el estado y cierra la ventana si el local ya no está libre (por ejemplo, tras alquilarlo). */
  update: (state: GameState, playerId: string) => void;
}

export function createRentWindow(onRent: (lotId: string, business: BusinessType) => void): RentWindow {
  const win = new PixelWindow({
    title: 'En alquiler',
    x: Math.max(24, window.innerWidth - 440),
    y: 110,
    width: 400,
  });
  let currentLot: string | null = null;
  let signature = '';

  const build = (lot: Lot, money: number) => {
    win.setTitle(`En alquiler: ${lot.label}`);

    const list = document.createElement('div');
    list.className = 'option-list';
    for (const type of BUSINESS_TYPES) {
      const config = ECONOMY.businesses[type];
      const card = document.createElement('div');
      card.className = 'option';

      const title = document.createElement('div');
      title.className = 'option-title';
      title.textContent = config.name;
      // Una pastillita con el color del neón que tendrá el local.
      const neon = document.createElement('i');
      neon.className = 'neon-dot';
      neon.style.background = config.neon;
      title.prepend(neon);

      const desc = document.createElement('div');
      desc.textContent = config.description;

      const button = document.createElement('button');
      button.className = 'btn btn-small';
      button.textContent = `Alquilar · ${formatMoney(config.deposit)}`;
      button.disabled = money < config.deposit;
      if (button.disabled) button.title = 'No tienes dinero suficiente';
      button.addEventListener('click', () => onRent(lot.id, type));

      card.append(title, desc, button);
      list.append(card);
    }
    win.body.replaceChildren(text('Elige qué negocio abrir. Al alquilar pagas una fianza.'), list);
  };

  const update = (state: GameState, playerId: string) => {
    if (!win.isOpen || !currentLot) return;
    const lot = state.lots[currentLot];
    if (!lot || lot.ownerId !== null) {
      win.close();
      currentLot = null;
      return;
    }
    const money = state.money[playerId] ?? 0;
    const next = JSON.stringify([lot.id, money]);
    if (next === signature) return;
    signature = next;
    build(lot, money);
  };

  return {
    open(lotId) {
      currentLot = lotId;
      signature = '';
      win.open();
    },
    update,
  };
}
