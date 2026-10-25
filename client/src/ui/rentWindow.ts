// Ventana para alquilar un local libre y elegir qué negocio abrir en él.
import { BUSINESS_TYPES, ECONOMY, type BusinessType, type GameState } from '@juego/shared';
import { formatMoney } from './economyUi';
import { PixelWindow } from './window';

export interface RentWindow {
  /** Abre la ventana para un local. */
  open: (lotId: string, state: GameState, playerId: string) => void;
  /** Cierra la ventana si el local ya no está libre (por ejemplo, tras alquilarlo). */
  update: (state: GameState) => void;
}

export function createRentWindow(onRent: (lotId: string, business: BusinessType) => void): RentWindow {
  const win = new PixelWindow({
    title: 'En alquiler',
    x: Math.max(24, window.innerWidth - 440),
    y: 110,
    width: 400,
  });
  let currentLot: string | null = null;

  const open = (lotId: string, state: GameState, playerId: string) => {
    const lot = state.lots[lotId];
    if (!lot) return;
    currentLot = lotId;
    win.setTitle(`En alquiler: ${lot.label}`);
    const money = state.money[playerId] ?? 0;

    const intro = document.createElement('p');
    intro.className = 'hint';
    intro.textContent = 'Elige qué negocio abrir. Al alquilar pagas una fianza.';

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
      button.addEventListener('click', () => onRent(lotId, type));

      card.append(title, desc, button);
      list.append(card);
    }
    win.body.replaceChildren(list, intro);
    win.open();
  };

  const update = (state: GameState) => {
    if (win.isOpen && currentLot && state.lots[currentLot]?.ownerId !== null) {
      win.close();
      currentLot = null;
    }
  };

  return { open, update };
}
