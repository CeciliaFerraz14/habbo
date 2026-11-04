# Parte 3 · Muebles nuevos · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir cinco muebles fabricables en el taller que encajan con el bar y los recreativos: barra de bar, barril, diana, máquina recreativa y pinball.

**Architecture:** Un mueble es una entrada en `CATALOG` (`shared/src/catalog.ts`), una receta y un valor de referencia en `economy.config.ts`, y un modelo de cajas en `client/src/sprites/furniture/` registrado en `MODELS`. Los tipos (`Record<DecorId, …>`) obligan a completar las cuatro piezas. No hay lógica nueva: taller, tiendas, inventario, viajeros y persistencia ya tratan cualquier `DecorId` (la columna `def_id` es `text` sin check, así que no hace falta migración).

**Tech Stack:** TypeScript 7, Canvas 2D (sprites por código), `node:test` + `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-03-negocios-parcelas-design.md` (sección "4. Muebles nuevos").

## Global Constraints

- Comentarios en español; identificadores en inglés; sin emoji.
- Valores de economía solo en `shared/src/economy.config.ts`.
- Sprites por código con el modelo de cajas (`box`, `glow`, `backrest` de `client/src/sprites/furniture/model.ts`), 16 unidades por baldosa (ver `jukebox.ts` para 1x1 y `dinerBooth.ts` para 1x2), rotación 0 con el frontal hacia SE (+x). Colores de `PALETTE` donde haya equivalente; los neones siempre de `PALETTE`. Contorno y horneado los pone `bake.ts`.
- Sin código muerto. Commit en `master`: título en español, presente, sin prefijo, cuerpo con viñetas. Entrada en `docs/journal.md` (arriba).

## Valores (decisión del plan, ajustables en la config)

Orden en `DecorId` y `CATALOG` (es el orden del taller y de las tiendas): los nueve actuales y, detrás, estos cinco.

| Id | Nombre | Tamaño | Receta | Segundos | Valor | Notas de dibujo |
|---|---|---|---|---|---|---|
| `bar_counter` | Barra de bar | 1x2 | `{ old_wood: 3, sheet_metal: 1 }` | 35 | 90 | Mostrador de madera oscura con tapa clara y reposapiés metálico |
| `beer_barrel` | Barril | 1x1 | `{ old_wood: 2, sheet_metal: 1 }` | 20 | 45 | Barril tumbado sobre caballete, aros metálicos y grifo en el frontal |
| `dartboard` | Diana | 1x1 | `{ old_wood: 1, sheet_metal: 1 }` | 15 | 40 | Diana redonda (escalonada) en un poste, anillos alternos rojo y crema |
| `arcade_machine` | Máquina recreativa | 1x1 | `{ sheet_metal: 3, old_wood: 1, tokens: 2 }` | 50 | 150 | Mueble alto con pantalla emisiva (`glow`), panel de mandos y luz `PALETTE.neonCyan` |
| `pinball` | Pinball | 1x2 | `{ sheet_metal: 3, tires: 1, tokens: 2 }` | 60 | 170 | Mesa inclinada sobre patas con tablero emisivo y cabecera alta con `glow` rosa |

Ninguno es sentable ni pisable.

## Review Focus

1. Un mueble 1x2 girado (rotaciones 1-3) no se sale de su huella ni se dibuja flotando. Revisión visual del controlador; en código, las cajas dentro de `x 0..16, y 0..32`.
2. Fabricar la máquina recreativa o el pinball sin fichas no hace nada. Test `arcade machine needs tokens`.
3. Los muebles emisivos brillan de noche (tecla `N`) y la luz no sale de una cara que no existe. Revisión visual.
4. Un viajero compra un mueble nuevo puesto a la venta como cualquier otro (usa `baseValue`). Cubierto por el camino genérico; test `new furniture has recipe and value`.
5. El inventario y la ventana de tienda muestran el icono y el nombre. Revisión visual.

---

### Task 1: Cinco muebles nuevos

**Files:**
- Modify: `shared/src/catalog.ts` (`DecorId`, `CATALOG`)
- Modify: `shared/src/economy.config.ts` (`recipes`, `baseValue`; comentarios si listan muebles)
- Create: `client/src/sprites/furniture/barCounter.ts`, `beerBarrel.ts`, `dartboard.ts`, `arcadeMachine.ts`, `pinball.ts`
- Modify: `client/src/sprites/furniture/index.ts` (registrar en `MODELS`, bloque "Muebles")
- Modify: `README.md` si lista los muebles
- Test: `shared/src/furniture.test.ts` (crear; si ya existe un test de muebles, añadir ahí)

**Interfaces:**
- Produces: `DecorId` con `bar_counter | beer_barrel | dartboard | arcade_machine | pinball`.

- [ ] **Step 1: Tests que fallan**

```ts
test('new furniture has recipe and value', () => {
  for (const id of ['bar_counter', 'beer_barrel', 'dartboard', 'arcade_machine', 'pinball'] as const) {
    assert.ok(DECOR_IDS.includes(id));
    assert.ok(ECONOMY.recipes[id].seconds > 0);
    assert.ok(ECONOMY.baseValue[id] > 0);
  }
});

test('arcade machine needs tokens', () => {
  // dueño de un taller dentro del local con { sheet_metal: 3, old_wood: 1 } y sin fichas:
  // CRAFT 'arcade_machine' devuelve el mismo state
  // con { tokens: 2 } añadido: la cola tiene un trabajo y se gastan los materiales
});
```

Usar los helpers de `shared/src/workshop.test.ts` (importarlos si están exportados o reproducir su forma mínima).

- [ ] **Step 2: `npm test`** → FAIL.
- [ ] **Step 3: Catálogo, recetas y valores** con la tabla.
- [ ] **Step 4: Los cinco modelos y su registro.** Seguir `jukebox.ts` (1x1, `glow` y `light`) y `dinerBooth.ts` (1x2).
- [ ] **Step 5: `npm test`, `npm run typecheck`, `npm run build`** → limpios.
- [ ] **Step 6: Diario y commit** `Muebles de bar y recreativos: barra, barril, diana, máquina y pinball`.

---

## Verificación final (la hace el Claude principal)

- `npm test`, `npm run typecheck`, `npm run build`.
- Navegador, `npm run dev:offline`: fabricar cada mueble en un taller, colocarlo en la caravana en las 4 rotaciones, verlo de día y de noche, ponerlo a la venta en una tienda.
