// El renderer solo LEE datos y dibuja. Nunca modifica el estado del juego.

import {
  CATALOG,
  getFootprint,
  getSeatAt,
  isInsideRoom,
  type Avatar,
  type FurniItem,
  type FurniPlacement,
  type GameState,
  type Room,
} from '@juego/shared';
import type { AvatarView, AvatarViews } from '../game/avatarViews';
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
import { getFurniSprite } from '../sprites/furniture/bake';
import { PALETTE } from '../sprites/palette';
import { MODELS } from '../sprites/furniture/index';
import type { RoomSprites } from '../sprites/room';
import { WALL_HEIGHT } from '../sprites/room';
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
  views: AvatarViews;
  camera: Camera;
  /** Baldosa bajo el ratón, o null si el ratón está fuera de la sala. */
  hoverTile: Point | null;
  /** Mueble seleccionado (se marca su base). */
  selectedId: string | null;
  /** Mueble que se está colocando, o null. */
  ghost: Ghost | null;
  /** Tiempo actual en ms, para las animaciones. */
  now: number;
}

/** Dónde se dibujó cada mueble en el último fotograma, para saber cuál hay bajo el ratón. */
interface DrawnFurni {
  item: FurniItem;
  sprite: Sprite;
  x: number;
  y: number;
}

export class Renderer {
  private drawnFurni: DrawnFurni[] = [];
  private backdrop: HTMLCanvasElement | null = null;
  private readonly alphaCache = new WeakMap<Sprite, Uint8ClampedArray>();

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly sprites: RoomSprites,
  ) {}

  render({ state, views, camera, hoverTile, selectedId, ghost, now }: RenderInput): void {
    const { ctx } = this;
    const { room } = state;
    ctx.drawImage(this.getBackdrop(ctx.canvas.width, ctx.canvas.height), 0, 0);
    this.drawnFurni = [];

    this.drawFloor(room, camera);
    this.drawWalls(room, camera);

    // Marcas sobre el suelo (debajo de muebles y avatares).
    const selected = selectedId ? state.furniture[selectedId] : undefined;
    if (selected) this.drawFootprint(selected, this.sprites.selected, camera);
    if (ghost) {
      this.drawFootprint(ghost, ghost.valid ? this.sprites.valid : this.sprites.invalid, camera);
    } else if (hoverTile && isInsideRoom(room, hoverTile.x, hoverTile.y)) {
      this.drawAtTile(this.sprites.hover, hoverTile.x, hoverTile.y, camera, -HALF_W, 0);
    }

    this.drawScene(state, views, camera, now);

    // El fantasma va encima de todo y semitransparente.
    if (ghost) {
      ctx.globalAlpha = ghost.valid ? 0.75 : 0.45;
      const { sprite, offsetX, offsetY } = getFurniSprite(ghost.defId, ghost.rotation);
      this.drawAtTile(sprite, ghost.x, ghost.y, camera, offsetX, offsetY);
      ctx.globalAlpha = 1;
    }
  }

  /**
   * Devuelve el mueble que hay bajo el punto (x, y) del canvas, o null.
   *
   * Recorremos los muebles en orden INVERSO al de dibujo: el último dibujado
   * es el que está delante. No basta con mirar el rectángulo del sprite (sería
   * muy impreciso): comprobamos si el píxel concreto del sprite es opaco.
   */
  pickFurniAt(x: number, y: number): FurniItem | null {
    for (let i = this.drawnFurni.length - 1; i >= 0; i--) {
      const d = this.drawnFurni[i];
      const sx = Math.floor(x - d.x);
      const sy = Math.floor(y - d.y);
      if (sx < 0 || sy < 0 || sx >= d.sprite.width || sy >= d.sprite.height) continue;
      const alpha = this.getAlpha(d.sprite)[(sy * d.sprite.width + sx) * 4 + 3];
      if (alpha > 0) return d.item;
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
      const seat = getSeatAt(state, avatar.x, avatar.y);
      const seatHeight = (seat && MODELS[seat.defId].seatHeight) ?? 0;
      return { x: centerX, y: centerY - seatHeight - HIP_ROW };
    }
    const standHeight = getAvatarFrames(avatar.look)[avatar.direction][FRAME_STAND].height;
    return { x: centerX, y: centerY + 2 - standHeight };
  }

  /**
   * Fondo del desierto: cielo en franjas de color (sin degradado suave, que no
   * sería pixel art) y una línea de dunas en el horizonte. Solo se dibuja de
   * nuevo cuando cambia el tamaño del canvas.
   */
  private getBackdrop(width: number, height: number): HTMLCanvasElement {
    if (this.backdrop?.width === width && this.backdrop.height === height) return this.backdrop;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext('2d')!;

    // Cielo: 4 franjas horizontales, más claras cerca del horizonte.
    const horizon = Math.round(height * 0.62);
    const bands = PALETTE.sky;
    const bandHeight = Math.ceil(horizon / bands.length);
    bands.forEach((color, i) => {
      g.fillStyle = color;
      g.fillRect(0, i * bandHeight, width, bandHeight);
    });

    // Dunas: para cada columna calculamos una altura con dos ondas (seno) de
    // distinto tamaño, redondeada a múltiplos de 2 para que tenga escalones pixel.
    for (let x = 0; x < width; x++) {
      const wave = Math.sin(x / 37) * 8 + Math.sin(x / 13) * 3;
      const top = horizon - 6 + Math.round(wave / 2) * 2;
      g.fillStyle = PALETTE.dunes;
      g.fillRect(x, top, 1, height - top);
      g.fillStyle = PALETTE.dunesShade;
      g.fillRect(x, top + 10, 1, height - top - 10);
    }

    this.backdrop = canvas;
    return canvas;
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

  private drawFloor(room: Room, camera: Camera): void {
    const s = this.sprites;
    for (let y = 0; y < room.depth; y++) {
      for (let x = 0; x < room.width; x++) {
        // Patrón de ajedrez: alternamos dos tonos según la paridad de x + y.
        const tile = (x + y) % 2 === 0 ? s.floorA : s.floorB;
        // El sprite del rombo tiene su esquina superior en la columna HALF_W,
        // así que lo desplazamos HALF_W a la izquierda.
        this.drawAtTile(tile, x, y, camera, -HALF_W, 0);

        // Cantos de la plataforma en los dos bordes delanteros.
        if (y === room.depth - 1) this.drawAtTile(s.sideLeft, x, y, camera, -HALF_W, 0);
        if (x === room.width - 1) this.drawAtTile(s.sideRight, x, y, camera, -HALF_W, 0);
      }
    }
  }

  private drawWalls(room: Room, camera: Camera): void {
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

  private drawFurni(item: FurniItem, camera: Camera): void {
    const { sprite, offsetX, offsetY } = getFurniSprite(item.defId, item.rotation);
    const at = this.drawAtTile(sprite, item.x, item.y, camera, offsetX, offsetY);
    this.drawnFurni.push({ item, sprite, ...at });
  }

  /**
   * Dibuja muebles y avatares en el orden correcto de profundidad.
   * Las alfombras van antes, a ras de suelo: nunca tapan nada.
   */
  private drawScene(state: GameState, views: AvatarViews, camera: Camera, now: number): void {
    const flat: FurniItem[] = [];
    const drawables: Drawable[] = [];

    for (const item of Object.values(state.furniture)) {
      if (CATALOG[item.defId].walkable) {
        flat.push(item);
        continue;
      }
      const f = getFootprint(item);
      const box = { x0: f.x, y0: f.y, x1: f.x + f.width, y1: f.y + f.depth };
      drawables.push({ box, tie: 0, draw: () => this.drawFurni(item, camera) });
    }

    for (const avatar of Object.values(state.avatars)) {
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

    flat.sort((a, b) => a.x + a.y - (b.x + b.y)).forEach((item) => this.drawFurni(item, camera));

    const sorted = depthSort(
      drawables,
      (d) => d.box,
      (d) => d.box.x0 + d.box.x1 + d.box.y0 + d.box.y1 + d.tie,
    );
    for (const d of sorted) d.draw();
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
      const seat = getSeatAt(state, avatar.x, avatar.y);
      const seatHeight = (seat && MODELS[seat.defId].seatHeight) ?? 0;
      const sprite = frames[FRAME_SIT];
      this.drawAtTile(sprite, view.x, view.y, camera, -AVATAR_WIDTH / 2, HALF_H - seatHeight - HIP_ROW);

      // Si el asiento mira hacia el fondo (NW o NE), su respaldo está entre la
      // cámara y el avatar: lo repintamos encima para que tape su espalda.
      if (seat && seat.rotation >= 2) {
        const back = getFurniSprite(seat.defId, seat.rotation, 'backrest');
        this.drawAtTile(back.sprite, seat.x, seat.y, camera, back.offsetX, back.offsetY);
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
    this.drawAtTile(sprite, view.x, view.y, camera, -AVATAR_WIDTH / 2, HALF_H + 2 - sprite.height);
  }
}

/** Algo que se dibuja en la escena con su caja para ordenar por profundidad. */
interface Drawable {
  box: DepthBox;
  /** Se suma al desempate de profundidad. */
  tie: number;
  draw: () => void;
}
