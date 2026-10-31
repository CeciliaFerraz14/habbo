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
  buildingVariant,
  createInitialState,
  createTrailer,
  lotSceneName,
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
    nextRestockAt: Number(row.next_restock_at),
    nextRentAt: Number(row.next_rent_at),
  };
}

function lotToRow(lot: Lot) {
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
    next_restock_at: lot.nextRestockAt,
    next_rent_at: lot.nextRentAt,
  };
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
  };
}

/** Lanza un error legible si una consulta a Supabase falla. */
function check<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Supabase (${what}): ${result.error.message}`);
  return result.data;
}

export class Persistence {
  /** Estado en el último guardado correcto. */
  private saved: GameState;
  private readonly profiles = new Map<string, ProfileInfo>();
  private saving = false;

  private constructor(state: GameState) {
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
  static async load(): Promise<{ state: GameState; persistence: Persistence | null }> {
    let state = createInitialState();
    if (!supabase) return { state, persistence: null };

    const [world, lots, furniture, profiles, items] = await Promise.all([
      supabase.from('world').select('*').maybeSingle(),
      supabase.from('lots').select('*'),
      supabase.from('furniture').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('inventory_items').select('*'),
    ]);
    const worldRow = check(world, 'world');
    const lotRows = check(lots, 'lots') ?? [];
    const furniRows = check(furniture, 'furniture') ?? [];
    const profileRows = check(profiles, 'profiles') ?? [];
    const itemRows = check(items, 'inventory_items') ?? [];

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
      };
    }

    // 2. Locales. Si hay locales guardados, los muebles de los locales del
    //    mundo inicial (género generado de las tiendas NPC) se sustituyen por
    //    los guardados.
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
        const building = furniMap[`${lot.id}-building`];
        if (building) furniMap[building.id] = { ...building, variant: buildingVariant(lot) };
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
    const persistence = new Persistence(state);
    for (const p of profileRows) {
      persistence.profiles.set(p.id, { name: p.name, look: p.look });
      money[p.id] = p.money;
      materials[p.id] = p.materials ?? {};
      subsidies[p.id] = Number(p.next_subsidy_at ?? 0);
      if (p.last_position?.sceneId) lastPositions[p.id] = p.last_position;
      if (p.progress?.xp !== undefined) progress[p.id] = { ...p.progress, name: p.name };
      // Un turno a medias no sobrevive a un reinicio (el jugador no está dentro).
      if (p.gas_station?.scratchDay !== undefined) gasPlayers[p.id] = { ...p.gas_station, shiftEndsAt: 0 };
      inventories[p.id] = [];
      const trailer = createTrailer(p.id, p.name).scene;
      scenes[trailer.id] = trailer;
    }
    for (const row of itemRows) {
      inventories[row.owner_id]?.push({ id: row.id, defId: row.def_id });
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
      };
    }

    state = {
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
    };
    persistence.saved = state;
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
  async save(state: GameState): Promise<void> {
    if (this.saving || !supabase) return;
    this.saving = true;
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
          // Dónde está (si está conectado) o dónde se desconectó.
          last_position: avatar
            ? { sceneId: avatar.sceneId, x: avatar.x, y: avatar.y, direction: avatar.direction }
            : (state.lastPositions[id] ?? null),
          updated_at: new Date().toISOString(),
        }];
      });
      // Los perfiles van primero: el inventario tiene una clave ajena hacia ellos.
      if (profileRows.length) check(await supabase.from('profiles').upsert(profileRows), 'profiles');

      // Inventarios: los que han cambiado se reescriben enteros.
      for (const id of changedPlayers) {
        if (state.inventories[id] === prev.inventories[id]) continue;
        check(await supabase.from('inventory_items').delete().eq('owner_id', id), 'inventory');
        const rows = (state.inventories[id] ?? []).map((i) => ({ id: i.id, owner_id: id, def_id: i.defId }));
        if (rows.length) check(await supabase.from('inventory_items').insert(rows), 'inventory');
      }

      // Muebles de caravanas y locales: añadidos o cambiados, y borrados.
      if (state.furniture !== prev.furniture) {
        const upserts = Object.values(state.furniture).filter(
          (f) => isPersistedScene(f.sceneId) && f !== prev.furniture[f.id],
        );
        const deletes = Object.keys(prev.furniture).filter(
          (id) =>
            isPersistedScene(prev.furniture[id].sceneId) &&
            (!state.furniture[id] || !isPersistedScene(state.furniture[id].sceneId)),
        );
        if (upserts.length) check(await supabase.from('furniture').upsert(upserts.map(furniToRow)), 'furniture');
        if (deletes.length) check(await supabase.from('furniture').delete().in('id', deletes), 'furniture');
      }

      // Locales que han cambiado.
      const lots = Object.values(state.lots).filter((l) => l !== prev.lots[l.id]);
      if (lots.length) check(await supabase.from('lots').upsert(lots.map(lotToRow)), 'lots');

      // Reloj de la simulación.
      check(
        await supabase.from('world').upsert({
          id: 1,
          tick: state.tick,
          seed: state.seed,
          next_id: state.nextId,
          gas: { orders: state.orders, pinballRecord: state.pinballRecord },
          saved_at: new Date().toISOString(),
        }),
        'world',
      );
      this.saved = state;
    } catch (error) {
      // Si falla, no movemos `saved`: el próximo guardado reintentará todo.
      console.error('Error al guardar:', (error as Error).message);
    } finally {
      this.saving = false;
    }
  }
}
