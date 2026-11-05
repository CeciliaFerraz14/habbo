// Ventana "Mi rango": tu nivel y experiencia, cómo se gana XP y todos los
// rangos con su recompensa (los que ya tienes, el actual y los que faltan).
import { ECONOMY, levelOf, MAX_LEVEL, progressOf, RANKS, type GameState } from '@juego/shared';
import { PixelWindow } from './window';

/** Color de la insignia según el nivel: bronce, plata, oro y, el último, neón. */
export function levelTier(level: number): 'bronze' | 'silver' | 'gold' | 'legend' {
  if (level >= MAX_LEVEL) return 'legend';
  if (level >= 7) return 'gold';
  if (level >= 4) return 'silver';
  return 'bronze';
}

/** Insignia con el número de nivel (la de la cartera, los nombres y esta ventana). */
export function levelBadge(level: number): HTMLElement {
  const badge = document.createElement('b');
  badge.className = `level-badge ${levelTier(level)}`;
  badge.textContent = String(level);
  return badge;
}

/** Barra de experiencia: cuánto llevas del rango actual al siguiente. */
export function xpBar(xp: number, level: number): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'xp-bar';
  const fill = document.createElement('i');
  const from = RANKS[level - 1].xp;
  const to = RANKS[level]?.xp;
  fill.style.width = to === undefined ? '100%' : `${Math.round(((xp - from) / (to - from)) * 100)}%`;
  bar.append(fill);
  return bar;
}

/** Lo que se enseña de cómo se gana XP. */
const XP_SOURCES = (() => {
  const xp = ECONOMY.levels.xp;
  return [
    `Un viajero te compra o paga tu servicio: +1 por cada ${ECONOMY.currency}${xp.saleDollarsPerXp}`,
    `Recoger un mueble fabricado: +${xp.craft}`,
    `Recoger materiales de tu productor: +${xp.collect}`,
    `Entregar un encargo de Hank: +${xp.order}`,
    `Completar un turno en la gasolinera: +${xp.shift}`,
    `Abrir un negocio: +${xp.openBusiness}`,
    `Entrar a jugar cada día: +${xp.daily}`,
  ];
})();

export interface RankWindow {
  open: () => void;
  update: (state: GameState, playerId: string) => void;
}

export function createRankWindow(): RankWindow {
  // Más abajo que las demás ventanas: se abre desde la cartera y no debe taparla.
  const win = new PixelWindow({ title: 'Mi rango', x: 24, y: 140, width: 400 });
  let signature = '';

  const update = (state: GameState, playerId: string) => {
    if (!win.isOpen) return;
    const { xp } = progressOf(state, playerId);
    const level = levelOf(state, playerId);
    const next = JSON.stringify([xp, level]);
    if (next === signature) return;
    signature = next;

    const current = RANKS[level - 1];
    const following = RANKS[level];
    const head = document.createElement('div');
    head.className = 'rank-head';
    const title = document.createElement('span');
    title.className = 'rank-name';
    title.textContent = current.name;
    head.append(levelBadge(level), title);
    const progress = document.createElement('p');
    progress.className = 'hint';
    progress.textContent = following
      ? `${xp} XP · te faltan ${following.xp - xp} para ${following.name}`
      : `${xp} XP · ¡has llegado al rango más alto!`;

    const how = document.createElement('ul');
    how.className = 'board-list';
    for (const line of XP_SOURCES) {
      const li = document.createElement('li');
      li.textContent = line;
      how.append(li);
    }

    const list = document.createElement('div');
    list.className = 'rank-list';
    RANKS.forEach((rank, i) => {
      const n = i + 1;
      const row = document.createElement('div');
      row.className = 'rank-row';
      row.classList.toggle('reached', n <= level);
      row.classList.toggle('current', n === level);
      const info = document.createElement('div');
      info.className = 'recipe-info';
      const name = document.createElement('span');
      name.textContent = `${rank.name} · ${rank.xp} XP${n === level ? ' · estás aquí' : ''}`;
      const reward = document.createElement('span');
      reward.className = 'rank-reward';
      const soon = rank.reward?.soon ? ' (próximamente)' : '';
      reward.textContent = rank.reward ? `${n <= level ? '✓ ' : ''}${rank.reward.text}${soon}` : 'Para empezar';
      info.append(name, reward);
      row.append(levelBadge(n), info);
      list.append(row);
    });

    win.body.replaceChildren(head, xpBar(xp, level), progress);
    const heading = (t: string) => {
      const p = document.createElement('p');
      p.className = 'section-title';
      p.textContent = t;
      return p;
    };
    win.body.append(heading('Cómo se gana experiencia'), how, heading('Rangos'), list);
  };

  return {
    open() {
      signature = '';
      win.open();
    },
    update,
  };
}
