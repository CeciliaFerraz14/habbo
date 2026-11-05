// Ventana de un solar. Tiene dos modos:
// - "Construir": en un solar libre, cualquiera puede pagar para construir un
//   local y pasar a ser su casero.
// - "Tu solar": el casero ve quién lo tiene alquilado, fija la fianza y el
//   alquiler (solo mientras está libre) y ve lo que paga de mantenimiento.
//
// Igual que la ventana de negocio, la estructura solo se reconstruye cuando
// cambia algo que se ve (una "firma" en JSON), para no borrar lo que el casero
// está escribiendo en cada tick; la cuenta atrás del mantenimiento se
// actualiza en su sitio.
import { ECONOMY, hasMaterials, isIntegerBetween, plotSite, SCENES, type GameState, type Lot } from '@juego/shared';
import { formatMoney, formatTicks, materialChips, numberInput, readNumber, text } from './economyUi';
import { PixelWindow } from './window';

export interface PlotActions {
  build: (lotId: string) => void;
  setTerms: (lotId: string, deposit: number, rent: number) => void;
}

export interface PlotWindow {
  open: (lotId: string) => void;
  update: (state: GameState, playerId: string) => void;
}

export function createPlotWindow(actions: PlotActions): PlotWindow {
  const win = new PixelWindow({
    title: 'Solar',
    x: Math.max(24, window.innerWidth - 440),
    y: 110,
    width: 400,
  });
  const { plots } = ECONOMY;
  /** Parte de cada fianza y alquiler que se queda el pueblo, en %. */
  const commission = Math.round(plots.commissionRate * 100);
  let lotId: string | null = null;
  let signature = '';
  /** Texto con la cuenta atrás del mantenimiento (solo en el modo del casero). */
  let countdown: { el: HTMLElement; lot: Lot } | null = null;

  // --- Construir en un solar libre ---------------------------------------------
  const buildMode = (id: string, label: string, state: GameState, playerId: string) => {
    const { money, materials } = plots.buildCost;
    const mine = state.materials[playerId] ?? {};
    const canAfford = (state.money[playerId] ?? 0) >= money && hasMaterials(mine, materials);

    win.setTitle(`Construir: ${label}`);
    const button = document.createElement('button');
    button.className = 'btn btn-small';
    button.textContent = `Construir · ${formatMoney(money)}`;
    button.disabled = !canAfford;
    if (!canAfford) button.title = 'No tienes dinero o materiales suficientes';
    button.addEventListener('click', () => actions.build(id));

    win.body.replaceChildren(
      text('Construye un local y alquílalo a otros jugadores con la fianza y el alquiler que tú decidas.'),
      text(`Cuesta ${formatMoney(money)} y estos materiales:`, 'section-title'),
      // Lo que no te alcanza sale en rojo.
      materialChips(materials, { have: mine }),
      button,
      text(
        `Como casero pagas ${formatMoney(plots.upkeep)} de mantenimiento al día, esté alquilado o no. ` +
          `El pueblo se queda un ${commission} % de cada fianza y alquiler.`,
      ),
    );
  };

  // --- El casero gestiona su solar ---------------------------------------------
  const landlordMode = (lot: Lot) => {
    const rented = lot.ownerId !== null;
    const business = lot.business ? ECONOMY.businesses[lot.business].name : null;
    // Un solar con casero siempre tiene condiciones.
    const terms = lot.terms!;
    const deposit = numberInput(terms.deposit, plots.deposit.min, plots.deposit.max, !rented);
    const rent = numberInput(terms.rent, plots.rent.min, plots.rent.max, !rented);

    const save = document.createElement('button');
    save.className = 'btn btn-small';
    save.textContent = 'Guardar';
    // Solo se puede guardar sin inquilino y con valores dentro de los límites.
    // valueAsNumber da NaN con el campo vacío, que no pasa la comprobación.
    const refresh = () => {
      save.disabled =
        rented ||
        !isIntegerBetween(deposit.valueAsNumber, plots.deposit.min, plots.deposit.max) ||
        !isIntegerBetween(rent.valueAsNumber, plots.rent.min, plots.rent.max);
    };
    deposit.addEventListener('input', refresh);
    rent.addEventListener('input', refresh);
    refresh();
    save.addEventListener('click', () => actions.setTerms(lot.id, readNumber(deposit), readNumber(rent)));

    // Mientras está suspendido no hay próximo cobro: se reintenta en cada tick.
    const next = text('');
    countdown = lot.suspended ? null : { el: next, lot };

    win.setTitle(`Tu solar: ${lot.label}`);
    win.body.replaceChildren(
      text('Inquilino:', 'section-title'),
      text(rented ? `${lot.ownerName} (${business})` : 'Libre'),
      text('Fianza:', 'section-title'),
      deposit,
      text('Alquiler al día:', 'section-title'),
      rent,
      save,
      text(
        rented
          ? 'No puedes cambiar las condiciones mientras haya inquilino.'
          : `Fianza de ${formatMoney(plots.deposit.min)} a ${formatMoney(plots.deposit.max)}; ` +
              `alquiler de ${formatMoney(plots.rent.min)} a ${formatMoney(plots.rent.max)}. ` +
              `Cobras aunque no estés, menos un ${commission} % para el pueblo.`,
      ),
      text('Mantenimiento:', 'section-title'),
      text(`${formatMoney(plots.upkeep)} al día.`),
      lot.suspended
        ? text('Suspendido: no pudiste pagar el mantenimiento. No admite inquilinos nuevos hasta que lo pagues.')
        : next,
    );
  };

  const update = (state: GameState, playerId: string) => {
    if (!win.isOpen || !lotId) return;
    const site = plotSite(lotId);
    const lot = state.lots[lotId];
    // Se cierra al salir de la calle o si el solar lo ha construido otro.
    if (!site || state.avatars[playerId]?.sceneId !== SCENES.street || (lot && lot.landlordId !== playerId)) {
      win.close();
      return;
    }

    const next = lot
      ? JSON.stringify([lotId, lot.ownerName, lot.business, lot.terms, lot.suspended, lot.nextUpkeepAt])
      : JSON.stringify([lotId, state.money[playerId], state.materials[playerId]]);
    if (next !== signature) {
      signature = next;
      countdown = null;
      if (lot) landlordMode(lot);
      else buildMode(lotId, site.label, state, playerId);
    }
    if (countdown) {
      countdown.el.textContent = `Próximo cobro en ${formatTicks(countdown.lot.nextUpkeepAt - state.tick)}.`;
    }
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
