// Ventana para alquilar un local libre y elegir qué negocio abrir en él.
// En un solar, la fianza y el alquiler son los del casero.
//
// Igual que la ventana del solar, se reconstruye cuando cambia algo que se ve
// (una "firma" en JSON), para no enseñar una fianza distinta de la que se cobra.
import { BUSINESS_TYPES, ECONOMY, lotTerms, type BusinessType, type GameState, type Lot } from '@juego/shared';
import { formatMoney, text } from './economyUi';
import { PixelWindow } from './window';

export interface RentWindow {
  /** Abre la ventana para un local; update la rellena. */
  open: (lotId: string) => void;
  /** Refleja el estado y cierra la ventana si el local ya no está libre (por ejemplo, tras alquilarlo). */
  update: (state: GameState, playerId: string) => void;
}

/** Texto de debajo de la lista: las condiciones del local. */
function introText(lot: Lot): string {
  if (!lot.terms) return 'Elige qué negocio abrir. Al alquilar pagas una fianza.';
  if (lot.suspended) {
    return `Solar de ${lot.landlordName}. Suspendido: no admite inquilinos hasta que el casero pague el mantenimiento.`;
  }
  return (
    `Solar de ${lot.landlordName}. Elige qué negocio abrir: fianza de ${formatMoney(lot.terms.deposit)} ` +
    `y alquiler de ${formatMoney(lot.terms.rent)} al día, los fija el casero.`
  );
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
      const { deposit } = lotTerms(lot, type);
      button.textContent = `Alquilar · ${formatMoney(deposit)}`;
      button.disabled = lot.suspended || money < deposit;
      if (lot.suspended) button.title = 'El solar está suspendido';
      else if (button.disabled) button.title = 'No tienes dinero suficiente';
      button.addEventListener('click', () => onRent(lot.id, type));

      card.append(title, desc, button);
      list.append(card);
    }
    win.body.replaceChildren(list, text(introText(lot)));
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
    const next = JSON.stringify([lot.id, lot.terms, lot.suspended, lot.landlordName, money]);
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
