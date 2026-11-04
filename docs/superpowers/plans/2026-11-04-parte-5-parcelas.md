# Parte 5 · Solares que construyen los jugadores · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seis solares al otro lado de la carretera donde un jugador construye un local y lo alquila a otros como casero: fija fianza y alquiler, cobra de sus inquilinos (menos una comisión) y paga un mantenimiento diario.

**Architecture:** Un solar construido es un `Lot` más (ids `lot7`…`lot12`, etiqueta "Solar N") con campos de casero; todo lo que ya existe para locales (negocios, interiores, puertas, viajeros, persistencia) se reutiliza. Un solar sin construir no está en el estado: es una posición fija (`PLOT_SITES`) con un cartel de "Se vende". Construir crea el local, su interior, su edificio y su puerta con una única función compartida (`restorePlot`), que también usa el servidor al cargar el mundo. La calle crece hacia el desierto para dejar sitio: acera junto a la carretera, fila de solares con la fachada hacia la cámara y acera trasera con las puertas.

**Tech Stack:** TypeScript 7, Canvas 2D, `node:test` + `tsx`, Supabase (migración nueva).

**Spec:** `docs/superpowers/specs/2026-11-03-negocios-parcelas-design.md` (sección "6. Parcelas"). Cambio respecto a la spec decidido por la usuaria: los solares miran a la cámara (fachada y puerta hacia el desierto, con acera trasera), no a la carretera, porque la cámara mira desde el desierto.

## Global Constraints

- Comentarios en español; identificadores en inglés; sin emoji.
- Valores de economía solo en `shared/src/economy.config.ts`. Lógica determinista; todo cambio de estado por acciones del reducer o el tick. Claves y números que manda el cliente, validados (guardas `isOwnKey`, enteros dentro de los límites de la config).
- Sprites por código con `PALETTE`. UI con `PixelWindow` y las clases CSS existentes; pedir permiso antes de un componente de UI nuevo de verdad (una ventana nueva con `PixelWindow` siguiendo `rentWindow.ts` no lo es).
- Migraciones nuevas solamente; la `006` solo añade columnas nulas o con valor por defecto, así que es segura con el servidor antiguo: se aplica ANTES de desplegar.
- Sin código muerto ni lógica duplicada. Commits en `master`: título en español, presente, sin prefijo, cuerpo con viñetas. Entrada en `docs/journal.md` (arriba) por tarea. `CLAUDE.md` sin seguimiento: si se edita, no se hace `git add`.

## Valores (decisión del plan, ajustables en la config)

`ECONOMY.plots`:

| Campo | Valor |
|---|---|
| `buildCost` | `{ money: 600, materials: { sheet_metal: 10, old_wood: 10, tires: 4 } }` |
| `rent` (límites del alquiler diario que fija el casero) | `{ min: 10, max: 120 }` |
| `deposit` (límites de la fianza) | `{ min: 0, max: 400 }` |
| términos iniciales al construir | alquiler 40, fianza 100 |
| `upkeep` (mantenimiento diario por solar construido) | 12 |
| `commissionRate` (parte de cada fianza y alquiler que se queda el ayuntamiento) | 0.1 |

El periodo del alquiler y del mantenimiento es `ECONOMY.rent.periodSeconds` (un día).

**Geometría de la calle** (`shared/src/world.ts`): `STREET_DEPTH` pasa de 14 a 19.
- y 0-3 locales, y 4-6 acera, y 7-9 carretera (sin cambios).
- y 10 acera sur, junto a la carretera.
- y 11-14 solares: `PLOT_SITES` en las mismas x que los locales (`LOT_XS`), 4x4, con ids `lot7`…`lot12` y etiquetas "Solar 1"…"Solar 6". Un solar sin construir es arena con un cartel `plot_sign` (estructura 1x1) en `{ x: x + 3, y: 14 }`.
- y 15 acera trasera: la puerta de un solar construido está en `{ x: x + 2, y: 15 }` con `spawn` en `{ x: x + 2, y: 16 }`.
- y 16-18 desierto. Los cactus y el cartel de bienvenida que hoy están en y 10-13 se mueven a y 16-18 (sin pisar puertas ni carteles). Farolas nuevas en la acera sur, alineadas con las de la norte (`x` 6, 16, 26, 36; `y` 10).
- El edificio de un solar construido es un `shop` con `rotation: 1` (fachada hacia +y, hacia la cámara), igual que los locales.

## Review Focus

1. Un inquilino que no paga pierde el local, pero el solar sigue siendo del casero con sus términos. Test `losing a plot keeps the landlord`.
2. Mundos guardados: los locales 1-6 y sus filas siguen cargando; los solares construidos vuelven con edificio, interior y puerta tras reiniciar el servidor. Test de `restorePlot` y prueba manual con persistencia si hay Supabase.
3. Construir sin dinero o materiales suficientes, en un solar ya construido o en un id que no es de solar: no hace nada. Tests.
4. El casero no puede alquilar su propio solar, ni cambiar los términos con inquilino dentro, ni poner valores fuera de los límites. Tests.
5. Un solar suspendido por mantenimiento impagado no admite inquilinos nuevos, no echa al actual y se reactiva al pagar. Test `upkeep suspends and resumes`.

---

### Task 1: Solares en `/shared`

**Files:**
- Modify: `shared/src/world.ts` (geometría de la tabla; `PLOT_SITES`; interior de un local extraído a una función reutilizable; `createStreetStructures` con carteles, farolas sur y decoración movida)
- Modify: `shared/src/economy.ts` (`Lot` con los campos de casero; `createLot`; `restorePlot`; `buildPlot`; `setPlotTerms`; `rentLot`, `chargeRent` y `closeLot` para solares; mantenimiento)
- Modify: `shared/src/economy.config.ts` (`ECONOMY.plots`)
- Modify: `shared/src/catalog.ts` (`plot_sign` como estructura 1x1)
- Modify: `shared/src/actions.ts`, `shared/src/reducer.ts` (`BUILD_PLOT`, `SET_PLOT_TERMS`)
- Create: `client/src/sprites/structures/plotSign.ts` (cartel de madera "Se vende" sobre un poste, `PALETTE`) y registro en `client/src/sprites/furniture/index.ts`
- Test: `shared/src/plots.test.ts`

**Interfaces:**
- Produces:
  - `Lot` gana `landlordId: string | null`, `landlordName: string | null`, `terms: { deposit: number; rent: number } | null` (null en los locales del ayuntamiento), `nextUpkeepAt: number`, `suspended: boolean`. `createLot(id, label)` los deja vacíos (null, 0, false).
  - `PLOT_SITES: { lotId: string; label: string; x: number }[]` y `isPlotId(id): boolean`.
  - `restorePlot(state, lot): GameState`: añade (o deja igual si ya están) el interior del solar, el edificio `shop` con su variante, la puerta en la escena de la calle y quita el cartel `plot_sign`. Única función que crea esas piezas; la usan `buildPlot` y el servidor al cargar.
  - `buildPlot(state, avatarId, lotId): GameState` (acción `{ type: 'BUILD_PLOT'; avatarId; lotId }`): el avatar en la calle, `isPlotId(lotId)`, sin lot existente con ese id, dinero y materiales suficientes; cobra (sale de la economía), crea el `Lot` con `landlordId`, términos iniciales y `nextUpkeepAt`, y llama a `restorePlot`.
  - `setPlotTerms(state, avatarId, lotId, deposit, rent): GameState` (acción `{ type: 'SET_PLOT_TERMS'; avatarId; lotId; deposit; rent }`): solo el casero, solo sin inquilino, enteros dentro de los límites.
  - `rentLot` en un solar: rechaza al casero y un solar `suspended`; cobra `terms.deposit` en vez de la fianza del negocio y paga al casero la fianza menos la comisión (aviso al casero). `chargeRent` en un solar: cobra `terms.rent` y lo paga al casero menos la comisión; si el inquilino no puede, `closeLot` como ahora.
  - `closeLot` conserva `landlordId`, `landlordName`, `terms`, `nextUpkeepAt` y `suspended` de un solar (resetea solo lo del inquilino).
  - Mantenimiento en el tick (junto a `chargeRent`): cada `periodSeconds` cobra `upkeep` al casero; si no puede, `suspended = true` y aviso; si puede, `suspended = false`.

- [ ] **Step 1: Tests que fallan** en `shared/src/plots.test.ts`

```ts
test('the street has six free plot sites with a sign and no lot', () => {});
test('building a plot charges money and materials and creates lot, interior, building and door', () => {});
test('cannot build without money or materials, twice, or on a non-plot id', () => {});
test('restorePlot is idempotent', () => { /* aplicarla dos veces da el mismo resultado que una */ });
test('landlord sets terms within limits only while vacant', () => {});
test('a tenant rents a plot paying the landlord deposit minus commission; the landlord cannot rent it', () => {});
test('daily rent goes to the landlord minus commission', () => {});
test('losing a plot keeps the landlord', () => { /* inquilino sin dinero → closeLot → sigue landlordId y terms */ });
test('upkeep suspends and resumes', () => { /* casero sin dinero → suspended, RENT_LOT rechazado; con dinero → se cobra y suspended false */ });
test('travelers can reach a shop on a plot', () => { /* openStoreDoors / pathfinding hasta la puerta en y 15 desde la acera norte */ });
```

- [ ] **Step 2: `npm test`** → FAIL.
- [ ] **Step 3: Implementar** con la geometría y los valores de la tabla.
- [ ] **Step 4: `npm test`, `npm run typecheck`, `npm run build`** → limpios (el cartel ya tiene sprite).
- [ ] **Step 5: Diario y commit** `Solares: construir, alquilar como casero y mantenimiento`.

---

### Task 2: Persistencia de los solares

**Files:**
- Modify: `server/src/persistence.ts` (columnas nuevas de `lots`; al cargar, `restorePlot` para cada lot de solar guardado; los muebles de los interiores de solares (`lot7`…) ya entran por el prefijo `lot`)
- Create: `supabase/migrations/006_plots.sql` (columnas `landlord_id text`, `landlord_name text`, `terms jsonb`, `next_upkeep_at bigint not null default 0`, `suspended boolean not null default false`; cabecera con orden de aplicación ANTES de desplegar, `begin; … rollback;`, y aviso de que no se puede volver al servidor anterior una vez guardados solares). Si redefine `lots_business_check`, conserva la lista completa (incluida `clothing`).
- Modify: `CLAUDE.md` local (lista de migraciones; sin `git add`)
- Test: añadir a `shared/src/plots.test.ts` un caso que reproduzca la carga (estado inicial + lots guardados → `restorePlot` → mismas escenas, puertas y edificios que tras construir).

**Interfaces:**
- Consumes: `Lot` y `restorePlot` de la Task 1.

- [ ] **Step 1: Test de carga que falla.**
- [ ] **Step 2: Persistencia y migración.**
- [ ] **Step 3: `npm test`, `npm run typecheck`, `npm run build`** → limpios.
- [ ] **Step 4: Diario y commit** `Los solares se guardan en Supabase`.

---

### Task 3: Interfaz de los solares

**Files:**
- Create: `client/src/ui/plotWindow.ts` (una ventana `PixelWindow` siguiendo `rentWindow.ts`, con dos modos: "Construir" para un solar libre — coste en dinero y materiales con `materialChips`, botón deshabilitado si no alcanza — y "Tu solar" para el casero — inquilino actual o "Libre", campos de fianza y alquiler con sus límites, botón "Guardar" deshabilitado con inquilino, estado de mantenimiento y aviso si está suspendido)
- Modify: `client/src/ui/rentWindow.ts` (en un solar muestra la fianza y el alquiler del casero, su nombre, y que está suspendido si lo está)
- Modify: `client/src/game/controller.ts` (clic en un `plot_sign` → ventana de construir; clic en la puerta o el edificio de un solar propio sin inquilino → ventana del casero; el resto igual que los locales)
- Modify: `client/src/main.ts` (cableado de las acciones)
- Modify: `README.md` (los solares y el papel de casero)

- [ ] **Step 1: Ventana del solar** y cableado.
- [ ] **Step 2: Ventana de alquiler** con los términos del casero.
- [ ] **Step 3: `npm test`, `npm run typecheck`, `npm run build`** → limpios.
- [ ] **Step 4: Diario y commit** `Interfaz para construir y gestionar solares`.

---

## Verificación final (la hace el Claude principal)

- `npm test`, `npm run typecheck`, `npm run build`.
- Navegador, `npm run dev:offline`: la calle nueva (acera sur, carteles, farolas, decoración movida, nada solapado); construir un solar con el coste; ver edificio, puerta en la acera trasera e interior; cambiar términos; con un segundo jugador simulado, alquilarlo y ver los avisos y el dinero del casero; viajeros que llegan a un negocio en un solar; cámara y profundidad correctas con los edificios en primer plano.
