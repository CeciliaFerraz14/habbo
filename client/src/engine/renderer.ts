// El renderer solo LEE datos y dibuja. Nunca modifica el estado del juego.

import {
  CATALOG,
  furnitureInScene,
  getFootprint,
  getSeatAt,
  isInsideScene,
  type Avatar,
  type Door,
  type FurniItem,
  type FurniPlacement,
  type GameState,
  type GroundChar,
  type InteriorTheme,
  type Scene,
  type Vehicle,
} from '@juego/shared';
import type { AvatarView, AvatarViews } from '../game/avatarViews';
import type { VehicleView, VehicleViews } from '../game/vehicleViews';
import {
  AVATAR_WIDTH,
  FRAME_SIT,
  FRAME_STAND,
  getAvatarFrames,
  HIP_ROW,
  SHADOW,
  WALK_CYCLE,
} from '../sprites/avatar';
import type { Sprite } from '../sprites/canvas';
import { getEmissiveSprite, getFurniSprite, getModel } from '../sprites/furniture/bake';
import type { LightPool } from '../sprites/furniture/model';
import { createBackdrop } from './backdrop';
import { PHASE_DARKNESS, type DayPhase } from './daylight';
import { Lighting } from './lighting';
import { buildRoomSprites, WALL_HEIGHT, type RoomSprites } from '../sprites/room';
import type { Camera } from './camera';
import { depthSort, type DepthBox } from './depth';
import { TILE_HEIGHT, TILE_WIDTH, tileToScreen, type Point } from './iso';

const HALF_W = TILE_WIDTH / 2;
const HALF_H = TILE_HEIGHT / 2;
/** Milisegundos que dura cada fotograma de la animación de caminar. */
const WALK_FRAME_MS = 130;
/** Desempate enorme para que un avatar sentado se dibuje después de su asiento. */
const SEATED_TIE_BONUS = 1000;

/** Mueble "fantasma" que sigue al ratón mientras lo colocamos o movemos. */
export interface Ghost extends FurniPlacement {
  valid: boolean;
}

export interface RenderInput {
  state: GameState;
  /** Escena que se dibuja (la del jugador). */
  sceneId: string;
  views: AvatarViews;
  /** Posiciones visuales de los coches. */
  vehicles: VehicleViews;
  camera: Camera;
  /** Baldosa bajo el ratón, o null si el ratón está fuera de la sala. */
  hoverTile: Point | null;
  /** Mueble seleccionado (se marca su base). */
  selectedId: string | null;
  /** Mueble que se está colocando, o null. */
  ghost: Ghost | null;
  /** Tiempo actual en ms, para las animaciones. */
  now: number;
  /** Momento del día (día, atardecer, noche...). */
  phase: DayPhase;
}

/** Fracción de la oscuridad nocturna que se aplica dentro de los interiores. */
const INTERIOR_DARKNESS = 0.55;

/** Algo de la escena en lo que se puede hacer clic. */
export type PickTarget = { kind: 'furni'; item: FurniItem } | { kind: 'door'; door: Door };

/** Dónde se dibujó cada cosa "clicable" en el último fotograma, para saber qué hay bajo el ratón. */
interface DrawnPickable {
  target: PickTarget;
  sprite: Sprite;
  x: number;
  y: number;
}

export class Renderer {
  private drawn: DrawnPickable[] = [];
  private backdrop: { key: string; canvas: HTMLCanvasElement } | null = null;
  /** Capas de escena y de luces (ver lighting.ts). */
  private readonly lighting = new Lighting();
  /** Dónde se dibuja la escena: la capa de escena de `lighting`, no el canvas visible. */
  private ctx: CanvasRenderingContext2D;
  private readonly alphaCache = new WeakMap<Sprite, Uint8ClampedArray>();

  /** Sprites de suelo y paredes de la escena que se está dibujando. */
  private sprites: RoomSprites;
  /** Un juego de sprites por estilo de interior, generado la primera vez que hace falta. */
  private readonly spritesByTheme = new Map<InteriorTheme, RoomSprites>();

  /** @param output contexto del canvas visible, donde se combinan las capas al final. */
  constructor(private readonly output: CanvasRenderingContext2D) {
    this.ctx = this.lighting.context;
    this.sprites = this.spritesFor('adobe');
  }

  private spritesFor(theme: InteriorTheme): RoomSprites {
    let sprites = this.spritesByTheme.get(theme);
    if (!sprites) {
      sprites = buildRoomSprites(theme);
      this.spritesByTheme.set(theme, sprites);
    }
    return sprites;
  }

  render(input: RenderInput): void {
    const { state, sceneId, views, vehicles, camera, hoverTile, selectedId, ghost, now, phase } = input;
    const { ctx } = this;
    const { width, height } = this.output.canvas;
    const scene = state.scenes[sceneId];
    this.lighting.begin(width, height);
    this.drawn = [];
    if (!scene) return;
    this.sprites = this.spritesFor(scene.theme ?? 'adobe');

    this.drawFloor(scene, camera);
    if (scene.kind === 'interior') {
      this.drawWalls(scene, camera);
      this.drawWallDoors(scene, camera);
    }

    // Marcas sobre el suelo (debajo de muebles y avatares).
    const selected = selectedId ? state.furniture[selectedId] : undefined;
    if (selected) this.drawFootprint(selected, this.sprites.selected, camera);
    if (ghost) {
      this.drawFootprint(ghost, ghost.valid ? this.sprites.valid : this.sprites.invalid, camera);
    } else if (hoverTile && isInsideScene(scene, hoverTile.x, hoverTile.y)) {
      this.drawAtTile(this.sprites.hover, hoverTile.x, hoverTile.y, camera, -HALF_W, 0);
    }

    this.drawScene(state, sceneId, views, vehicles, camera, now);

    // El fantasma va encima de todo y semitransparente.
    if (ghost) {
      ctx.globalAlpha = ghost.valid ? 0.75 : 0.45;
      const { sprite, offsetX, offsetY } = getFurniSprite(ghost.defId, ghost.rotation);
      this.drawAtTile(sprite, ghost.x, ghost.y, camera, offsetX, offsetY);
      ctx.globalAlpha = 1;
    }

    // Dentro de un interior la noche se nota menos (hay luz dentro).
    const darkness = PHASE_DARKNESS[phase] * (scene.kind === 'interior' ? INTERIOR_DARKNESS : 1);
    this.lighting.compose(this.output, this.getBackdrop(width, height, phase), darkness);
  }

  /**
   * Devuelve lo que hay bajo el punto (x, y) del canvas (un mueble o una
   * puerta), o null.
   *
   * Recorremos lo dibujado en orden INVERSO: lo último dibujado es lo que está
   * delante. No basta con mirar el rectángulo del sprite (sería muy
   * impreciso): comprobamos si el píxel concreto del sprite es opaco.
   */
  pickAt(x: number, y: number): PickTarget | null {
    for (let i = this.drawn.length - 1; i >= 0; i--) {
      const d = this.drawn[i];
      const sx = Math.floor(x - d.x);
      const sy = Math.floor(y - d.y);
      if (sx < 0 || sy < 0 || sx >= d.sprite.width || sy >= d.sprite.height) continue;
      const alpha = this.getAlpha(d.sprite)[(sy * d.sprite.width + sx) * 4 + 3];
      if (alpha > 0) return d.target;
    }
    return null;
  }

  /**
   * Punto del canvas justo encima de la cabeza de un avatar (para los bocadillos).
   * Usa las mismas cuentas que drawAvatar(): de pie, los pies están 2 px por
   * debajo del centro de la baldosa; sentado, las caderas están a la altura del asiento.
   */
  avatarHeadPosition(state: GameState, avatar: Avatar, view: AvatarView, camera: Camera): Point {
    const p = tileToScreen(view.x, view.y);
    const centerX = camera.originX + p.x;
    const centerY = camera.originY + p.y + HALF_H;
    if (avatar.sitting) {
      const seat = getSeatAt(state, avatar.sceneId, avatar.x, avatar.y);
      const seatHeight = (seat && getModel(seat.defId, seat.variant).seatHeight) ?? 0;
      return { x: centerX, y: centerY - seatHeight - HIP_ROW };
    }
    const standHeight = getAvatarFrames(avatar.look)[avatar.direction][FRAME_STAND].height;
    return { x: centerX, y: centerY + 2 - standHeight };
  }

  /** Fondo del momento del día. Solo se regenera si cambia el tamaño o la fase. */
  private getBackdrop(width: number, height: number, phase: DayPhase): HTMLCanvasElement {
    const key = `${width}x${height}:${phase}`;
    if (this.backdrop?.key !== key) {
      this.backdrop = { key, canvas: createBackdrop(width, height, phase) };
    }
    return this.backdrop.canvas;
  }

  /**
   * Punto del canvas en el centro de la parte de arriba del sprite de un
   * mueble (para colocar etiquetas encima), según el último fotograma dibujado.
   */
  furniTop(itemId: string): Point | null {
    const d = this.drawn.find((x) => x.target.kind === 'furni' && x.target.item.id === itemId);
    return d ? { x: d.x + d.sprite.width / 2, y: d.y } : null;
  }

  /** Lee (una sola vez por sprite) los píxeles del sprite para consultar su transparencia. */
  private getAlpha(sprite: Sprite): Uint8ClampedArray {
    let data = this.alphaCache.get(sprite);
    if (!data) {
      const ctx = sprite.canvas.getContext('2d')!;
      data = ctx.getImageData(0, 0, sprite.width, sprite.height).data;
      this.alphaCache.set(sprite, data);
    }
    return data;
  }

  /**
   * Dibuja un sprite tomando como referencia la esquina superior de la
   * baldosa (x, y), desplazado (offsetX, offsetY) píxeles.
   * Redondeamos para que el sprite caiga siempre en píxeles enteros.
   * Devuelve la posición en el canvas donde quedó el sprite.
   */
  private drawAtTile(
    sprite: Sprite,
    x: number,
    y: number,
    camera: Camera,
    offsetX: number,
    offsetY: number,
  ): Point {
    const p = tileToScreen(x, y);
    const screen = {
      x: Math.round(camera.originX + p.x + offsetX),
      y: Math.round(camera.originY + p.y + offsetY),
    };
    this.ctx.drawImage(sprite.canvas, screen.x, screen.y);
    return screen;
  }

  private drawFootprint(item: FurniPlacement, sprite: Sprite, camera: Camera): void {
    const f = getFootprint(item);
    for (let dy = 0; dy < f.depth; dy++) {
      for (let dx = 0; dx < f.width; dx++) {
        this.drawAtTile(sprite, f.x + dx, f.y + dy, camera, -HALF_W, 0);
      }
    }
  }

  /**
   * Sprite de suelo de la baldosa (x, y). Los interiores llevan baldosa de
   * barro cocido; los exteriores leen su mapa `ground` (arena, acera, asfalto).
   * La arena y el barro alternan dos tonos en patrón de ajedrez (paridad de x + y).
   */
  private groundSprite(scene: Scene, x: number, y: number): Sprite {
    const s = this.sprites;
    const even = (x + y) % 2 === 0;
    if (scene.kind === 'interior') return even ? s.floorA : s.floorB;
    switch (scene.ground?.[y]?.[x] as GroundChar | undefined) {
      case 's':
        return s.sidewalk;
      case 'r':
        return s.asphalt;
      case '-':
        return s.asphaltLine;
      default:
        return even ? s.sandA : s.sandB;
    }
  }

  private drawFloor(room: Scene, camera: Camera): void {
    const s = this.sprites;
    for (let y = 0; y < room.depth; y++) {
      for (let x = 0; x < room.width; x++) {
        const tile = this.groundSprite(room, x, y);
        // El sprite del rombo tiene su esquina superior en la columna HALF_W,
        // así que lo desplazamos HALF_W a la izquierda.
        this.drawAtTile(tile, x, y, camera, -HALF_W, 0);

        // Cantos de la plataforma en los dos bordes delanteros.
        if (y === room.depth - 1) this.drawAtTile(s.sideLeft, x, y, camera, -HALF_W, 0);
        if (x === room.width - 1) this.drawAtTile(s.sideRight, x, y, camera, -HALF_W, 0);
      }
    }
  }

  private drawWalls(room: Scene, camera: Camera): void {
    const s = this.sprites;
    // Pared izquierda: sobre la arista superior-izquierda de las baldosas x = 0.
    for (let y = 0; y < room.depth; y++) {
      const sprite = y === room.depth - 1 ? s.wallLeftEnd : s.wallLeft;
      this.drawAtTile(sprite, 0, y, camera, -HALF_W, -WALL_HEIGHT);
    }
    // Pared derecha: sobre la arista superior-derecha de las baldosas y = 0.
    for (let x = 0; x < room.width; x++) {
      const sprite = x === room.width - 1 ? s.wallRightEnd : s.wallRight;
      this.drawAtTile(sprite, x, 0, camera, 0, -WALL_HEIGHT);
    }
  }

  /**
   * Puertas pintadas en las paredes de un interior. Una puerta en x = 0 va en
   * la pared izquierda y una en y = 0, en la derecha (igual que los trozos de
   * pared, así que usan los mismos desplazamientos).
   */
  private drawWallDoors(scene: Scene, camera: Camera): void {
    for (const door of scene.doors) {
      const onLeft = door.x === 0;
      const sprite = onLeft ? this.sprites.doorLeft : this.sprites.doorRight;
      const at = this.drawAtTile(sprite, door.x, door.y, camera, onLeft ? -HALF_W : 0, -WALL_HEIGHT);
      this.drawn.push({ target: { kind: 'door', door }, sprite, ...at });
    }
  }

  private drawFurni(item: FurniItem, camera: Camera): void {
    const { defId, rotation, variant } = item;
    const { sprite, offsetX, offsetY } = getFurniSprite(defId, rotation, 'all', variant);
    const at = this.drawAtTile(sprite, item.x, item.y, camera, offsetX, offsetY);
    this.drawn.push({ target: { kind: 'furni', item }, sprite, ...at });

    // Capa de luces: el mueble tapa lo que tenga detrás y añade sus luces.
    this.lighting.occlude(sprite, at.x, at.y);
    const lit = getEmissiveSprite(defId, rotation, variant);
    if (lit) {
      const p = tileToScreen(item.x, item.y);
      this.lighting.emit(
        lit.sprite,
        Math.round(camera.originX + p.x + lit.offsetX),
        Math.round(camera.originY + p.y + lit.offsetY),
      );
    }
    const light = getModel(defId, variant).light;
    if (light) this.addLightPool(item, light, camera);
  }

  /**
   * Charco de luz en el suelo de un mueble. Su desplazamiento está definido
   * con el mueble en rotación 0, así que lo giramos igual que el mueble: cada
   * cuarto de vuelta convierte (dx, dy) en (-dy, dx).
   */
  private addLightPool(item: FurniPlacement, light: LightPool, camera: Camera): void {
    let dx = light.dx ?? 0;
    let dy = light.dy ?? 0;
    for (let r = 0; r < item.rotation; r++) [dx, dy] = [-dy, dx];
    const f = getFootprint(item);
    const p = tileToScreen(f.x + f.width / 2 + dx, f.y + f.depth / 2 + dy);
    this.lighting.addPool(camera.originX + p.x, camera.originY + p.y, light.color, light.radius);
  }

  /**
   * Dibuja los muebles y avatares DE ESTA ESCENA en el orden correcto de
   * profundidad. Las alfombras van antes, a ras de suelo: nunca tapan nada.
   */
  private drawScene(
    state: GameState,
    sceneId: string,
    views: AvatarViews,
    vehicles: VehicleViews,
    camera: Camera,
    now: number,
  ): void {
    const flat: FurniItem[] = [];
    const drawables: Drawable[] = [];

    for (const item of furnitureInScene(state, sceneId)) {
      if (CATALOG[item.defId].walkable) {
        flat.push(item);
        continue;
      }
      const f = getFootprint(item);
      const box = { x0: f.x, y0: f.y, x1: f.x + f.width, y1: f.y + f.depth };
      drawables.push({ box, tie: 0, draw: () => this.drawFurni(item, camera) });
    }

    for (const avatar of Object.values(state.avatars)) {
      if (avatar.sceneId !== sceneId) continue;
      const view = views.get(avatar.id);
      if (!view) continue;
      // El avatar ocupa una baldosa, pero en su posición VISUAL (con decimales),
      // para que se ordene bien también a mitad de paso.
      // Si está sentado, comparte baldosa con el asiento: ninguno está
      // "detrás" del otro, así que el desempate decide. Le damos un desempate
      // enorme para que se dibuje DESPUÉS del asiento.
      drawables.push({
        box: { x0: view.x, y0: view.y, x1: view.x + 1, y1: view.y + 1 },
        tie: avatar.sitting ? SEATED_TIE_BONUS : 0,
        draw: () => this.drawAvatar(state, avatar, view, camera, now),
      });
    }

    // Los coches solo circulan por la calle. Ocupan 2 baldosas a lo largo de x.
    if (state.scenes[sceneId]?.kind === 'street') {
      for (const car of Object.values(state.vehicles)) {
        const view = vehicles.get(car.id);
        if (!view) continue;
        drawables.push({
          box: { x0: view.x, y0: view.y, x1: view.x + 2, y1: view.y + 1 },
          tie: 0,
          draw: () => this.drawVehicle(car, view, camera),
        });
      }
    }

    flat.sort((a, b) => a.x + a.y - (b.x + b.y)).forEach((item) => this.drawFurni(item, camera));

    const sorted = depthSort(
      drawables,
      (d) => d.box,
      (d) => d.box.x0 + d.box.x1 + d.box.y0 + d.box.y1 + d.tie,
    );
    for (const d of sorted) d.draw();
  }

  /**
   * Un coche se dibuja como un mueble 'car' (con su color como variante),
   * pero en su posición VISUAL, para que avance suave entre baldosas.
   */
  private drawVehicle(car: Vehicle, view: VehicleView, camera: Camera): void {
    const { sprite, offsetX, offsetY } = getFurniSprite('car', 0, 'all', car.color);
    const at = this.drawAtTile(sprite, view.x, view.y, camera, offsetX, offsetY);
    this.lighting.occlude(sprite, at.x, at.y);
    const lit = getEmissiveSprite('car', 0, car.color);
    if (lit) {
      const p = tileToScreen(view.x, view.y);
      this.lighting.emit(
        lit.sprite,
        Math.round(camera.originX + p.x + lit.offsetX),
        Math.round(camera.originY + p.y + lit.offsetY),
      );
    }
    const light = getModel('car', car.color).light;
    if (light) {
      this.addLightPool({ defId: 'car', x: view.x, y: view.y, rotation: 0 }, light, camera);
    }
  }

  private drawAvatar(
    state: GameState,
    avatar: Avatar,
    view: AvatarView,
    camera: Camera,
    now: number,
  ): void {
    const frames = getAvatarFrames(avatar.look)[avatar.direction];

    if (avatar.sitting) {
      // Sentado: las caderas (HIP_ROW) se apoyan a la altura del asiento,
      // seatHeight píxeles por encima del centro de la baldosa.
      const seat = getSeatAt(state, avatar.sceneId, avatar.x, avatar.y);
      const seatHeight = (seat && getModel(seat.defId, seat.variant).seatHeight) ?? 0;
      const sprite = frames[FRAME_SIT];
      const at = this.drawAtTile(sprite, view.x, view.y, camera, -AVATAR_WIDTH / 2, HALF_H - seatHeight - HIP_ROW);
      this.lighting.occlude(sprite, at.x, at.y);

      // Si el asiento mira hacia el fondo (NW o NE), su respaldo está entre la
      // cámara y el avatar: lo repintamos encima para que tape su espalda.
      if (seat && seat.rotation >= 2) {
        const back = getFurniSprite(seat.defId, seat.rotation, 'backrest', seat.variant);
        const b = this.drawAtTile(back.sprite, seat.x, seat.y, camera, back.offsetX, back.offsetY);
        this.lighting.occlude(back.sprite, b.x, b.y);
      }
      return;
    }

    // De pie: los pies van en el CENTRO de la baldosa, que está HALF_H píxeles
    // por debajo de su esquina superior.
    const frameIndex = view.walking
      ? WALK_CYCLE[Math.floor(now / WALK_FRAME_MS) % WALK_CYCLE.length]
      : FRAME_STAND;
    const sprite = frames[frameIndex];
    this.drawAtTile(SHADOW, view.x, view.y, camera, -SHADOW.width / 2, HALF_H - 2);
    const at = this.drawAtTile(sprite, view.x, view.y, camera, -AVATAR_WIDTH / 2, HALF_H + 2 - sprite.height);
    // Los avatares no dan luz, pero tapan las luces que tengan detrás.
    this.lighting.occlude(sprite, at.x, at.y);
  }
}

/** Algo que se dibuja en la escena con su caja para ordenar por profundidad. */
interface Drawable {
  box: DepthBox;
  /** Se suma al desempate de profundidad. */
  tie: number;
  draw: () => void;
}
