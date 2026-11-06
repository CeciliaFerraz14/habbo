# Solares de casero sobre el Ensanche · Plan de la fase 2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que quien construye un local en el Ensanche pueda elegir entre abrir su negocio o alquilarlo a otros jugadores, con un solo tipo de solar.

**Architecture:** `Lot` recupera `terms`, `nextUpkeepAt` y `suspended` como campos opcionales; `terms` presente significa "en alquiler" y `builtBy` sigue siendo la propiedad. Las reglas viven en `/shared` y entran por dos acciones nuevas (`LIST_LOT`, `UNLIST_LOT`) y por las funciones que ya existen (`rentLot`, `chargeRent`, `closeLot`, `upgradeLot`). El cliente añade una ventana del dueño con `PixelWindow`.

**Tech Stack:** TypeScript, Canvas 2D y DOM, Socket.IO, Supabase, `node:test` con tsx.

**Spec:** `docs/superpowers/specs/2026-11-05-fusion-y-solares-design.md`, secciones "Solares", "Modelo de datos", "Despliegue" y "Comprobación".

**Código de referencia:** el sistema anterior sigue en git: `git show f221029^:shared/src/plots.ts`, `f221029^:shared/src/plots.test.ts`, `f221029^:client/src/ui/plotWindow.ts` y `f221029^:shared/src/economy.ts` (`chargeUpkeep`, `lotTerms`, `payOwner`). Se reutiliza lo que encaje, pero sin `landlordId`, `landlordName`, `plotSite` ni `PLOT_SITES`.

## Global Constraints

- Se trabaja directamente en `master`, sin ramas ni worktrees. No se hace `push`.
- Nada se conecta a producción. Antes de cualquier `npm run dev`, `server/.env` tiene que no existir o no apuntar a producción. No se usa el MCP de Supabase.
- Comentarios del código y textos del juego en español. Títulos de commit en español, en presente y sin prefijo de tipo.
- Sin números mágicos: todo valor de economía va en `ECONOMY`. Sin `Math.random()` ni `Date.now()` en `/shared`.
- UI solo con `PixelWindow`, las clases CSS existentes y los helpers de `economyUi.ts`.
- `ECONOMY.plots`: `deposit {min 0, max 400}`, `rent {min 10, max 120}`, `initialTerms {deposit 100, rent 40}`, `upkeep 12`, `commissionRate 0.1`. No vuelve `buildCost`: construir sigue usando `ECONOMY.building`.
- `npm test`, `npm run typecheck` y `npm run build` limpios antes de cada commit. Los commits añaden sus ficheros por nombre: `CLAUDE.md` sigue sin seguimiento y no se añade.

## Decisiones de este plan (no están en la spec)

- **`terms` hace de estado "en alquiler":** presente = en alquiler; ausente = no. No hay otra bandera. Al retirar el local se borran las condiciones y `suspended`.
- **El mantenimiento se cobra por adelantado al poner en alquiler** ($12). Si aún queda periodo pagado (`nextUpkeepAt > tick`), volver a ponerlo no cobra nada. Así, retirar y volver a poner el local no sirve para evitar el pago ni para salir de la suspensión gratis. Sin dinero para el primer pago, no se puede poner en alquiler.
- **Una sola acción para poner en alquiler y cambiar condiciones:** `LIST_LOT`. Si el local ya está en alquiler y libre, solo actualiza las condiciones, sin cobrar.
- **El dueño con inquilino entra andando como cualquier cliente y, además, se le abre la ventana del dueño.** La ventana no se cierra al cambiar de escena. Es la única vía para mejorar un local con inquilino.
- **La migración `012` se aplica junto a la `010`, antes del servidor,** porque las dos fases se desplegarán juntas. El servidor no arranca sin ella.

## Review Focus

- Dueño desconectado (no está en `state.avatars`): sigue cobrando el alquiler y pagando el mantenimiento. Se prueba en la tarea 1.
- Dueño sin dinero durante muchos ticks: un solo aviso de suspensión, no uno por tick, y se recupera solo al tener dinero. Se prueba en la tarea 1.
- Mismo tick en que el inquilino no paga y toca mantenimiento: el local queda libre, sigue en alquiler y no se pisan los cambios. Se prueba en la tarea 1.
- Datos falsos del cliente (`NaN`, decimales, texto, fuera de límites, local ajeno, en obras u ocupado): el estado no cambia y no hay aviso. Se prueba en la tarea 1.
- Inquilino que se va con una mejora en obras: el nivel se conserva, la obra acaba sin negocio y el siguiente inquilino tiene los puestos de ese nivel. Se prueba en la tarea 1.

---

### Task 1: Reglas compartidas

**Files:**
- Create: `shared/src/plots.ts`, `shared/src/plots.test.ts`
- Modify: `shared/src/economy.config.ts`, `shared/src/economy.ts`, `shared/src/actions.ts`, `shared/src/reducer.ts`, `shared/src/index.ts`, `server/src/gameServer.ts`

**Interfaces:**
- Produces (en `economy.ts`):
  - `interface PlotTerms { deposit: number; rent: number }`
  - `Lot` con `terms?: PlotTerms`, `nextUpkeepAt?: number`, `suspended?: boolean`
  - `lotTerms(lot: Lot, business: BusinessType): PlotTerms`: `lot.terms` si los tiene; si no, los de `ECONOMY.businesses[business]`
  - `isIntegerBetween` pasa a exportarse
- Produces (en `plots.ts`):
  - `listLot(state: GameState, avatarId: string, lotId: string, deposit: number, rent: number): GameState`
  - `unlistLot(state: GameState, avatarId: string, lotId: string): GameState`
- Produces (en `actions.ts`):
  - `{ type: 'LIST_LOT'; avatarId: string; lotId: string; deposit: number; rent: number }`
  - `{ type: 'UNLIST_LOT'; avatarId: string; lotId: string }`

- [ ] **Step 1: Escribir los tests que fallan en `shared/src/plots.test.ts`**

Helper local `withBuiltLot(overrides)`: estado inicial con `lot1` construido por `p1` (`builtBy: 'p1'`, `readyAt: 0`), libre, y los avatares `p1` y `p2` con $1000 cada uno. Pasar el tiempo poniendo `tick` y llamando a `economyTick`. Para `P = secondsToTicks(ECONOMY.rent.periodSeconds)`:

| Test | Comprueba |
|---|---|
| `listing charges the first upkeep and stores the terms` | `LIST_LOT` 100/40: `terms` `{100, 40}`, `p1` queda con 988 y `nextUpkeepAt` es `tick + P` |
| `listing again within the paid period charges nothing` | listar, retirar y listar: `p1` sigue en 988 y `nextUpkeepAt` no cambia |
| `listing after the paid period charges again` | relistar con `tick >= nextUpkeepAt`: otros $12 |
| `listing without money for the upkeep is rejected` | `p1` con $11: mismo objeto de estado |
| `changing terms while listed charges nothing` | segundo `LIST_LOT` 50/20 sin inquilino: nuevos `terms`, mismo dinero |
| `listing rejects bad values and bad lots` | `NaN`, `1.5`, `'100'`, -1, 401, rent 9, rent 121, local ajeno, local del ayuntamiento, en obras, con negocio propio y con inquilino: mismo objeto de estado |
| `a listed lot cannot be opened by its owner` | `RENT_LOT` de `p1` con `terms`: sin cambios |
| `unlisting works only while vacant and clears the suspension` | con inquilino, sin cambios; libre y suspendido, sin `terms` ni `suspended`, y `nextUpkeepAt` se conserva |
| `a tenant pays the deposit to the owner minus commission` | 100/40: `p2` -100, `p1` +90, `ownerId` es `p2`, `builtBy` sigue siendo `p1`, aviso al dueño |
| `a deposit of 0 opens without paying and tells the owner` | `p1` no cobra y recibe el aviso |
| `an unlisted, suspended or unfinished lot cannot be rented by others` | `RENT_LOT` de `p2`: sin cambios en los tres casos |
| `daily rent goes to the owner minus commission` | alquiler 40: `p2` -40, `p1` +36; alquiler 15: `p1` +13 |
| `upkeep is charged empty and occupied, and not when unlisted` | $12 por periodo en los dos primeros casos; un local construido sin `terms`, nunca |
| `upkeep suspends once and resumes` | `p1` con $5: `suspended`, un solo aviso en 3 ticks, y con $12 paga y vuelve a `false` |
| `a suspended lot keeps its tenant and still pays rent` | el inquilino sigue y `p1` cobra su parte |
| `offline owner still collects and pays` | `p1` fuera de `avatars`: el dinero cambia igual |
| `a tenant who cannot pay loses the lot, which stays listed` | `ownerId` null, `business` null, `terms`, `builtBy` y `level` intactos, muebles en el inventario de `p2`, aviso a los dos |
| `losing the lot in the same tick as upkeep keeps both results` | el local queda libre y `nextUpkeepAt` avanza |
| `an absent tenant loses the lot; an absent owner does not` | tras `abandonSeconds`, el inquilino sale y el dueño recibe aviso; quien lleva su propio local construido lo conserva |
| `a tenant closing gets no refund and the money is not created` | dinero de `p2` sin cambios, materiales del almacén devueltos, aviso al dueño, y la suma de todo el dinero igual |
| `only the owner upgrades a built lot` | `UPGRADE_LOT` de `p2` rechazado; el de `p1` con inquilino lo paga `p1`; en un local del ayuntamiento sigue pudiendo `p2` |
| `the level stays and the next tenant gets its stations` | el inquilino se va con la obra en marcha, esta acaba sin negocio, `level` sube, y el siguiente inquilino tiene los puestos de ese nivel |
| `a city lot behaves as before` | `RENT_LOT` paga `config.deposit` y nadie cobra; al cerrar se devuelve `closeRefund` y el nivel vuelve a 1 |

- [ ] **Step 2: Ejecutar `npm test`**

Expected: fallan por no existir `listLot`, `LIST_LOT` y `ECONOMY.plots`.

- [ ] **Step 3: Añadir `ECONOMY.plots`** con los valores de Global Constraints y un comentario sobre el Ensanche, y actualizar el comentario de `building`.

- [ ] **Step 4: Cambiar `economy.ts`**

- `payOwner(state, ownerId, price, what, commissionRate = ECONOMY.store.commissionRate)`.
- `rentLot`: si `lot.builtBy === avatarId`, rechaza con `terms`, o en obras, y cuesta 0. Si `builtBy` es otro, exige `terms`, sin `suspended` y sin obras; paga `terms.deposit` al dueño con `payOwner` y `ECONOMY.plots.commissionRate` (solo si es mayor que 0), y le avisa de quién alquila.
- `chargeRent`: usa `lotTerms`; si `lot.builtBy`, paga al dueño con la misma comisión.
- `chargeUpkeep`: como la versión anterior, sobre `lot.terms` y `lot.builtBy`, leyendo siempre `next.lots[lot.id]`. Va justo después de `chargeRent` en `economyTick`.
- `ownership`: conserva también `terms`, `nextUpkeepAt` y `suspended` cuando existan.
- `closeLot`: si `builtBy` existe y no coincide con `ownerId`, avisa al dueño de que el local vuelve a estar en alquiler. Es el único sitio de ese aviso, y cubre impago, abandono y cierre.
- `closeBusiness`: `refund` es 0 si `lot.builtBy`; aviso propio para el inquilino ("la fianza se la queda el dueño").
- `upgradeLot`: autoriza `(lot.builtBy ?? lot.ownerId) === avatarId`. Paga `avatarId`.
- `finishConstructions`: el aviso dice que se puede abrir un negocio o ponerlo en alquiler.

- [ ] **Step 5: Crear `plots.ts`** con `listLot` y `unlistLot` y una cabecera que explique las reglas, añadir las acciones, enlazarlas en `reducer.ts` y `index.ts`, y añadir `'LIST_LOT'` y `'UNLIST_LOT'` a la lista de `gameServer.ts`.

- [ ] **Step 6: Ejecutar `npm test && npm run typecheck`**

Expected: todo en verde, también los tests anteriores.

- [ ] **Step 7: Commit**

```bash
git add shared/src/plots.ts shared/src/plots.test.ts shared/src/economy.config.ts shared/src/economy.ts shared/src/actions.ts shared/src/reducer.ts shared/src/index.ts server/src/gameServer.ts
git commit -m "Reglas para alquilar los locales del Ensanche"
```

### Task 2: Migración, guardado y despliegue

**Files:**
- Create: `supabase/migrations/012_lot_rental.sql`
- Modify: `server/src/persistence.ts`, `server/src/persistence.test.ts`, `docs/superpowers/specs/2026-11-05-fusion-y-solares-design.md`

**Interfaces:**
- Consumes: `Lot.terms`, `Lot.nextUpkeepAt`, `Lot.suspended` de la tarea 1.
- Produces: columnas `lots.terms jsonb`, `lots.next_upkeep_at bigint not null default 0`, `lots.suspended boolean not null default false`. `requireMigration010` pasa a llamarse `requireMigrations` y comprueba también esas columnas.

- [ ] **Step 1: Escribir los tests que fallan en `persistence.test.ts`**

| Test | Comprueba |
|---|---|
| `a listed lot with a tenant survives a save and load` | `terms`, `nextUpkeepAt`, `suspended`, `builtBy`, `ownerId` y `level` iguales tras `lotToRow` y `worldFromRows` |
| `an unlisted built lot loads without rental fields` | fila con `terms` null, 0 y false: sin esas claves en el `Lot` |
| `production-shaped rows without rental values stay unlisted` | los `lot-e*` existentes: sin `terms` y sin mantenimiento |
| `the server refuses to start without migration 012` | cliente falso que falla al leer esas columnas de `lots`: `load` lanza un error que nombra `012_lot_rental.sql` |

- [ ] **Step 2: Ejecutar `npm test`**

Expected: fallan esos cuatro.

- [ ] **Step 3: Implementar**

`rowToLot` y `lotToRow`, con el estilo opcional de `builtBy`. `requireMigrations`, con el mensaje de la migración que falte. `012_lot_rental.sql`, con una cabecera al estilo de la `010`: qué cambia, por qué es segura con el servidor anterior, cómo aplicarla con `lock_timeout` y `statement_timeout`, y que se aplica antes del servidor aunque su número sea posterior al de la `011`, de la que no depende.

- [ ] **Step 4: Probar la cadena completa**

Con PGlite instalado en una carpeta temporal fuera del repo, aplicar 001 a 012 en orden numérico y también con el orden real de producción (hasta 009, 010, 012, 011), con filas de la forma de producción. Expected: sin errores y filas intactas. No se añade ninguna dependencia al repo.

- [ ] **Step 5: Actualizar la spec**

- "Migraciones": añadir la `012`.
- "Despliegue": los pasos 2 y 3 prueban y aplican `010` y `012`.
- "Vuelta atrás": también se cierra en cuanto haya un local en alquiler guardado.

- [ ] **Step 6: Ejecutar `npm test && npm run typecheck`**

Expected: todo en verde.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/012_lot_rental.sql server/src/persistence.ts server/src/persistence.test.ts docs/superpowers/specs/2026-11-05-fusion-y-solares-design.md
git commit -m "Migración 012: guarda el alquiler de los locales del Ensanche"
```

### Task 3: Interfaz y documentación

**Files:**
- Create: `client/src/ui/landlordWindow.ts`
- Modify: `client/src/ui/rentWindow.ts`, `client/src/ui/businessWindow.ts`, `client/src/ui/boardWindow.ts`, `client/src/ui/buildWindow.ts`, `client/src/ui/economyUi.ts`, `client/src/game/controller.ts`, `client/src/main.ts`, `README.md`, `docs/journal.md`

**Interfaces:**
- Consumes: `LIST_LOT`, `UNLIST_LOT`, `UPGRADE_LOT`, `lotTerms`, `isIntegerBetween`, `upgradeCost`, `lotLevel`, `isUpgrading`, `ECONOMY.plots`.
- Produces: `createLandlordWindow(actions: { list(lotId, deposit, rent): void; unlist(lotId): void; upgrade(lotId): void }): { open(lotId): void; update(state, playerId): void }`. Evento nuevo del controlador: `openLandlord(lotId)`.

Esta tarea no tiene tests automáticos: el cliente no tiene infraestructura de tests y las reglas ya están probadas en la tarea 1. La comprobación es typecheck, build y la prueba en el navegador que hace la sesión principal después.

- [ ] **Step 1: Crear `landlordWindow.ts`**

Con una firma en JSON como `rentWindow`, para no borrar lo que se escribe, y la cuenta atrás actualizada en su sitio. Se cierra si el local deja de ser del jugador o si este abre su propio negocio en él.

| Estado del local | Muestra |
|---|---|
| Sin `terms` | Fianza y alquiler (`numberInput`, con `initialTerms`), límites, comisión del 10 %, mantenimiento de $12 al día, aviso de que se paga el primero al ponerlo (salvo periodo ya pagado), botón "Poner en alquiler" (desactivado sin dinero o con valores no válidos) |
| Con `terms`, libre | Mismos campos, "Guardar condiciones", "Retirar del alquiler", cuenta atrás del mantenimiento o aviso de suspendido |
| Con inquilino | Nombre del inquilino y negocio, condiciones sin editar, cuenta atrás o aviso de suspendido, nivel del local con "Mejorar" (coste y materiales con `materialChips`) o cuenta atrás de la obra |

- [ ] **Step 2: Conectar la navegación**

- `controller.goToDoor`: si la puerta está abierta, el local es del jugador (`builtBy`) y lo lleva otro, entra andando y llama a `openLandlord`.
- `main.ts`, en `openRent`, tras comprobar las obras:
  - Local propio con `terms`: ventana del dueño.
  - Local propio sin `terms`: ventana de abrir negocio.
  - Local ajeno construido con `terms` y sin `suspended`: ventana de alquilar.
  - Local ajeno construido, en otro caso: el toast actual.
- `main.ts` crea la ventana, despacha sus acciones y la actualiza en `refreshUi`.

- [ ] **Step 3: Ajustar las ventanas existentes**

- `rentWindow`:
  - Precios con `lotTerms`.
  - En local ajeno, muestra el dueño, el alquiler al día y que no hay devolución al cerrar.
  - La firma incluye `terms` y `suspended`.
  - Se cierra si el local ajeno se retira o se suspende.
  - En local propio, añade el botón "Ponerlo en alquiler", que abre la ventana del dueño.
- `businessWindow`:
  - `buildClose` tiene tres textos: local del ayuntamiento, local propio e inquilino ("no recuperas la fianza"; el nivel se queda en el local).
  - `buildLevel`, para el inquilino: muestra el nivel y "las mejoras las paga el dueño", sin botón.
- `boardWindow.lotLine`: local en alquiler con fianza y alquiler al día; suspendido o sin `terms`, como hoy.
- `buildWindow`: el texto explica las dos opciones y que el mantenimiento solo se paga si se alquila.
- `economyUi.formatTicks`: recupera el formato `23 h 5 min` a partir de una hora.

- [ ] **Step 4: Documentar**

- `README.md`: el Ensanche con las dos opciones, los valores de `ECONOMY.plots` y el mantenimiento y la comisión entre las salidas de dinero.
- `docs/journal.md`: entrada con qué se hizo, las decisiones de este plan y lo pendiente.

- [ ] **Step 5: Ejecutar `npm test && npm run typecheck && npm run build`**

Expected: todo limpio. Buscar `landlord` en `shared/src` y `server/src` y `plotSite` en todo el código: sin resultados.

- [ ] **Step 6: Commit**

```bash
git add client/src/ui/landlordWindow.ts client/src/ui/rentWindow.ts client/src/ui/businessWindow.ts client/src/ui/boardWindow.ts client/src/ui/buildWindow.ts client/src/ui/economyUi.ts client/src/game/controller.ts client/src/main.ts README.md docs/journal.md
git commit -m "Ventana del dueño para alquilar los locales del Ensanche"
```

## Comprobación final (sesión principal, no los subagentes)

Con `server/.env` ausente, `npm run dev` con jugadores invitados y un solo navegador, con dos pestañas como dos jugadores:

1. Construir un local en el Ensanche, ponerlo en alquiler, cambiar condiciones y retirarlo.
2. Alquilarlo desde la segunda sesión y comprobar el dinero de los dos.
3. Entrar como dueño con inquilino y mejorar el local. Comprobar que el inquilino no ve el botón.
4. Cerrar como inquilino, sin devolución, y ver que el local vuelve a estar en alquiler.
5. Repetir las ventanas a 390 px de ancho, sin desplazamiento lateral y sin errores en la consola.

**Sigue pendiente después de este plan, y es obligatorio antes de producción:** la prueba de guardar y cargar en una base real de pruebas, que ya incluirá la `012`.
