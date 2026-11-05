# Fusión, fase 1: todo menos los solares de casero · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tener en `master` una sola versión del juego con lo de los dos ordenadores, salvo los solares de casero, lista para desplegar sin que los jugadores pierdan nada.

**Architecture:** Primero se retiran los solares de casero del `master` local, porque chocan con el plano de `origin/master`. Después se fusiona `origin/master` con un merge commit, se escriben las migraciones nuevas y se integran los negocios nuevos en lo que el otro lado añadió por negocio.

**Tech Stack:** TypeScript, Canvas 2D, Socket.IO, Supabase, node:test + tsx. PGlite solo para probar migraciones, fuera del repo.

**Spec:** `docs/superpowers/specs/2026-11-05-fusion-y-solares-design.md`. Los solares de casero de la spec son la fase 2. Sus columnas (`terms`, `next_upkeep_at`, `suspended`) no entran en la `010`: irán en la `012`.

## Global Constraints

- Se trabaja en `master`, sin ramas ni worktrees. Fusión con merge commit.
- PROHIBIDO: `git push`, `--force`, `rebase` de lo publicado y cualquier acceso a la base de producción. No leer ni imprimir `.env`.
- No arrancar el servidor ni abrir navegadores: lo comprueba el Claude principal.
- Commits: título en español, en presente y sin prefijo de tipo. Cuerpo con viñetas. Terminar con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Comentarios en español. Sin emoji. Nada de `Math.random()` ni `Date.now()` en la lógica; los valores de economía, en `economy.config.ts`.
- Colores de sprites en `PALETTE`, de interfaz en variables CSS. Sin código muerto. No debilitar tests para que pasen.
- `package-lock.json` solo se commitea si cambian dependencias. `CLAUDE.md` sigue sin seguimiento en git.
- Las migraciones de `origin/master` (001 a 009) no se tocan.

## Review Focus

1. Un mundo guardado con la forma de producción (`lot7` de jugador, `lot-e1` a `lot-e6`, niveles 3) se carga igual, con sus muebles. Test en Task 3.
2. Un inventario o mueble guardado con un `defId` de cualquiera de los dos lados sigue existiendo en el catálogo fusionado. Test en Task 2.
3. Liberar `lot4` y `lot6` no toca dinero, inventario ni locales de jugadores, y los vecinos vendedores siguen. Test en Task 2.
4. Las acciones de los dos lados llegan al servidor (`CLIENT_ACTIONS`). Test en Task 2.
5. Abrir un negocio nuevo en un local de nivel 3 y mejorar uno de nivel 1 funciona con los puestos por nivel. Test en Task 4.

---

### Task 1: Retirar los solares de casero del `master` local

**Files:**
- Delete: `shared/src/plots.ts`, `shared/src/plots.test.ts`, `client/src/ui/plotWindow.ts`, `client/src/sprites/structures/plotSite.ts`, `supabase/migrations/006_plots.sql`
- Modify: `shared/src/economy.ts`, `shared/src/economy.config.ts`, `shared/src/world.ts`, `shared/src/world.ids.ts`, `shared/src/actions.ts`, `shared/src/reducer.ts`, `shared/src/catalog.ts`, `shared/src/npcs.ts`, `server/src/gameServer.ts`, `server/src/persistence.ts`, `client/src/game/controller.ts`, `client/src/main.ts`, `client/src/ui/rentWindow.ts`, `client/src/ui/economyUi.ts`, `README.md`

**Interfaces:**
- Produces: un `master` sin `BUILD_PLOT`, `SET_PLOT_TERMS`, `ECONOMY.plots`, `PLOT_SITES`, `plotSite`, `isPlotId`, `restorePlot`, `restoreSavedPlots`, `lotTerms` ni los campos de casero de `Lot`. Calle de vuelta al plano anterior a los solares.

- [ ] **Step 1:** Localizar qué introdujeron los commits de solares (`git log --oneline a43bb81..master`) y quitarlo a mano. No usar `git revert` en bloque si deshace arreglos que no son de solares: por ejemplo, las ventanas con desplazamiento de `4d25acd` se quedan.
- [ ] **Step 2:** Mantener `chargeRent`, `rentLot` y `closeLot` como estaban antes de los solares. Mantener las utilidades generales que nacieron con ellos si hay más usos (`formatTicks`, `numberInput`, `readNumber`, `text`, `lotBuildingId`).
- [ ] **Step 3:** Run `grep -rnE "plot|Plot|landlord|upkeep" shared/src server/src client/src`. Expected: sin resultados relacionados con los solares de casero.
- [ ] **Step 4:** Run `npm test && npm run typecheck && npm run build`. Expected: todo pasa. Solo pueden desaparecer los tests de solares.
- [ ] **Step 5:** Commit: `Retira los solares de casero para rehacerlos sobre el Ensanche`, explicando en el cuerpo que vuelven en la fase 2 y están en el historial.

### Task 2: Fusionar `origin/master`

**Files:** los 26 con conflicto y los que hagan falta para compilar. Delete: `supabase/migrations/003_free_npc_lots.sql`, `004_bar_arcade_cotton.sql`, `005_clothing.sql`, sustituidas en Task 3.

**Interfaces:**
- Consumes: el resultado de Task 1.
- Produces: merge commit con los dos padres. `Lot` con `builtBy`, `readyAt`, `level` y `upgradeReadyAt`. `releaseNpcLots` activa al cargar y sin `setupNpcStores` en el mundo nuevo.

- [ ] **Step 1:** Run `git merge --no-ff --no-commit origin/master`. No usar `-X ours`, `-X theirs` ni `checkout --ours/--theirs` en archivos de código: los conflictos se combinan.
- [ ] **Step 2:** Resolver con estos criterios: plano de `world.ts` de `origin/master`; `businesses`, catálogo, recetas, materiales, fachadas y acciones son la unión de los dos lados; se elimina `setupNpcStores`; los vecinos vendedores se quedan; `closeRefund` igual que en `origin/master`. `journal.md` y `README.md` con el contenido de los dos, por fecha.
- [ ] **Step 3:** Añadir a `shared/src/merge.test.ts`:

```ts
test('the merged catalog keeps every furniture id from both sides', () => {
  // Lista literal de los defId de a43bb81..master y de a43bb81..origin/master.
  for (const id of BOTH_SIDES_DEF_IDS) assert.ok(CATALOG[id], id);
});
test('a new world has no NPC-owned lots and keeps the vendor neighbors', () => {
  const state = createWorld();
  assert.equal(Object.values(state.lots).filter((l) => isNpcId(l.ownerId)).length, 0);
  // Los vecinos vendedores de origin/master siguen presentes.
});
test('releaseNpcLots leaves player money, inventories and lots untouched', () => {
  // Estado con lot4 de NPC, lot7 y lot-e1 de un jugador con nivel 3.
  // assert.strictEqual en money, inventories, lots.lot7 y lots['lot-e1'].
});
```

  Ajustar los nombres importados a los reales.
- [ ] **Step 4:** Comprobar que `CLIENT_ACTIONS` en `server/src/gameServer.ts` contiene las acciones de jugador de `actions.ts` de los dos lados. Fijarlo con un test si la lista se puede importar.
- [ ] **Step 5:** Run `npm test && npm run typecheck && npm run build`. Expected: todo pasa.
- [ ] **Step 6:** Commit del merge: `Fusiona el trabajo de los dos ordenadores`, con viñetas de lo que trae cada lado. Run `git log -1 --format=%P`. Expected: dos padres.

### Task 3: Migraciones y carga con la forma de producción

**Files:**
- Create: `supabase/migrations/010_businesses_and_clothing.sql`, `supabase/migrations/011_remove_npc_lots.sql`, `server/src/persistence.test.ts`
- Modify: `server/src/persistence.ts`, `package.json` (script `test`, para que incluya `server/src/**/*.test.ts`)

**Interfaces:**
- Consumes: el `master` fusionado.
- Produces: `worldFromRows(state: GameState, rows: WorldRows): GameState`, función pura extraída de `Persistence.load`, si la carga no se puede probar de otra forma.

- [ ] **Step 1:** `010`: `lots_business_check` con `scrapyard, well, greenhouse, cotton_field, workshop, store, clothing, diner, bar, arcade, barber, greengrocer`. `inventory_items`: `def_id` admite null, `garment`, `color`, y el check `inventory_items_kind_check` de la `005` local. `furniture.garment`. Solo amplía. Cabecera: aplicar ANTES de desplegar y probar con `begin; ... rollback;`.
- [ ] **Step 2:** `011`: limpieza de los locales NPC, igual que la `003` local, y `drop column if exists next_restock_at`. Cabecera: aplicar DESPUÉS de comprobar que el servidor nuevo carga y guarda.
- [ ] **Step 3:** Probar la cadena con un script en el scratchpad y PGlite, sin añadir dependencias al repo. Crear antes un esquema `auth` mínimo si la `001` lo necesita. Aplicar 001 a 009, insertar filas con la forma de producción, aplicar la 010, insertar una prenda y aplicar la 011. Expected: sin errores, `lot7`, `lot-e*` y el inventario intactos, `lot4` y `lot6` libres.
- [ ] **Step 4:** Comprobar en ese mismo PGlite que las filas de `lotToRow`, `itemToRow` y `furniToRow` se insertan sin columnas desconocidas.
- [ ] **Step 5:** Test en `server/src/persistence.test.ts`: `a saved world with production shape loads intact`, con filas inventadas (sin datos reales) para `lot7` con invernadero nivel 3, `lot-e1` con `built_by` y nivel 3, `lot-e3` cerrado y `lot4` de NPC. Assert: conservan propietario, negocio, nivel y muebles; `lot4` queda libre; hay edificio y puerta para cada `lot-e*`.
- [ ] **Step 6:** Run `npm test && npm run typecheck && npm run build`. Expected: todo pasa.
- [ ] **Step 7:** Commit: `Migraciones de la fusión: negocios nuevos, prendas y limpieza de NPC`.

### Task 4: Los negocios nuevos en lo que trae el otro lado

**Files:**
- Modify: `client/src/sprites/structures/shopLogos.ts`, los archivos de decoración por negocio y de puestos por nivel de `origin/master`, `shared/src/economy.config.ts`, `shared/src/levels.ts`, `shared/src/merge.test.ts`

**Interfaces:**
- Consumes: el `master` fusionado y los `Record` por negocio de `origin/master`.
- Produces: `bar`, `arcade`, `cotton_field` y `clothing` con logo de neón, decoración propia, puestos por nivel, costes de mejora y XP o recompensas al abrir.

- [ ] **Step 1:** Listar todo lo que `origin/master` define por negocio con `git grep -nE "scrapyard|greengrocer" -- shared/src client/src server/src`. Cada lista o `Record` debe incluir los cuatro nuevos.
- [ ] **Step 2:** Añadir a `merge.test.ts`:

```ts
for (const business of ['bar', 'arcade', 'cotton_field', 'clothing'] as const) {
  test(`${business} opens at level 3 and upgrades from level 1`, () => {
    // rentLot en un local de nivel 3: el negocio abre con su puesto.
    // upgradeLot en nivel 1: cobra el coste y al acabar sube a 2.
  });
}
```

- [ ] **Step 3:** Dibujar logos y decoración con `PALETTE`, al estilo de los existentes: legibles a `LOGO.scale = 2`, escena reconocible y neón del negocio. La tienda de ropa, como la tienda: sin puesto si su tipo no lo lleva.
- [ ] **Step 4:** Run `npm test && npm run typecheck && npm run build`. Expected: todo pasa.
- [ ] **Step 5:** Commit: `Los negocios nuevos con logo, decoración y niveles`.

### Task 5: Documentación

**Files:** `docs/journal.md`, `README.md`, `docs/superpowers/specs/2026-11-05-fusion-y-solares-design.md`, este plan.

- [ ] **Step 1:** Entrada de journal con lo fusionado, decisiones y pendientes (fase 2; los pasos de despliegue de la spec).
- [ ] **Step 2:** README: sin solares de casero; con todo lo demás.
- [ ] **Step 3:** Commit de los tres con: `Documenta la fusión y el plan de la fase 1`.
