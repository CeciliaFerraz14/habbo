// Ventana para abrir un negocio en un local libre. Hay tres casos:
// - Local del ayuntamiento: se alquila pagando la fianza del negocio.
// - Local construido por otro jugador y en alquiler: se alquila con la fianza y
//   el alquiler que fijó su dueño (lotTerms).
// - Local construido por el propio jugador y sin alquilar: no hay alquiler ni
//   fianza, solo se elige el negocio, o se pone en alquiler (ventana del dueño).
//
// Se reconstruye cuando cambia algo que se ve (una "firma" en JSON), para que
// los botones reflejen en todo momento si el dinero alcanza para la fianza.
import { BUSINESS_TYPES, ECONOMY, lotTerms, type BusinessType, type GameState, type Lot } from '@juego/shared';
import { button, formatMoney, text } from './economyUi';
import { PixelWindow } from './window';

export interface RentWindow {
  /** Abre la ventana para un local; update la rellena. */
  open: (lotId: string) => void;
  /** Refleja el estado y cierra la ventana si el local ya no se puede abrir (alquilado, retirado, suspendido...). */
  update: (state: GameState, playerId: string) => void;
}

export function createRentWindow(
  onRent: (lotId: string, business: BusinessType) => void,
  onList: (lotId: string) => void,
): RentWindow {
  const win = new PixelWindow({
    title: 'En alquiler',
    x: Math.max(24, window.innerWidth - 440),
    y: 110,
    width: 400,
  });
  let currentLot: string | null = null;
  let signature = '';

  const build = (state: GameState, lot: Lot, money: number, own: boolean) => {
    win.setTitle(own ? `Tu local: ${lot.label}` : `En alquiler: ${lot.label}`);

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
      const deposit = lotTerms(lot, type).deposit;
      button.textContent = own ? 'Abrir' : `Alquilar · ${formatMoney(deposit)}`;
      button.disabled = !own && money < deposit;
      if (button.disabled) button.title = 'No tienes dinero suficiente';
      button.addEventListener('click', () => onRent(lot.id, type));

      card.append(title, desc, button);
      list.append(card);
    }
    const landlord = lot.builtBy && !own ? (state.progress[lot.builtBy]?.name ?? 'otro vecino') : null;
    const intro = own
      ? 'Es tuyo: elige qué negocio abrir. No pagas fianza ni alquiler.'
      : landlord
        ? `Local de ${landlord}. Elige qué negocio abrir: pagas la fianza y ${formatMoney(lot.terms!.rent)} de ` +
          'alquiler al día. Al cerrar el negocio no se devuelve la fianza.'
        : 'Elige qué negocio abrir. Al alquilar pagas una fianza.';
    win.body.replaceChildren(text(intro), list);
    if (own) {
      win.body.append(
        text('O ponlo en alquiler para otros jugadores y cobra la fianza y el alquiler que decidas.'),
        button('Ponerlo en alquiler', true, () => {
          win.close();
          onList(lot.id);
        }),
      );
    }
  };

  const update = (state: GameState, playerId: string) => {
    if (!win.isOpen || !currentLot) return;
    const lot = state.lots[currentLot];
    // Un local construido deja de estar a mano si lo llevan, si el ajeno se
    // retira o se suspende, o si el propio pasa a alquilarse.
    const own = lot?.builtBy === playerId;
    if (!lot || lot.ownerId !== null || (lot.builtBy && (own ? lot.terms : !lot.terms || lot.suspended))) {
      win.close();
      currentLot = null;
      return;
    }
    const money = state.money[playerId] ?? 0;
    const next = JSON.stringify([lot.id, money, lot.terms, lot.suspended]);
    if (next === signature) return;
    signature = next;
    build(state, lot, money, own);
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
