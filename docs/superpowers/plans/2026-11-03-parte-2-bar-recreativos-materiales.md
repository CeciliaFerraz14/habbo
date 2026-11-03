# Parte 2 · Bar, recreativos, campo de algodón, tela y fichas · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir dos materiales (tela y fichas), que el taller pueda fabricar materiales además de muebles, y tres negocios nuevos: campo de algodón (produce tela), bar (servicio) y recreativos (servicio que gasta fichas).

**Architecture:** Todo el comportamiento vive en `/shared` y se configura en `economy.config.ts`. Los negocios de servicio y los productores ya son genéricos: los nuevos son configuración + puesto de trabajo + icono de neón + fachada. Lo único nuevo de lógica son las recetas de materiales del taller: un `CraftJob` pasa a ser de mueble o de material, compatible con los trabajos ya guardados en Supabase (`lots.jobs`, jsonb).

**Tech Stack:** TypeScript 7, Canvas 2D (sprites por código), `node:test` + `tsx` (`npm test`), Supabase (migración nueva).

**Spec:** `docs/superpowers/specs/2026-11-03-negocios-parcelas-design.md` (secciones "2. Bar y recreativos" y "3. Materiales nuevos"). Este plan junta las partes 2 y 3 del diseño porque los recreativos gastan fichas.

## Global Constraints

- Comentarios en español; identificadores en inglés; sin emoji.
- Todos los números de economía en `shared/src/economy.config.ts`, en segundos. Nada de `Math.random()` ni `Date.now()` en `/shared`.
- Todo cambio de estado por una acción del reducer o por el tick.
- Sprites por código. Los puestos de trabajo nuevos siguen el modelo de cajas de `client/src/sprites/structures/*` (los existentes usan hex locales; usar `PALETTE` de `client/src/sprites/palette.ts` donde haya un color equivalente).
- No editar migraciones `001`–`003`. No tocar la base de datos de producción: la migración nueva la aplica la usuaria. El servidor debe funcionar antes y después de aplicarla (un negocio nuevo solo se puede guardar después).
- Ni la tela ni las fichas se venden en el proveedor de la gasolinera.
- Sin código muerto. Commits: título en español, presente, sin prefijo, cuerpo con viñetas, en `master`. Entrada en `docs/journal.md` (arriba) por tarea.

## Valores (decisión del plan, ajustables en la config)

| Id | Nombre | Datos |
|---|---|---|
| material `fabric` | Tela | color de ficha `#e8e0d0` |
| material `tokens` | Fichas | color de ficha `#f2b134` |
| receta de material `tokens` | — | `{ materials: { sheet_metal: 1 }, seconds: 15, quantity: 5 }` |
| negocio `cotton_field` | Campo de algodón | producer, fachada `classic`, neón `#f6e7c8`, fianza 70, alquiler 22, producción `{ seconds: 20, output: { fabric: 2 }, storageCap: 30 }`, descripción "Cultiva algodón y lo hila en tela. La necesita la tienda de ropa." |
| negocio `bar` | Bar | service, fachada `saloon`, neón `#ffb347`, fianza 130, alquiler 32, servicio `{ name: 'Una ronda', consumes: { water: 1, fruit: 1 }, baseValue: 40 }`, descripción "Sirve rondas a los viajeros. Gasta agua y fruta." |
| negocio `arcade` | Recreativos | service, fachada `arcade`, neón `#4fffe0`, fianza 150, alquiler 40, servicio `{ name: 'Una partida', consumes: { tokens: 2 }, baseValue: 50 }`, descripción "Los viajeros echan una partida. Gasta fichas del taller." |
| fachada `saloon` | Saloon | "Madera oscura con puertas batientes.", wall `#a0703c`, trim `#5a3a24` |
| fachada `arcade` | Recreativos | "Negra con franjas de neón.", wall `#2a2a3a`, trim `#ff4fa3` |
| puesto `cotton_bed` | Algodonal | 2x2, en `{ x: 3, y: 2, rotation: 0 }` |
| puesto `bar_tap` | Barra con grifo | 1x2, en `{ x: 1, y: 1, rotation: 0 }` |
| puesto `token_machine` | Cambio de fichas | 1x2, en `{ x: 1, y: 1, rotation: 0 }` |

Orden en `BusinessType`/`BUSINESSES` (es el orden de la ventana de alquiler): `scrapyard, well, greenhouse, cotton_field, workshop, store, diner, bar, arcade, barber, greengrocer`.

## Review Focus

1. Mundo guardado con trabajos del taller antiguos (`{ defId, readyAt }` en `lots.jobs`): se siguen mostrando y recogiendo como muebles. Test `old furniture jobs still collect`.
2. Fabricar fichas sin chapa suficiente, o con la cola llena: no hace nada. Test `material recipe needs materials and queue room`.
3. Recoger una cola mixta (mueble + fichas): el mueble va al inventario y las fichas a los materiales del dueño, en la misma acción. Test `collect mixed queue`.
4. El proveedor no ofrece tela ni fichas y `BUY_MATERIAL` con ellas no hace nada. Test `supplier does not sell fabric or tokens`.
5. Abrir recreativos sin fichas: los viajeros no compran (ya lo garantiza `canServe`); tras reponer fichas, sí. Test `arcade serves only with tokens`.

---

### Task 1: Tela, fichas y recetas de materiales en el taller

**Files:**
- Modify: `shared/src/economy.config.ts` (`MaterialId` + `materials`; `supplier.prices` pasa a `satisfies Partial<Record<MaterialId, number>>` sin `fabric` ni `tokens`; nuevo tipo `MaterialRecipe` y `ECONOMY.materialRecipes`)
- Modify: `shared/src/economy.ts` (`CraftJob`, `startCraft`, `collectCrafted`; nuevo `SUPPLIER_MATERIAL_IDS` o equivalente exportado)
- Modify: `shared/src/actions.ts`, `shared/src/reducer.ts` (acción `CRAFT`)
- Modify: `client/src/ui/economyUi.ts` (`MATERIAL_COLORS`), `client/src/ui/supplierWindow.ts` (iterar solo materiales del proveedor), `client/src/ui/businessWindow.ts` (recetas de materiales en la lista del taller, nombre de los trabajos de material en la cola, botón "Recoger" genérico), y el `actions.craft` de `client/src/main.ts` / quien lo cablee
- Test: `shared/src/workshop.test.ts`

**Interfaces:**
- Produces:
  - `type MaterialId = 'sheet_metal' | 'old_wood' | 'tires' | 'water' | 'fruit' | 'fabric' | 'tokens'`
  - `interface MaterialRecipe extends Recipe { quantity: number }`; `ECONOMY.materialRecipes = { tokens: {...} } satisfies Partial<Record<MaterialId, MaterialRecipe>>`
  - `type CraftJob = { defId: DecorId; readyAt: number } | { material: MaterialId; readyAt: number }` (la forma de los trabajos de mueble no cambia: compatibilidad con lo guardado)
  - `type RecipeId = DecorId | MaterialId`; acción `{ type: 'CRAFT'; avatarId: string; lotId: string; recipe: RecipeId }`
  - `startCraft(state, avatarId, lotId, recipe: RecipeId): GameState`
  - `export const SUPPLIER_MATERIAL_IDS: MaterialId[]` (claves de `ECONOMY.supplier.prices`), en `economy.config.ts` junto a `MATERIAL_IDS`

- [ ] **Step 1: Tests que fallan** en `shared/src/workshop.test.ts`

Helper: `createInitialState()` + un jugador `'p1'` con avatar dentro de `lot1` (usar `JOIN` del reducer y fijar `sceneId: 'lot1'`, o construir el avatar como hagan otros tests), `lot1` alquilado como `workshop` a `p1` (`rentLot` o construcción directa del `Lot` + puesto), y materiales de `p1`.

```ts
test('material recipe crafts tokens into the owner materials', () => {
  // p1 con { sheet_metal: 1 } → CRAFT recipe 'tokens'
  // tras avanzar state.tick hasta readyAt y COLLECT_CRAFTED:
  assert.equal(next.materials.p1.sheet_metal ?? 0, 0);
  assert.equal(next.materials.p1.tokens, 5);
  assert.deepEqual(next.lots.lot1.jobs, []);
});

test('material recipe needs materials and queue room', () => {
  // sin chapa: CRAFT 'tokens' devuelve el mismo state
  // con cola llena (ECONOMY.workshop.queueSize trabajos): igual
});

test('collect mixed queue', () => {
  // cola con { defId: 'tire', readyAt } y { material: 'tokens', readyAt }, ambos listos
  // COLLECT_CRAFTED → inventario de p1 con un 'tire' y materials.p1.tokens === 5
});

test('old furniture jobs still collect', () => {
  // lots.lot1.jobs = [{ defId: 'tire', readyAt: 0 }] (forma guardada antigua)
  // COLLECT_CRAFTED → inventario con un 'tire'
});

test('supplier does not sell fabric or tokens', () => {
  assert.ok(!SUPPLIER_MATERIAL_IDS.includes('fabric'));
  assert.ok(!SUPPLIER_MATERIAL_IDS.includes('tokens'));
  // BUY_MATERIAL fabric con avatar en la calle y dinero → mismo state
});
```

- [ ] **Step 2: `npm test`** → FAIL (no existen `tokens`, `recipe`, `SUPPLIER_MATERIAL_IDS`).

- [ ] **Step 3: Implementar en `/shared`.** `startCraft` resuelve la receta en `ECONOMY.recipes` (si `recipe` es `DecorId`) o en `ECONOMY.materialRecipes`; el trabajo guarda `defId` o `material`. `collectCrafted` reparte los trabajos listos: muebles al inventario (como ahora) y materiales sumados con `addMaterials` a `state.materials[avatarId]` (`quantity` de la config). Ajustar los comentarios ("muebles" → "muebles o materiales") donde dejen de ser ciertos.

- [ ] **Step 4: `npm test`** → PASS (5 de `economy.test.ts` + 5 nuevos).

- [ ] **Step 5: Cliente.** Colores de las dos fichas (tabla de valores). El proveedor itera `SUPPLIER_MATERIAL_IDS`. En el taller, las recetas de materiales aparecen tras las de muebles con el texto `${nombre del material} x${quantity} · ${seconds} s` y el mismo botón "Fabricar"; la cola muestra el nombre del material para sus trabajos; el botón de recoger pasa a "Recoger (${done})". La llamada al despachar `CRAFT` usa `recipe`.

- [ ] **Step 6: `npm test`, `npm run typecheck`, `npm run build`** → todo limpio.

- [ ] **Step 7: Diario y commit** `Tela, fichas y recetas de materiales en el taller`.

---

### Task 2: Campo de algodón, bar y recreativos

**Files:**
- Modify: `shared/src/economy.config.ts` (`BusinessType`, `BUSINESSES` en el orden indicado, `FacadeId` + `FACADES` con `saloon` y `arcade`)
- Modify: `shared/src/catalog.ts` (`StructureId` + `CATALOG`: `cotton_bed`, `bar_tap`, `token_machine` como `structure(...)`)
- Modify: `shared/src/economy.ts` (`STATIONS`)
- Create: `supabase/migrations/004_bar_arcade_cotton.sql`; `client/src/sprites/structures/cottonBed.ts`, `barTap.ts`, `tokenMachine.ts`
- Modify: `client/src/sprites/furniture/index.ts`, `client/src/sprites/structures/shop.ts`
- Modify: `README.md` (si lista negocios o materiales) y `CLAUDE.md` (sección Datos: añadir `004_bar_arcade_cotton.sql`; el fichero está sin seguimiento en git: editarlo sin hacer `git add`)
- Test: `shared/src/businesses.test.ts`

**Interfaces:**
- Consumes: `MaterialId` con `fabric` y `tokens` (Task 1).
- Produces: `BusinessType` con `cotton_field | bar | arcade`; `FacadeId` con `saloon | arcade`; `StructureId` con `cotton_bed | bar_tap | token_machine`.

- [ ] **Step 1: Tests que fallan** en `shared/src/businesses.test.ts`

```ts
test('cotton field produces fabric', () => {
  // lot1 con business 'cotton_field' y dueño; avanzar ticks 20 s con tick()
  assert.equal(state.lots.lot1.storage.fabric, 2);
});

test('bar serves with water and fruit', () => {
  // lot1 'bar' con storage { water: 1, fruit: 1 }, price 40
  // serveCustomer(state, 'lot1') → storage vacío y el dueño cobra 40 menos comisión
});

test('arcade serves only with tokens', () => {
  // lot1 'arcade' con storage {} → canServe false
  // con storage { tokens: 2 } → serveCustomer deja tokens a 0 y paga al dueño
});

test('new businesses have a station and a facade', () => {
  for (const type of ['cotton_field', 'bar', 'arcade'] as const) {
    assert.ok(FACADES[ECONOMY.businesses[type].defaultFacade]);
  }
  // abrir cada uno (rentLot o openBusiness vía RENT_LOT) crea el mueble `station:lot1` con el defId de la tabla
});
```

- [ ] **Step 2: `npm test`** → FAIL.

- [ ] **Step 3: Implementar** los valores de la tabla.

- [ ] **Step 4: `npm test`** → PASS.

- [ ] **Step 5: Dibujo** (el `CATALOG` exige un modelo por `FurniId` en `client/src/sprites/furniture/index.ts`, así que va en esta misma tarea para que el typecheck del cliente no se rompa):
  - Create `client/src/sprites/structures/cottonBed.ts`, `barTap.ts`, `tokenMachine.ts` con la forma de `fruitPlanter.ts` (`FurniModel` de cajas; `PALETTE` donde haya equivalente) y registrarlos en `client/src/sprites/furniture/index.ts`. Algodonal: cajón de tierra 2x2 con matas blancas. Barra con grifo: mostrador de madera 1x2 con dos grifos y una jarra. Cambio de fichas: máquina 1x2 con ranura, ficha dorada y una pantallita emisiva.
  - `client/src/sprites/structures/shop.ts`: en `businessIcon`, icono de neón para `cotton_field` (copo de algodón), `bar` (jarra) y `arcade` (joystick), en la misma zona y tamaño que los existentes (`neon(64, …)`); en `templateFront`, fachadas `saloon` (puertas batientes) y `arcade` (franjas horizontales con `facade.trim`).

- [ ] **Step 6: Migración `004_bar_arcade_cotton.sql`** con la misma forma que `002`: `drop constraint if exists lots_business_check` y `add constraint` con la lista completa de negocios en el orden indicado. Cabecera con cómo probarla (`begin; … rollback;`) y que el servidor funciona sin ella salvo para guardar un local con un negocio nuevo.

- [ ] **Step 7: `npm test`, `npm run typecheck`, `npm run build`** → limpios.

- [ ] **Step 8: Diario y commit** `Campo de algodón, bar y recreativos`.

---

## Verificación final (la hace el Claude principal)

- `npm test`, `npm run typecheck`, `npm run build`.
- Navegador, `npm run dev:offline`: alquilar un local como bar, recreativos y campo de algodón; ver fachada, neón de noche (`N`) y puesto de trabajo; en el taller fabricar fichas, recogerlas, reponer los recreativos y ver que un viajero paga una partida; el proveedor no ofrece tela ni fichas.
