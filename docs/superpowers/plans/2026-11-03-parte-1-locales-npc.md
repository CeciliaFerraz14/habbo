# Parte 1 · Locales de Elmer y Rosa en alquiler · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quitar las tiendas NPC de Rosa (`lot4`) y Elmer (`lot6`) para que los 6 locales empiecen en alquiler, sin romper los mundos ya guardados en Supabase.

**Architecture:** Se borra todo el código de tiendas NPC de `/shared`. Para los mundos guardados, una función pura `releaseNpcLots` (en `shared/src/economy.ts`, reutiliza `closeLot`) se aplica al cargar en el servidor, de modo que funciona antes y después de aplicar la migración `003`. La migración SQL hace la misma limpieza en la base de datos y borra la columna `next_restock_at`.

**Tech Stack:** TypeScript 7, npm workspaces, Supabase (Postgres), `node:test` ejecutado con `tsx` (ya instalado).

**Spec:** `docs/superpowers/specs/2026-11-03-negocios-parcelas-design.md` (sección "1. Liberar los locales de Elmer y Rosa").

## Global Constraints

- Comentarios en español; código, nombres e identificadores en inglés, sin emoji.
- Todo cambio de estado por el reducer o el tick; lógica determinista (sin `Math.random()` ni `Date.now()`).
- Números de economía solo en `shared/src/economy.config.ts`.
- No editar `supabase/migrations/001_init.sql` ni `002_more_businesses.sql`. No tocar la base de datos de producción: la migración la aplica la usuaria.
- Sin código muerto: lo que deja de usarse se borra en el mismo cambio.
- El servidor debe arrancar y guardar bien antes y después de aplicar la migración `003`.
- Commits: título en español, en presente, sin prefijo; cuerpo con viñetas; trabajo directo en `master`.
- Al terminar cada tarea: entrada en `docs/journal.md` (lo más reciente arriba).

## Review Focus

1. Mundo guardado con `lot4`/`lot6` a nombre de `npc-rosa`/`npc-elmer` y productos a la venta, servidor arrancado SIN la migración: los locales salen en alquiler, sin productos, con tablones, y el siguiente guardado no falla aunque la columna `next_restock_at` siga existiendo (tiene `default 0`). Cubierto por el test de `releaseNpcLots` y la prueba manual de la Tarea 2.
2. El mismo mundo DESPUÉS de aplicar `003`: el servidor no lee ni escribe `next_restock_at`. Cubierto por la Tarea 1 (se borra del mapeo) y por la revisión del SQL.
3. Un local de un jugador en `lot4` o `lot6` (si alguien lo alquiló después): no se toca. Test `leaves player lots untouched`.
4. Mundo nuevo sin Supabase (`npm run dev:offline`): ningún local tiene dueño y no hay productos a la venta. Test de `createInitialState`.
5. Ventas y servicios siguen pagando y avisando al dueño jugador tras quitar las ramas `isNpcId` de `payOwner`. Revisión del diff (comportamiento para jugadores idéntico).

---

### Task 1: Quitar las tiendas NPC del mundo y de la economía

**Files:**
- Modify: `package.json` (script `test`)
- Create: `shared/src/economy.test.ts`
- Modify: `shared/src/economy.config.ts` (borrar `npcStores` y `npcRestock`)
- Modify: `shared/src/economy.ts` (borrar `addRandomNpcProduct`, `setupNpcStores`, `withRestockTimer`, `restockNpcStores`, el campo `Lot.nextRestockAt`, su valor en `createLot`, la llamada en `economyTick`; quitar las ramas `isNpcId` de `lotSceneName`, `payOwner` y `chargeRent`; quitar imports que queden sin uso: `DECOR_IDS`, `createRandom`, `placeOnDisplay` solo si queda sin uso)
- Modify: `shared/src/world.ts` (quitar `setupNpcStores` del import y de `createInitialState`; actualizar el comentario)
- Modify: `server/src/persistence.ts` (quitar `nextRestockAt` de `rowToLot` y `next_restock_at` de `lotToRow`; actualizar el comentario del paso 2 de `load`, que habla del género de las tiendas NPC)
- Modify: `README.md` (líneas que citan a Rosa y Elmer, `npcStores`, `npcRestock` y "tiendas de NPC")

**Interfaces:**
- Produces: `Lot` sin `nextRestockAt`. `isNpcId(id)` sigue exportada (la usa la Tarea 2). Script `npm test`.

- [ ] **Step 1: Añadir el script de tests**

En el `package.json` raíz: `"test": "node --import tsx --test \"shared/src/**/*.test.ts\""`. Es `node:test` nativo con el `tsx` que ya está instalado: sin dependencias nuevas.

- [ ] **Step 2: Escribir los tests que fallan** en `shared/src/economy.test.ts`

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, getListings, LOT_IDS, secondsToTicks, tick } from './index';

test('initial world has every lot for rent and nothing on sale', () => {
  const state = createInitialState();
  for (const id of LOT_IDS) {
    assert.equal(state.lots[id].ownerId, null);
    assert.equal(getListings(state, id).length, 0);
  }
  assert.deepEqual(Object.keys(state.money).filter((id) => id.startsWith('npc-')), []);
});

test('no lot restocks itself over time', () => {
  let state = createInitialState();
  const until = secondsToTicks(120);
  while (state.tick < until) state = tick(state);
  for (const id of LOT_IDS) assert.equal(getListings(state, id).length, 0);
});
```

- [ ] **Step 3: Ejecutar y ver que falla**

Run: `npm test`
Expected: FAIL en `initial world has every lot for rent...` (`lot4` tiene dueño `npc-rosa`).

- [ ] **Step 4: Borrar el código de tiendas NPC** en los ficheros listados arriba.

En `chargeRent`, la condición queda `if (!lot.ownerId || !lot.business || next.tick < lot.nextRentAt) continue;` y se borra la línea "(Los NPC no pagan alquiler...)" del comentario. En `lotSceneName` el título es siempre `config.name` (y el comentario deja de mencionar a los NPC). En `payOwner` siempre se añade el aviso.

- [ ] **Step 5: Ejecutar tests y comprobaciones**

Run: `npm test` → Expected: 2 tests PASS.
Run: `npm run typecheck` → Expected: sin errores.
Run: `grep -rn "npcStores\|npcRestock\|nextRestockAt\|next_restock_at\|setupNpcStores\|Rosa\|Elmer" shared/src server/src client/src README.md` → Expected: sin resultados.

- [ ] **Step 6: Diario y commit**

Entrada en `docs/journal.md`. Commit: `Locales de Elmer y Rosa en alquiler desde el principio`.

---

### Task 2: Liberar los locales NPC de los mundos guardados

**Files:**
- Modify: `shared/src/economy.ts` (nueva `releaseNpcLots`, junto a `closeLot`)
- Modify: `shared/src/economy.test.ts`
- Modify: `server/src/persistence.ts` (`Persistence.load`)
- Create: `supabase/migrations/003_free_npc_lots.sql`
- Modify: `CLAUDE.md` (sección Datos: añadir `003_free_npc_lots.sql` a la lista de migraciones)

**Interfaces:**
- Consumes: `closeLot` (privada en `economy.ts`), `isNpcId`, `createLot`.
- Produces: `export function releaseNpcLots(state: GameState): GameState`.

- [ ] **Step 1: Escribir los tests que fallan** (añadir a `shared/src/economy.test.ts`)

Helper del test: parte de `createInitialState()` y pone `lot4` a nombre de `npc-rosa` (`business: 'store'`, `facade: 'boutique'`, `ownerName: 'Rosa'`), el edificio `lot4-building` con `variant: 'open-store'` (cualquier valor distinto de `'closed'`), un mueble a la venta `{ id: 'i500', sceneId: 'lot4', defId: 'tire', x: 2, y: 2, rotation: 0, price: 26 }`, `money['npc-rosa'] = 0`, y el nombre de la escena `lot4` a `'Tienda de decoración · Local 4'`.

```ts
test('releaseNpcLots puts NPC lots back for rent and drops their goods', () => {
  const next = releaseNpcLots(withRosaStore());
  assert.deepEqual(next.lots.lot4, createLot('lot4', 'Local 4'));
  assert.equal(next.furniture.i500, undefined);
  assert.equal(next.furniture['lot4-building'].variant, 'closed');
  assert.equal(next.scenes.lot4.name, 'Local 4');
  assert.equal(next.money['npc-rosa'], undefined);
  assert.equal(next.inventories['npc-rosa'], undefined);
});

test('releaseNpcLots leaves player lots untouched', () => {
  const state = withRosaStore();
  const playerLot = { ...state.lots.lot6, ownerId: 'player', ownerName: 'Ana', business: 'well' as const };
  const before = { ...state, lots: { ...state.lots, lot6: playerLot } };
  const next = releaseNpcLots(before);
  assert.equal(next.lots.lot6, playerLot);
});

test('releaseNpcLots returns the same state when no NPC owns a lot', () => {
  const state = createInitialState();
  assert.equal(releaseNpcLots(state), state);
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npm test` → Expected: FAIL, `releaseNpcLots` no existe.

- [ ] **Step 3: Implementar `releaseNpcLots(state: GameState): GameState`** en `shared/src/economy.ts`

Para cada local con `isNpcId(lot.ownerId)`: `closeLot(next, lot.id)` y después quitar `inventories[ownerId]` (donde `closeLot` ha devuelto los productos) y `money[ownerId]`. Si ningún local es de un NPC, devuelve el mismo objeto `state`. Comentario en español: existe para mundos guardados de antes de quitar las tiendas NPC.

- [ ] **Step 4: Ejecutar los tests**

Run: `npm test` → Expected: 5 tests PASS.

- [ ] **Step 5: Usarla al cargar el mundo** en `Persistence.load`

Justo después de `persistence.saved = state;`: `state = releaseNpcLots(state);`. Así `saved` refleja lo que hay en Supabase y el primer guardado escribe los locales reseteados y borra los muebles de esos locales (el diff de `save` ya borra los muebles que desaparecen). Comentario en español que lo explique.

- [ ] **Step 6: Escribir `supabase/migrations/003_free_npc_lots.sql`**

Cabecera como la de `002`. Contenido:
1. `delete from public.furniture where scene_id in (select id from public.lots where owner_id like 'npc-%') and id not like '%-building';`
2. `update public.lots set owner_id = null, owner_name = null, business = null, facade = null, storage = '{}'::jsonb, jobs = '[]'::jsonb, service_price = 0, next_production_at = 0, next_rent_at = 0 where owner_id like 'npc-%';`
3. `alter table public.lots drop column if exists next_restock_at;`

Comentario al principio con cómo probarla en el SQL Editor de Supabase: `begin;` + el contenido + `select` de comprobación de `lots` y `furniture` + `rollback;`, y después aplicarla de verdad.

- [ ] **Step 7: Comprobaciones**

Run: `npm test` → Expected: 5 PASS.
Run: `npm run typecheck` y `npm run build` → Expected: sin errores.

- [ ] **Step 8: Diario, CLAUDE.md y commit**

Entrada en `docs/journal.md` (incluye que la migración `003` está pendiente de aplicar por la usuaria). Commit: `Libera los locales NPC de los mundos guardados`.

---

## Verificación final (la hace el Claude principal)

- `npm test`, `npm run typecheck`, `npm run build`.
- Navegador, `npm run dev:offline`: los 6 locales con tablones y se pueden alquilar, incluidos el 4 y el 6.
- `npm run dev` con Supabase (si `server/.env` está configurado): el log de arranque carga el mundo sin errores y los locales 4 y 6 aparecen en alquiler.
