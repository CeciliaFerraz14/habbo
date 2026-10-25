// El controlador traduce lo que hace el jugador (clics, teclas, botones) en
// ACCIONES que envía al Transport.
//
// También guarda el estado de la INTERFAZ, que no forma parte del estado del
// juego porque solo le importa a este jugador: qué mueble tiene seleccionado
// y si está colocando uno. Eso nunca viajará al servidor.

import {
  canEditScene,
  canPlaceFurni,
  CATALOG,
  footprintContains,
  getDoorAt,
  getFootprint,
  isDoorLocked,
  isInsideScene,
  lotOfStation,
  type Door,
  type FurniId,
  type GameState,
  type Rotation,
  type Scene,
} from '@juego/shared';
import type { PointerInfo } from '../engine/input';
import type { Ghost, PickTarget } from '../engine/renderer';
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

/** Cosas que el controlador pide a la interfaz. */
export interface ControllerEvents {
  /** Muestra un aviso breve al jugador. */
  notify: (message: string) => void;
  /** Abre la ventana para alquilar un local libre. */
  openRent: (lotId: string) => void;
  /** Abre la ventana de gestión de un negocio. */
  openBusiness: (lotId: string) => void;
  /** Abre una tienda como cliente (para ver sus productos y comprar). */
  openShop: (lotId: string) => void;
  /** Abre el proveedor de materiales de la gasolinera. */
  openSupplier: () => void;
}

export class GameController {
  private placing: Placing | null = null;
  private selectedId: string | null = null;
  /** Escena en la que estaba el jugador en el último cambio de estado. */
  private lastSceneId: string | null = null;
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly transport: Transport,
    private readonly playerId: string,
    private readonly getState: () => GameState,
    /** Devuelve lo que hay dibujado en un punto del canvas (lo resuelve el renderer). */
    private readonly pickAt: (p: Point) => PickTarget | null,
    private readonly events: ControllerEvents,
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

  /** Escena en la que está el jugador ahora mismo. */
  get scene(): Scene | undefined {
    const state = this.getState();
    const player = state.avatars[this.playerId];
    return player && state.scenes[player.sceneId];
  }

  /** Comprueba que la selección sigue siendo válida tras un cambio de estado. */
  syncWithState(state: GameState): void {
    // Al cambiar de escena soltamos lo que tuviéramos en la mano o seleccionado.
    const sceneId = state.avatars[this.playerId]?.sceneId ?? null;
    if (sceneId !== this.lastSceneId) {
      this.lastSceneId = sceneId;
      this.select(null);
      this.setPlacing(null);
    }
    if (this.selectedId && !state.furniture[this.selectedId]) this.select(null);
    if (this.placing?.kind === 'place') {
      const inventory = state.inventories[this.playerId] ?? [];
      if (!inventory.some((i) => i.id === this.placing!.itemId)) this.setPlacing(null);
    }
  }

  // --- Acciones de la interfaz -------------------------------------------

  /** Coge un mueble del inventario para colocarlo. */
  startPlacing(itemId: string): void {
    const item = (this.getState().inventories[this.playerId] ?? []).find((i) => i.id === itemId);
    if (!item) return;
    if (!this.canDecorateHere()) {
      this.events.notify('Solo puedes decorar tu caravana y tus locales.');
      return;
    }
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
      if (canPlaceFurni(state, item.sceneId, item.defId, item.x, item.y, rotation, item.id)) {
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
    const scene = this.scene;
    if (!scene || !isInsideScene(scene, hoverTile.x, hoverTile.y)) return null;
    const { defId, rotation, itemId, kind } = this.placing;
    const ignoreId = kind === 'move' ? itemId : undefined;
    const { x, y } = hoverTile;
    return {
      defId,
      rotation,
      x,
      y,
      valid:
        this.canDecorateHere() &&
        canPlaceFurni(this.getState(), scene.id, defId, x, y, rotation, ignoreId),
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

    const picked = this.pickAt(pointer.canvas);

    // 2. ¿Clic en una puerta (dibujada en la pared)? Caminamos hasta su
    //    baldosa; al llegar, la simulación nos pasa a la otra escena.
    if (picked?.kind === 'door') {
      this.select(null);
      this.goToDoor(picked.door);
      return;
    }

    // 3. ¿Clic sobre un mueble? Lo seleccionamos. Si es sentable o pisable,
    //    además caminamos hasta él (y si es una silla, nos sentamos).
    if (picked?.kind === 'furni') {
      const item = state.furniture[picked.item.id];
      if (!item) return;
      // Las estructuras fijas (edificios, farolas...) no se seleccionan.
      if (CATALOG[item.defId].fixed) {
        this.select(null);
        // Puesto de trabajo de un negocio: abre su ventana (si es tuyo).
        const lotId = lotOfStation(item.id);
        if (lotId) {
          const lot = state.lots[lotId];
          if (lot?.ownerId === this.playerId) this.events.openBusiness(lotId);
          else if (lot?.business === 'store') this.events.openShop(lotId);
          else this.events.notify('Este negocio no es tuyo.');
          return;
        }
        // La gasolinera es el proveedor de materiales.
        if (item.defId === 'gas_station') {
          this.events.openSupplier();
          return;
        }
        // Edificio con puerta: el clic nos lleva hasta ella.
        const door = this.scene?.doors.find((d) => d.buildingId === item.id);
        if (door) this.goToDoor(door);
        return;
      }
      // Un producto de una tienda ajena: abrimos la tienda para comprarlo.
      if (item.price !== undefined && !this.canDecorateHere()) {
        this.events.openShop(item.sceneId);
        return;
      }
      // Solo se seleccionan (para mover, girar o recoger) los muebles de un
      // sitio que puedes decorar.
      if (!this.canDecorateHere()) {
        const def = CATALOG[item.defId];
        if (def.sittable) this.moveTo(tile);
        return;
      }
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

    // 4. Clic en el suelo: deseleccionamos y caminamos (si es una puerta de
    //    la calle, al llegar cambiaremos de escena).
    this.select(null);
    const scene = this.scene;
    if (!scene || !isInsideScene(scene, tile.x, tile.y)) return;
    const door = getDoorAt(scene, tile.x, tile.y);
    if (door) this.goToDoor(door);
    else this.moveTo(tile);
  }

  /**
   * Camina hasta una puerta. Si es la de un local en alquiler, se queda
   * delante y abre la ventana para alquilarlo.
   */
  private goToDoor(door: Door): void {
    if (isDoorLocked(this.getState(), door)) {
      this.moveTo(door.spawn);
      if (door.lotId) this.events.openRent(door.lotId);
      return;
    }
    this.moveTo(door);
  }

  /** ¿Puede el jugador decorar la escena en la que está? */
  private canDecorateHere(): boolean {
    const scene = this.scene;
    return !!scene && canEditScene(this.getState(), this.playerId, scene.id);
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
