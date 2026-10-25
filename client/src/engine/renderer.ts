// El renderer solo LEE datos y dibuja. Nunca modifica el estado del juego.

import { isInsideRoom, type GameState, type Room } from '@juego/shared';
import type { AvatarViews } from '../game/avatarViews';
import {
  AVATAR_HEIGHT,
  AVATAR_WIDTH,
  FRAME_STAND,
  getAvatarFrames,
  SHADOW,
  WALK_CYCLE,
} from '../sprites/avatar';
import type { Sprite } from '../sprites/canvas';
import type { RoomSprites } from '../sprites/room';
import { WALL_HEIGHT } from '../sprites/room';
import type { Camera } from './camera';
import { TILE_HEIGHT, TILE_WIDTH, tileToScreen, type Point } from './iso';

const BACKGROUND = '#1b1b2f';
const HALF_W = TILE_WIDTH / 2;
const HALF_H = TILE_HEIGHT / 2;
/** Milisegundos que dura cada fotograma de la animación de caminar. */
const WALK_FRAME_MS = 130;

export interface RenderInput {
  state: GameState;
  views: AvatarViews;
  camera: Camera;
  /** Baldosa bajo el ratón, o null si el ratón está fuera de la sala. */
  hoverTile: Point | null;
  /** Tiempo actual en ms, para las animaciones. */
  now: number;
}

export class Renderer {
  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly sprites: RoomSprites,
  ) {}

  render({ state, views, camera, hoverTile, now }: RenderInput): void {
    const { ctx } = this;
    const { room } = state;
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    this.drawFloor(room, camera);
    this.drawWalls(room, camera);

    if (hoverTile && isInsideRoom(room, hoverTile.x, hoverTile.y)) {
      this.drawAtTile(this.sprites.hover, hoverTile.x, hoverTile.y, camera, -HALF_W, 0);
    }

    this.drawAvatars(state, views, camera, now);
  }

  /**
   * Dibuja un sprite tomando como referencia la esquina superior de la
   * baldosa (x, y), desplazado (offsetX, offsetY) píxeles.
   * Redondeamos para que el sprite caiga siempre en píxeles enteros.
   */
  private drawAtTile(
    sprite: Sprite,
    x: number,
    y: number,
    camera: Camera,
    offsetX: number,
    offsetY: number,
  ): void {
    const p = tileToScreen(x, y);
    this.ctx.drawImage(
      sprite.canvas,
      Math.round(camera.originX + p.x + offsetX),
      Math.round(camera.originY + p.y + offsetY),
    );
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

  private drawAvatars(state: GameState, views: AvatarViews, camera: Camera, now: number): void {
    // Orden provisional: de atrás (x + y pequeño) hacia delante. En el paso 3
    // lo sustituiremos por una ordenación de profundidad que incluya muebles.
    const avatars = Object.values(state.avatars)
      .map((avatar) => ({ avatar, view: views.get(avatar.id) }))
      .filter((a) => a.view !== undefined)
      .sort((a, b) => a.view!.x + a.view!.y - (b.view!.x + b.view!.y));

    for (const { avatar, view } of avatars) {
      // Los pies del avatar van en el CENTRO de la baldosa, que está HALF_H
      // píxeles por debajo de su esquina superior.
      const frames = getAvatarFrames(avatar.look)[avatar.direction];
      const frameIndex = view!.walking
        ? WALK_CYCLE[Math.floor(now / WALK_FRAME_MS) % WALK_CYCLE.length]
        : FRAME_STAND;

      this.drawAtTile(SHADOW, view!.x, view!.y, camera, -SHADOW.width / 2, HALF_H - 2);
      this.drawAtTile(
        frames[frameIndex],
        view!.x,
        view!.y,
        camera,
        -AVATAR_WIDTH / 2,
        HALF_H + 2 - AVATAR_HEIGHT,
      );
    }
  }
}
