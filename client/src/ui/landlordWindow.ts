// Ventana del dueño de un local construido en el Ensanche (ver plots.ts). Según
// el estado del local muestra:
// - Sin condiciones: fianza y alquiler para ponerlo en alquiler.
// - En alquiler y libre: las mismas condiciones para cambiarlas, y retirarlo.
// - Con inquilino: quién lo lleva, las condiciones (no se editan) y el nivel
//   del local, que mejora siempre el dueño.
//
// Igual que rentWindow, la estructura solo se reconstruye cuando cambia algo
// que se ve (una "firma" en JSON), para no borrar lo que el dueño está
// escribiendo. Por eso el dinero no entra en la firma de los estados con
// campos: el estado de los botones y la cuenta atrás se actualizan en su sitio.
import { ECONOMY, isIntegerBetween, type GameState, type Lot } from '@juego/shared';
import { button, formatMoney, formatTicks, levelSection, numberInput, readNumber, text } from './economyUi';
import { PixelWindow } from './window';

export interface LandlordActions {
  list: (lotId: string, deposit: number, rent: number) => void;
  unlist: (lotId: string) => void;
  upgrade: (lotId: string) => void;
}

export interface LandlordWindow {
  open: (lotId: string) => void;
  /** Refleja el estado y cierra la ventana si el local ya no está libre para su dueño o no es suyo. */
  update: (state: GameState, playerId: string) => void;
}

export function createLandlordWindow(actions: LandlordActions): LandlordWindow {
  const win = new PixelWindow({
    title: 'Tu local',
    x: Math.max(24, window.innerWidth - 440),
    y: 110,
    width: 400,
  });
  const { plots } = ECONOMY;
  /** Parte de cada fianza y alquiler que se queda el pueblo, en %. */
  const commission = Math.round(plots.commissionRate * 100);
  let lotId: string | null = null;
  let signature = '';
  /** Partes que dependen del tiempo o del dinero y se actualizan sin reconstruir. */
  let timers: ((tick: number) => void)[] = [];
  /** Pone al día el estado de los botones (dinero y valores escritos). */
  let refreshButtons: (() => void) | null = null;
  /** Último estado recibido, para las cuentas atrás y los botones. */
  let latest: { state: GameState; playerId: string } | null = null;

  /** Cuenta atrás del mantenimiento, o el aviso si está suspendido. */
  const upkeepNote = (lot: Lot): HTMLElement => {
    if (lot.suspended) {
      return text('Suspendido: no pudiste pagar el mantenimiento. No admite inquilinos nuevos hasta que lo pagues.');
    }
    const next = text('');
    // Se lee del estado más reciente: tras cada cobro, la fecha cambia sin reconstruir la ventana.
    timers.push((tick) => {
      const nextUpkeepAt = latest!.state.lots[lot.id].nextUpkeepAt!;
      next.textContent = `Próximo cobro del mantenimiento en ${formatTicks(nextUpkeepAt - tick)}.`;
    });
    return next;
  };

  // --- Libre: poner en alquiler o cambiar las condiciones ------------------------
  const vacant = (lot: Lot, owes: boolean) => {
    const listed = !!lot.terms;
    const terms = lot.terms ?? plots.initialTerms;
    const deposit = numberInput(terms.deposit, plots.deposit.min, plots.deposit.max);
    const rent = numberInput(terms.rent, plots.rent.min, plots.rent.max);

    const save = button(listed ? 'Guardar condiciones' : 'Poner en alquiler', false, () =>
      actions.list(lot.id, readNumber(deposit), readNumber(rent)),
    );
    // valueAsNumber da NaN con el campo vacío, que no pasa la comprobación.
    refreshButtons = () => {
      const { state, playerId } = latest!;
      const valid =
        isIntegerBetween(deposit.valueAsNumber, plots.deposit.min, plots.deposit.max) &&
        isIntegerBetween(rent.valueAsNumber, plots.rent.min, plots.rent.max);
      const charged = !listed && owes;
      const affordable = !charged || (state.money[playerId] ?? 0) >= plots.upkeep;
      save.disabled = !valid || !affordable;
      save.title = affordable ? '' : 'No tienes dinero para el primer mantenimiento';
    };
    deposit.addEventListener('input', refreshButtons);
    rent.addEventListener('input', refreshButtons);

    const actionsRow = document.createElement('div');
    actionsRow.append(save);
    if (listed) actionsRow.append(button('Retirar del alquiler', true, () => actions.unlist(lot.id)));

    win.body.append(
      text('Fianza:', 'section-title'),
      deposit,
      text('Alquiler al día:', 'section-title'),
      rent,
      text(
        `Fianza de ${formatMoney(plots.deposit.min)} a ${formatMoney(plots.deposit.max)}; ` +
          `alquiler de ${formatMoney(plots.rent.min)} a ${formatMoney(plots.rent.max)}. ` +
          `Cobras aunque no estés, menos un ${commission} % para el pueblo.`,
      ),
      actionsRow,
      text('Mantenimiento:', 'section-title'),
      text(`${formatMoney(plots.upkeep)} al día mientras esté en alquiler, tenga inquilino o no.`),
    );
    if (listed) {
      win.body.append(upkeepNote(lot));
    } else {
      win.body.append(
        text(
          owes
            ? `Al ponerlo en alquiler pagas ya el primer mantenimiento (${formatMoney(plots.upkeep)}).`
            : 'El periodo de mantenimiento ya está pagado: ahora no pagas nada.',
        ),
      );
    }
  };

  // --- Con inquilino: condiciones fijas y mejora del local -----------------------
  const rented = (lot: Lot, state: GameState, playerId: string) => {
    const terms = lot.terms!;
    win.body.append(
      text('Inquilino:', 'section-title'),
      text(`${lot.ownerName} (${ECONOMY.businesses[lot.business!].name})`),
      text('Condiciones:', 'section-title'),
      text(
        `Fianza de ${formatMoney(terms.deposit)} y alquiler de ${formatMoney(terms.rent)} al día. ` +
          'No puedes cambiarlas mientras haya inquilino.',
      ),
      text('Mantenimiento:', 'section-title'),
      text(`${formatMoney(plots.upkeep)} al día.`),
      upkeepNote(lot),
      ...levelSection(lot, state, playerId, true, () => actions.upgrade(lot.id), timers),
    );
  };

  const update = (state: GameState, playerId: string) => {
    if (!win.isOpen || !lotId) return;
    const lot = state.lots[lotId];
    // Se cierra si el local deja de ser suyo o si abre su propio negocio en él.
    if (!lot || lot.builtBy !== playerId || lot.ownerId === playerId) {
      win.close();
      lotId = null;
      return;
    }
    latest = { state, playerId };
    const tenant = lot.ownerId !== null;
    const owes = (lot.nextUpkeepAt ?? 0) <= state.tick;
    // Con inquilino no hay campos que proteger, así que ahí sí cuenta el dinero
    // (para el botón de mejorar); sin él, solo cuenta si el primer
    // mantenimiento se cobraría.
    const next = JSON.stringify(
      tenant
        ? [
            lot.ownerName,
            lot.business,
            lot.terms,
            lot.suspended,
            lot.level,
            lot.upgradeReadyAt,
            state.money[playerId],
            state.materials[playerId],
          ]
        : [lot.id, lot.terms, lot.suspended, owes],
    );
    if (next !== signature) {
      signature = next;
      timers = [];
      refreshButtons = null;
      win.setTitle(`Tu local: ${lot.label}`);
      win.body.replaceChildren();
      if (tenant) rented(lot, state, playerId);
      else vacant(lot, owes);
    }
    refreshButtons?.();
    for (const timer of timers) timer(state.tick);
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
