// El controlador traduce lo que hace el jugador (clics, teclas, botones) en
// ACCIONES que envía al Transport.
//
// También guarda el estado de la INTERFAZ, que no forma parte del estado del
// juego porque solo le importa a este jugador: qué mueble tiene seleccionado
// y si está colocando uno. Eso nunca viajará al servidor.

import {
  canPlaceFurni,
  CATALOG,
  footprintContains,
  getFootprint,
  isInsideRoom,
  type FurniId,
  type GameState,
  type Rotation,
} from '@juego/shared';
import type { PointerInfo } from '../engine/input';
import type { Ghost } from '../engine/renderer';
import type { Point } from '../engine/iso';
import type { Transport } from './transport';

/** Mueble que el jugador lleva "en la mano" para colocarlo. */
interface Placing {
  /** 'place' = sale del inventario; 'move' = ya estaba en la sala. */
  kind: 'place' | 'move';
  itemId: string;
  defId: FurniId;
  rotation: Rotation;
}

type Listener = () => void;

export class GameController {
  private placing: Placing | null = null;
  private selectedId: string | null = null;
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly transport: Transport,
    private readonly playerId: string,
    private readonly getState: () => GameState,
    /** Devuelve el mueble dibujado en un punto del canvas (lo resuelve el renderer). */
    private readonly pickFurniAt: (p: Point) => { id: string } | null,
  ) {
    window.addEventListener('keydown', (e) => {
      // Si se está escribiendo en un campo de texto, las teclas no son para el juego.
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Escape') this.cancel();
      if (e.key === 'r' || e.key === 'R') this.rotate();
    });
  }

  /** Avisa a la interfaz cuando cambia la selección o el modo de colocación. */
  onChange(listener: Listener): void {
    this.listeners.add(listener);
  }

  get selected(): string | null {
    return this.selectedId;
  }

  get isPlacing(): boolean {
    return this.placing !== null;
  }

  /** Comprueba que la selección sigue existiendo tras un cambio de estado. */
  syncWithState(state: GameState): void {
    if (this.selectedId && !state.furniture[this.selectedId]) this.select(null);
    if (this.placing?.kind === 'place') {
      const inventory = state.inventories[this.playerId] ?? [];
      if (!inventory.some((i) => i.id === this.placing!.itemId)) this.setPlacing(null);
    }
  }

  // --- Acciones de la interfaz -------------------------------------------

  buy(defId: FurniId): void {
    this.transport.dispatch({ type: 'BUY_FURNI', avatarId: this.playerId, defId });
  }

  /** Coge un mueble del inventario para colocarlo. */
  startPlacing(itemId: string): void {
    const item = (this.getState().inventories[this.playerId] ?? []).find((i) => i.id === itemId);
    if (!item) return;
    this.select(null);
    this.setPlacing({ kind: 'place', itemId, defId: item.defId, rotation: 0 });
  }

  /** Coge el mueble seleccionado para moverlo a otro sitio. */
  startMovingSelected(): void {
    const item = this.selectedId ? this.getState().furniture[this.selectedId] : undefined;
    if (!item) return;
    this.setPlacing({ kind: 'move', itemId: item.id, defId: item.defId, rotation: item.rotation });
  }

  /** Gira el mueble que llevamos en la mano o, si no, el seleccionado. */
  rotate(): void {
    if (this.placing) {
      this.setPlacing({ ...this.placing, rotation: nextRotation(this.placing.rotation) });
      return;
    }
    const state = this.getState();
    const item = this.selectedId ? state.furniture[this.selectedId] : undefined;
    if (!item) return;
    // Probamos las siguientes rotaciones hasta encontrar una en la que quepa
    // (un sofá girado puede chocar con la pared o con otro mueble).
    let rotation = item.rotation;
    for (let i = 0; i < 3; i++) {
      rotation = nextRotation(rotation);
      if (canPlaceFurni(state, item.defId, item.x, item.y, rotation, item.id)) {
        this.transport.dispatch({
          type: 'MOVE_FURNI',
          avatarId: this.playerId,
          itemId: item.id,
          x: item.x,
          y: item.y,
          rotation,
        });
        return;
      }
    }
  }

  pickUpSelected(): void {
    if (!this.selectedId) return;
    this.transport.dispatch({ type: 'PICKUP_FURNI', avatarId: this.playerId, itemId: this.selectedId });
    this.select(null);
  }

  cancel(): void {
    if (this.placing) this.setPlacing(null);
    else this.select(null);
  }

  // --- Ratón ---------------------------------------------------------------

  /** El "fantasma" del mueble que llevamos en la mano, colocado en la baldosa del ratón. */
  getGhost(hoverTile: Point | null): Ghost | null {
    if (!this.placing || !hoverTile) return null;
    const state = this.getState();
    if (!isInsideRoom(state.room, hoverTile.x, hoverTile.y)) return null;
    const { defId, rotation, itemId, kind } = this.placing;
    const ignoreId = kind === 'move' ? itemId : undefined;
    return {
      defId,
      rotation,
      x: hoverTile.x,
      y: hoverTile.y,
      valid: canPlaceFurni(state, defId, hoverTile.x, hoverTile.y, rotation, ignoreId),
    };
  }

  handleClick(pointer: PointerInfo): void {
    const state = this.getState();
    const { tile } = pointer;

    // 1. Si llevamos un mueble en la mano, el clic lo suelta.
    if (this.placing) {
      const ghost = this.getGhost(tile);
      if (!ghost?.valid) return;
      const { kind, itemId, rotation } = this.placing;
      this.transport.dispatch({
        type: kind === 'place' ? 'PLACE_FURNI' : 'MOVE_FURNI',
        avatarId: this.playerId,
        itemId,
        x: tile.x,
        y: tile.y,
        rotation,
      });
      this.setPlacing(null);
      return;
    }

    // 2. ¿Hemos hecho clic sobre un mueble? Lo seleccionamos. Si es sentable o
    //    pisable, además caminamos hasta él (y si es una silla, nos sentamos).
    const picked = this.pickFurniAt(pointer.canvas);
    if (picked) {
      const item = state.furniture[picked.id];
      this.select(item.id);
      const def = CATALOG[item.defId];
      if (def.sittable || def.walkable) {
        // Si el ratón está sobre una de sus baldosas, vamos a esa; si no
        // (por ejemplo, clic en el respaldo), a su baldosa de origen.
        const f = getFootprint(item);
        const target = footprintContains(f, tile.x, tile.y) ? tile : { x: item.x, y: item.y };
        this.moveTo(target);
      }
      return;
    }

    // 3. Clic en el suelo: deseleccionamos y caminamos.
    this.select(null);
    if (isInsideRoom(state.room, tile.x, tile.y)) this.moveTo(tile);
  }

  /** Clic derecho: gira el mueble que llevamos en la mano. */
  handleRightClick(): void {
    if (this.placing) this.rotate();
  }

  private moveTo(tile: Point): void {
    this.transport.dispatch({ type: 'MOVE', avatarId: this.playerId, x: tile.x, y: tile.y });
  }

  private select(id: string | null): void {
    if (this.selectedId === id) return;
    this.selectedId = id;
    this.emit();
  }

  private setPlacing(placing: Placing | null): void {
    this.placing = placing;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

function nextRotation(r: Rotation): Rotation {
  return ((r + 1) % 4) as Rotation;
}
