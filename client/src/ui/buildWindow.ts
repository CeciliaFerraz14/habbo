// Ventana de un solar del Ensanche: lo que cuesta construir un local en él
// (dinero y materiales, con lo que tienes) y el botón para hacerlo.
import { ECONOMY, MATERIAL_IDS, hasMaterials, type GameState } from '@juego/shared';
import { formatMoney } from './economyUi';
import { PixelWindow } from './window';

export interface BuildWindow {
  /** Abre la ventana del solar número `solar`. */
  open: (solar: number, state: GameState, playerId: string) => void;
}

export function createBuildWindow(onBuild: (solar: number) => void): BuildWindow {
  const win = new PixelWindow({
    title: 'Solar en venta',
    x: Math.max(24, window.innerWidth - 440),
    y: 110,
    width: 400,
  });

  const text = (content: string, className = 'hint') => {
    const p = document.createElement('p');
    p.className = className;
    p.textContent = content;
    return p;
  };

  const open = (solar: number, state: GameState, playerId: string) => {
    const { price, materials, seconds } = ECONOMY.building;
    const money = state.money[playerId] ?? 0;
    const mine = state.materials[playerId] ?? {};
    win.setTitle(`Solar en venta · Ensanche ${solar + 1}`);

    // Lo que hace falta, con lo que tienes al lado.
    const list = document.createElement('ul');
    list.className = 'board-list';
    const need = (label: string, have: number, needed: number) => {
      const li = document.createElement('li');
      li.textContent = `${label}: tienes ${have} de ${needed}`;
      if (have < needed) li.style.opacity = '0.6';
      list.append(li);
    };
    need('Dinero', money, price);
    for (const m of MATERIAL_IDS) {
      const qty = materials[m];
      if (qty) need(ECONOMY.materials[m].name, mine[m] ?? 0, qty);
    }

    const canBuild = money >= price && hasMaterials(mine, materials);
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = `Construir · ${formatMoney(price)}`;
    button.disabled = !canBuild;
    button.addEventListener('click', () => {
      onBuild(solar);
      win.close();
    });

    win.body.replaceChildren(
      text(
        'Construye aquí tu propio local. Será tuyo para siempre, y puedes elegir: abrir tú un negocio ' +
          'en él, sin alquiler ni fianza (si lo cierras, el local sigue siendo tuyo), o ponerlo en alquiler ' +
          'para otros jugadores con la fianza y el alquiler que decidas.',
      ),
      text(
        `El mantenimiento (${formatMoney(ECONOMY.plots.upkeep)} al día) solo se paga mientras esté en alquiler.`,
      ),
      text('Para construirlo necesitas:', 'section-title'),
      list,
      text(`La obra tarda ${Math.round(seconds / 60)} minutos.`),
      button,
    );
    win.open();
  };

  return { open };
}
