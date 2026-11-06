// =============================================================================
//  PERSISTENCIA EN SUPABASE
// =============================================================================
//
// El mundo vive en memoria (es rápido y la simulación lo necesita así), y cada
// pocos segundos guardamos en Supabase SOLO lo que ha cambiado desde el último
// guardado. Para saber qué ha cambiado usamos el mismo truco que para
// sincronizar con los clientes: como el estado es inmutable, si un objeto es
// el mismo (===) que en el último guardado, no ha cambiado.
//
// Al arrancar, el servidor reconstruye el mundo: crea el mundo inicial y le
// "pega encima" lo guardado (locales, muebles, perfiles, inventarios...).
//
// Lo que NO se guarda: NPC, coches, chat y lo que llevan en la mano los
// avatares (se regeneran solos).
// =============================================================================

import {
  addBuiltLot,
  addHome,
  buildingVariant,
  createInitialState,
  createTrailer,
  isGarmentItem,
  lotBuildingId,
  lotSceneName,
  nextHomeSlot,
  releaseNpcLots,
  solarOfLot,
  withStatue,
  type AvatarLook,
  type FurniItem,
  type GameState,
  type GasPlayerState,
  type PlayerProgress,
  type SavedPosition,
  type InventoryItem,
  type Lot,
  type Materials,
} from '@juego/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './auth';

/** Escenas cuyos muebles se guardan: caravanas y locales. */
const isPersistedScene = (sceneId: string) =>
  sceneId.startsWith('trailer:') || sceneId.startsWith('lot');

/** Los jugadores con cuenta tienen como id el uuid de Supabase. */
const isPlayerId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id);

/** Lo que sabemos de cada jugador aunque no esté conectado (para guardar su perfil). */
interface ProfileInfo {
  name: string;
  look: AvatarLook;
}

/** Fila de la tabla lots → objeto Lot del juego. */
function rowToLot(row: Record<string, any>): Lot {
  return {
    id: row.id,
    label: row.label,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    business: row.business,
    facade: row.facade,
    storage: row.storage ?? {},
    price: row.service_price ?? 0,
    jobs: row.jobs ?? [],
    nextProductionAt: Number(row.next_production_at),
    nextRentAt: Number(row.next_rent_at),
    ...(row.built_by ? { builtBy: row.built_by, readyAt: Number(row.ready_at ?? 0) } : {}),
    ...(row.level > 1 ? { level: Number(row.level) } : {}),
    ...(Number(row.upgrade_ready_at ?? 0) > 0 ? { upgradeReadyAt: Number(row.upgrade_ready_at) } : {}),
    ...(row.terms ? { terms: row.terms } : {}),
    ...(Number(row.next_upkeep_at ?? 0) > 0 ? { nextUpkeepAt: Number(row.next_upkeep_at) } : {}),
    ...(row.suspended ? { suspended: true } : {}),
  };
}

export function lotToRow(lot: Lot) {
  return {
    id: lot.id,
    label: lot.label,
    owner_id: lot.ownerId,
    owner_name: lot.ownerName,
    business: lot.business,
    facade: lot.facade,
    storage: lot.storage,
    service_price: lot.price,
    jobs: lot.jobs,
    next_production_at: lot.nextProductionAt,
    next_rent_at: lot.nextRentAt,
    built_by: lot.builtBy ?? null,
    ready_at: lot.readyAt ?? 0,
    level: lot.level ?? 1,
    upgrade_ready_at: lot.upgradeReadyAt ?? 0,
    terms: lot.terms ?? null,
    next_upkeep_at: lot.nextUpkeepAt ?? 0,
    suspended: lot.suspended ?? false,
  };
}

/**
 * Objeto del inventario → fila de inventory_items. Un mueble lleva def_id y
 * una prenda garment y color; lo demás va a null (todas las filas con las
 * mismas columnas, para insertarlas de una vez).
 */
function itemToRow(item: InventoryItem, ownerId: string) {
  const garment = isGarmentItem(item);
  return {
    id: item.id,
    owner_id: ownerId,
    def_id: garment ? null : item.defId,
    garment: garment ? item.garment : null,
    color: garment ? item.color : null,
  };
}

/** Fila de inventory_items → objeto del inventario. */
function rowToItem(row: Record<string, any>): InventoryItem {
  return row.garment ? { id: row.id, garment: row.garment, color: row.color } : { id: row.id, defId: row.def_id };
}

function furniToRow(f: FurniItem) {
  return {
    id: f.id,
    scene_id: f.sceneId,
    def_id: f.defId,
    x: f.x,
    y: f.y,
    rotation: f.rotation,
    variant: f.variant ?? null,
    price: f.price ?? null,
    // Solo los burros de la tienda de ropa: la prenda a la venta.
    garment: f.garment ?? null,
  };
}

/** Lanza un error legible si una consulta a Supabase falla. */
function check<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Supabase (${what}): ${result.error.message}`);
  return result.data;
}

/**
 * Filas por página al cargar. Por debajo del max_rows de Supabase (1000 por
 * defecto): si el servidor recortara una página, parecería la última.
 */
const PAGE_SIZE = 500;

/**
 * Lee una tabla entera por páginas, hasta una página incompleta. Sin esto,
 * Supabase corta en max_rows sin avisar, y el siguiente guardado reescribiría
 * el inventario de un jugador a partir de la lista cortada. Los extremos de
 * cada página van incluidos, como en .range(from, to).
 */
export async function fetchAllRows(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: Record<string, any>[] | null; error: { message: string } | null }>,
  what: string,
  pageSize = PAGE_SIZE,
): Promise<Record<string, any>[]> {
  const rows: Record<string, any>[] = [];
  for (;;) {
    const page = check(await fetchPage(rows.length, rows.length + pageSize - 1), what) ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

/**
 * Sin la migración 010, el primer cambio de inventario borra las filas del
 * jugador y luego no puede insertarlas, porque garment no existe: lo perdería
 * al reiniciar. Sin la 012, guardar un local falla (escribe terms,
 * next_upkeep_at y suspended) y un local en alquiler volvería a ser privado al
 * reiniciar. Por eso el servidor no arranca: mejor un despliegue fallido.
 */
async function requireMigrations(db: SupabaseClient): Promise<void> {
  for (const [table, columns, migration] of [
    ['inventory_items', 'garment,color', '010_businesses_and_clothing.sql'],
    ['furniture', 'garment', '010_businesses_and_clothing.sql'],
    ['lots', 'terms,next_upkeep_at,suspended', '012_lot_rental.sql'],
  ]) {
    const { error } = await db.from(table).select(columns).limit(1);
    if (error) {
      throw new Error(
        `El servidor no arranca: comprueba que está aplicada la migración ${migration.slice(0, 3)} (${migration}). ` +
          `Fallo al leer ${columns} de ${table}: ${error.message}`,
      );
    }
  }
}

/** Filas de las tablas con las que se reconstruye el mundo. */
export interface WorldRows {
  world: Record<string, any> | null;
  lots: Record<string, any>[];
  furniture: Record<string, any>[];
  profiles: Record<string, any>[];
  items: Record<string, any>[];
}

/**
 * Pega lo guardado encima del mundo inicial. Es el mundo tal como está en
 * Supabase: lo que haya que corregir al cargar (ver Persistence.load) se hace
 * después, para que el primer guardado lo vea como un cambio.
 */
export function worldFromRows(state: GameState, rows: WorldRows): GameState {
  const { world: worldRow, lots: lotRows, furniture: furniRows, profiles: profileRows, items: itemRows } = rows;

  // 1. Reloj y semilla: la simulación continúa donde se quedó. También los
  //    encargos de Hank y el récord de la máquina recreativa.
  if (worldRow) {
    state = {
      ...state,
      tick: Number(worldRow.tick),
      seed: Number(worldRow.seed),
      nextId: Math.max(state.nextId, Number(worldRow.next_id)),
      orders: worldRow.gas?.orders ?? [],
      pinballRecord: worldRow.gas?.pinballRecord ?? null,
      mayors: worldRow.gas?.mayors ?? [],
    };
  }

  // 2a. Parcelas: cada jugador tiene la suya en la calle (y, desde el segundo,
  //     un local nuevo). Se ponen ANTES de cargar los locales, porque crean los
  //     locales 7, 8... A quien aún no tenga (perfiles de antes de esto), se le
  //     da la siguiente, por orden de antigüedad.
  const bySlot = [...profileRows].sort(
    (a, b) => (a.home_slot ?? Infinity) - (b.home_slot ?? Infinity) || String(a.created_at).localeCompare(String(b.created_at)),
  );
  for (const p of bySlot) {
    state = addHome(state, p.id, p.home_slot ?? nextHomeSlot(state));
  }

  // 2b. Locales construidos en los solares del Ensanche: su edificio, su
  //     puerta y su interior (el resto del local viene con los demás, abajo).
  for (const row of lotRows) {
    const k = solarOfLot(row.id);
    if (k !== null && row.built_by) state = addBuiltLot(state, k, row.built_by, Number(row.ready_at ?? 0));
  }

  // 2. Locales. Si hay locales guardados, los muebles de los locales del
  //    mundo inicial se sustituyen por los guardados.
  const scenes = { ...state.scenes };
  const furniMap = { ...state.furniture };
  const lotMap = { ...state.lots };
  if (lotRows.length > 0) {
    for (const f of Object.values(furniMap)) {
      if (f.sceneId.startsWith('lot')) delete furniMap[f.id];
    }
    for (const row of lotRows) {
      const lot = rowToLot(row);
      lotMap[lot.id] = lot;
      // El edificio y el nombre del local se deducen del propio local.
      const building = furniMap[lotBuildingId(lot.id)];
      if (building) furniMap[building.id] = { ...building, variant: buildingVariant(lot, state.tick) };
      if (scenes[lot.id]) scenes[lot.id] = { ...scenes[lot.id], name: lotSceneName(lot) };
    }
  }

  // 3. Perfiles: dinero, materiales y la escena de su caravana (sin los
  //    muebles iniciales: sus muebles reales vienen de la tabla furniture).
  const money: Record<string, number> = { ...state.money };
  const materials: Record<string, Materials> = { ...state.materials };
  const subsidies: Record<string, number> = { ...state.subsidies };
  const gasPlayers: Record<string, GasPlayerState> = { ...state.gasPlayers };
  const lastPositions: Record<string, SavedPosition> = { ...state.lastPositions };
  const progress: Record<string, PlayerProgress> = { ...state.progress };
  const inventories: Record<string, InventoryItem[]> = { ...state.inventories };
  for (const p of profileRows) {
    money[p.id] = p.money;
    materials[p.id] = p.materials ?? {};
    subsidies[p.id] = Number(p.next_subsidy_at ?? 0);
    if (p.last_position?.sceneId) lastPositions[p.id] = p.last_position;
    // Sin "visto por última vez" (perfiles de antes de esto): cuenta desde ahora.
    if (p.progress?.xp !== undefined) progress[p.id] = { lastSeen: state.tick, ...p.progress, name: p.name };
    // Un turno a medias no sobrevive a un reinicio (el jugador no está dentro).
    if (p.gas_station?.scratchDay !== undefined) gasPlayers[p.id] = { ...p.gas_station, shiftEndsAt: 0 };
    inventories[p.id] = [];
    const trailer = createTrailer(p.id, p.name).scene;
    scenes[trailer.id] = trailer;
  }
  for (const row of itemRows) {
    inventories[row.owner_id]?.push(rowToItem(row));
  }

  // 4. Muebles de caravanas y locales.
  for (const row of furniRows) {
    furniMap[row.id] = {
      id: row.id,
      sceneId: row.scene_id,
      defId: row.def_id,
      x: row.x,
      y: row.y,
      rotation: row.rotation,
      ...(row.variant ? { variant: row.variant } : {}),
      ...(row.price ? { price: row.price } : {}),
      ...(row.garment ? { garment: row.garment } : {}),
    };
  }

  // La estatua de la calle no se guarda: se pone si hay algún alcalde.
  return withStatue({
    ...state,
    scenes,
    furniture: furniMap,
    lots: lotMap,
    money,
    materials,
    subsidies,
    gasPlayers,
    lastPositions,
    progress,
    inventories,
  });
}

/** Muebles que un guardado tiene que escribir y borrar para pasar de prev a next. */
export function furnitureChanges(prev: GameState, next: GameState): { upserts: FurniItem[]; deletes: string[] } {
  return {
    upserts: Object.values(next.furniture).filter((f) => isPersistedScene(f.sceneId) && f !== prev.furniture[f.id]),
    deletes: Object.keys(prev.furniture).filter(
      (id) =>
        isPersistedScene(prev.furniture[id].sceneId) &&
        (!next.furniture[id] || !isPersistedScene(next.furniture[id].sceneId)),
    ),
  };
}

/** Ids por filtro `in` al borrar inventario: con ids cortos la URL queda muy por debajo del límite. */
const INVENTORY_DELETE_CHUNK = 100;
/** Los ids de objeto son `i123` o uuid: nada que rompa la sintaxis del filtro `in` de PostgREST. */
const SAFE_ITEM_ID = /^[\w-]+$/;

export class Persistence {
  /** Estado en el último guardado correcto. */
  private saved: GameState;
  private readonly profiles = new Map<string, ProfileInfo>();
  /** Guardado en marcha (nunca rechaza: `write` registra sus errores). */
  private inFlight: Promise<void> | null = null;

  private constructor(
    state: GameState,
    private readonly db: SupabaseClient,
  ) {
    this.saved = state;
  }

  /** Perfil guardado de un jugador (para usar su nombre y aspecto al entrar). */
  profile(id: string): ProfileInfo | undefined {
    return this.profiles.get(id);
  }

  /**
   * Crea el mundo: el inicial, con lo guardado en Supabase encima.
   * Sin Supabase configurado, devuelve el mundo inicial y no guarda nada.
   */
  static async load(db: SupabaseClient | null = supabase): Promise<{ state: GameState; persistence: Persistence | null }> {
    let state = createInitialState();
    if (!db) return { state, persistence: null };

    await requireMigrations(db);

    const readAll = (table: string) =>
      fetchAllRows((from, to) => db.from(table).select('*').order('id').range(from, to), table);
    const [world, lotRows, furniRows, profileRows, itemRows] = await Promise.all([
      db.from('world').select('*').maybeSingle(),
      readAll('lots'),
      readAll('furniture'),
      readAll('profiles'),
      readAll('inventory_items'),
    ]);
    const loaded = worldFromRows(state, {
      world: check(world, 'world'),
      lots: lotRows,
      furniture: furniRows,
      profiles: profileRows,
      items: itemRows,
    });
    const persistence = new Persistence(loaded, db);
    for (const p of profileRows) persistence.profiles.set(p.id, { name: p.name, look: p.look });
    // Mundos guardados de antes de quitar las tiendas NPC: se liberan después de
    // fijar `saved`, así el primer guardado escribe los locales ya reseteados y
    // borra de Supabase los muebles que desaparecen.
    state = releaseNpcLots(loaded);
    console.log(
      `Mundo cargado: ${profileRows.length} jugadores, ${lotRows.length} locales, ${furniRows.length} muebles`,
    );
    return { state, persistence };
  }

  /** Recuerda nombre y aspecto de un jugador que acaba de entrar. */
  register(id: string, info: ProfileInfo): void {
    this.profiles.set(id, info);
  }

  /**
   * Guarda lo que ha cambiado desde el último guardado. Si un guardado está
   * en marcha, no empieza otro (el siguiente recogerá todos los cambios).
   */
  save(state: GameState): Promise<void> {
    if (this.inFlight) return Promise.resolve();
    this.inFlight = this.write(state).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  /**
   * Para apagar el servidor: espera al guardado en marcha (si lo hay) y hace
   * uno último con el estado más reciente. Un guardado normal que llegue
   * mientras tanto se salta, así que no hay dos a la vez.
   */
  async flush(state: GameState): Promise<void> {
    while (this.inFlight) await this.inFlight;
    await this.save(state);
  }

  private async write(state: GameState): Promise<void> {
    const { db } = this;
    const prev = this.saved;
    try {
      // Perfiles: jugadores cuyo avatar, dinero, materiales, subvención o datos
      // de la gasolinera han cambiado.
      const changedPlayers = new Set<string>();
      for (const key of [
        'avatars',
        'money',
        'materials',
        'subsidies',
        'gasPlayers',
        'lastPositions',
        'progress',
        'homes',
        'inventories',
      ] as const) {
        for (const id in state[key]) {
          if (isPlayerId(id) && state[key][id] !== prev[key][id]) changedPlayers.add(id);
        }
      }
      const profileRows = [...changedPlayers].flatMap((id) => {
        const avatar = state.avatars[id];
        const known = this.profiles.get(id);
        const info = avatar ? { name: avatar.name, look: avatar.look } : known;
        if (!info) return [];
        this.profiles.set(id, info);
        return [{
          id,
          name: info.name,
          look: info.look,
          money: state.money[id] ?? 0,
          materials: state.materials[id] ?? {},
          next_subsidy_at: state.subsidies[id] ?? 0,
          gas_station: state.gasPlayers[id] ?? {},
          progress: state.progress[id] ?? {},
          home_slot: state.homes[id] ?? null,
          // Dónde está (si está conectado) o dónde se desconectó.
          last_position: avatar
            ? { sceneId: avatar.sceneId, x: avatar.x, y: avatar.y, direction: avatar.direction }
            : (state.lastPositions[id] ?? null),
          updated_at: new Date().toISOString(),
        }];
      });
      // Los perfiles van primero: el inventario tiene una clave ajena hacia ellos.
      if (profileRows.length) check(await db.from('profiles').upsert(profileRows), 'profiles');

      // Inventarios que han cambiado. Primero se escribe lo nuevo (upsert por
      // id, que también cambia de dueño un objeto traspasado) y solo después se
      // borra lo que sobra, así una caída entre pasos deja a lo sumo un objeto
      // de más y el siguiente guardado lo corrige. Nunca deja a nadie sin nada.
      const changedInventories = [...changedPlayers].filter((id) => state.inventories[id] !== prev.inventories[id]);
      for (const id of changedInventories) {
        const rows = (state.inventories[id] ?? []).map((i) => itemToRow(i, id));
        if (rows.length) check(await db.from('inventory_items').upsert(rows), 'inventory');
      }
      for (const id of changedInventories) {
        const kept = new Set((state.inventories[id] ?? []).map((i) => i.id));
        if (!kept.size) {
          check(await db.from('inventory_items').delete().eq('owner_id', id), 'inventory');
          continue;
        }
        // Se borra por los ids del último guardado que ya no están (no con un
        // `not in` de cientos de ids, que podría pasar el límite de la URL) y
        // en trozos pequeños por la misma razón.
        const stale = (prev.inventories[id] ?? []).map((i) => i.id).filter((itemId) => !kept.has(itemId));
        for (let i = 0; i < stale.length; i += INVENTORY_DELETE_CHUNK) {
          const chunk = stale.slice(i, i + INVENTORY_DELETE_CHUNK);
          if (!chunk.every((itemId) => SAFE_ITEM_ID.test(itemId))) throw new Error(`Supabase (inventory): id no válido para el filtro`);
          check(await db.from('inventory_items').delete().eq('owner_id', id).in('id', chunk), 'inventory');
        }
      }

      // Muebles de caravanas y locales: añadidos o cambiados, y borrados.
      if (state.furniture !== prev.furniture) {
        const { upserts, deletes } = furnitureChanges(prev, state);
        if (upserts.length) check(await db.from('furniture').upsert(upserts.map(furniToRow)), 'furniture');
        if (deletes.length) check(await db.from('furniture').delete().in('id', deletes), 'furniture');
      }

      // Locales que han cambiado.
      const lots = Object.values(state.lots).filter((l) => l !== prev.lots[l.id]);
      if (lots.length) check(await db.from('lots').upsert(lots.map(lotToRow)), 'lots');

      // Reloj de la simulación.
      check(
        await db.from('world').upsert({
          id: 1,
          tick: state.tick,
          seed: state.seed,
          next_id: state.nextId,
          gas: { orders: state.orders, pinballRecord: state.pinballRecord, mayors: state.mayors },
          saved_at: new Date().toISOString(),
        }),
        'world',
      );
      this.saved = state;
    } catch (error) {
      // Si falla, no movemos `saved`: el próximo guardado reintentará todo.
      console.error('Error al guardar:', (error as Error).message);
    }
  }
}
