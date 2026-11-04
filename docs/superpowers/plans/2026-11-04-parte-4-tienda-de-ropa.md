# Parte 4 · Tienda de ropa y prendas · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prendas que se poseen y se ponen (cambian la forma del avatar) y una tienda de ropa que las cose con tela y las vende a jugadores y a viajeros.

**Architecture:** Las prendas son objetos de inventario de un segundo tipo (`{ id, garment, color }`) junto a los muebles (`{ id, defId }`). El aspecto del avatar gana un `outfit` opcional por ranura (cabeza, torso, pies) con tipo y color; el reducer solo deja llevar prendas que el jugador tiene, y una única función (`dropUnownedOutfit`) quita las que deja de tener. La tienda de ropa es un tipo de negocio nuevo (`clothing`) que reutiliza la cola de fabricación y el escaparate: una prenda a la venta es un mueble `clothes_rack` con `price`, `garment` y el color como `variant` (el mismo uso de `variant` que el coche). El dibujo de las prendas son capas de píxeles del avatar con sustitución de paleta.

**Tech Stack:** TypeScript 7, Canvas 2D, `node:test` + `tsx`, Supabase (migración nueva).

**Spec:** `docs/superpowers/specs/2026-11-03-negocios-parcelas-design.md` (sección "5. Tienda de ropa").

## Global Constraints

- Comentarios en español; identificadores en inglés; sin emoji.
- Valores de economía solo en `shared/src/economy.config.ts`; colores permitidos del avatar en `shared/src/looks.ts`.
- Todo cambio de estado por acciones del reducer; lógica determinista. Las búsquedas en config con claves que manda el cliente usan las guardas `Object.hasOwn` existentes (`isOwnKey` en `economy.config.ts`).
- Sprites por código. Avatar: matrices de caracteres con paleta (`client/src/sprites/avatar.ts`), 2 vistas (frente y espalda) reflejadas en espejo, caché por combinación.
- UI con `PixelWindow` y las clases CSS existentes, sin colores fijos fuera de los tokens.
- Migraciones nuevas solamente; no tocar producción. La `005` solo amplía (columnas nulas y checks más anchos), así que es segura con el servidor antiguo: se aplica ANTES de desplegar el servidor nuevo.
- Sin código muerto ni lógica duplicada. Commits en `master`: título en español, presente, sin prefijo, cuerpo con viñetas. Entrada en `docs/journal.md` (arriba) por tarea. `CLAUDE.md` está sin seguimiento en git: si se edita, no se hace `git add`.

## Valores (decisión del plan, ajustables en la config)

**Prendas** (`GarmentId`, orden de la lista):

| Id | Nombre | Ranura | Receta | Segundos | Valor |
|---|---|---|---|---|---|
| `cowboy_hat` | Sombrero de cowboy | `head` | `{ fabric: 2 }` | 20 | 45 |
| `cap` | Gorra | `head` | `{ fabric: 1 }` | 12 | 25 |
| `denim_jacket` | Chaqueta vaquera | `torso` | `{ fabric: 3 }` | 30 | 70 |
| `vest` | Chaleco | `torso` | `{ fabric: 2 }` | 20 | 50 |
| `boots` | Botas | `feet` | `{ fabric: 1, tires: 1 }` | 20 | 40 |

`GARMENT_COLORS` (en `looks.ts`): `['#d94040', '#2f8f8a', '#f2b134', '#3a3434', '#4a78ab', '#8a5a34', '#f6e7c8', '#6a4a8a']`.

**Negocio** `clothing`: nombre "Tienda de ropa", `kind: 'clothing'`, fachada `boutique`, neón `#ffb3d9`, fianza 140, alquiler 40, descripción "Cose prendas con tela y las vende a jugadores y viajeros." Va en `BusinessType`/`BUSINESSES` justo detrás de `store`. Usa `ECONOMY.workshop.queueSize` para la cola y `ECONOMY.store` (máximo de productos, precios, comisión) para el escaparate.

**Estructuras nuevas:** `sewing_machine` "Máquina de coser" 1x2, puesto de `clothing` en `{ x: 1, y: 1, rotation: 0 }`; `clothes_rack` "Burro de ropa" 1x1, el expositor de una prenda a la venta (se coloca en los `DISPLAY_SLOTS` con `DISPLAY_ROTATION`, como los productos de la tienda).

## Review Focus

1. Vender, poner a la venta o perder una prenda que llevas puesta te la quita del aspecto en el mismo momento; si tienes otra igual (mismo tipo y color), la sigues llevando. Tests `listing a worn garment takes it off` y `a second identical garment keeps it on`.
2. Un `SET_LOOK` o `JOIN` con una prenda que no tienes (cliente tramposo, o `localStorage` antiguo) no la pone; el resto del aspecto sí se aplica. Tests `cannot wear a garment you do not own` y `join drops unowned garments`.
3. Mundos guardados de antes de esta parte: inventarios sin prendas y aspectos sin `outfit` siguen cargando. Test `look without outfit is valid`.
4. Un avatar con sombrero sentado en un asiento queda a la misma altura que sin sombrero (el hueco del sombrero no desplaza las caderas). Revisión visual del controlador y constante `HIP_ROW` ajustada.
5. La tienda de decoración no acepta prendas y la de ropa no acepta muebles. Test `stores only list their own kind`.

---

### Task 1: Prendas en `/shared`: catálogo, inventario, aspecto y persistencia

**Files:**
- Create: `shared/src/garments.ts` (`GarmentId`, `GarmentSlot`, `Garment`, `GARMENTS` con nombre y ranura, `GARMENT_IDS`, `isGarmentId`)
- Modify: `shared/src/economy.config.ts` (`garmentRecipes: Record<GarmentId, Recipe>`, `garmentValue: Record<GarmentId, number>` con la tabla)
- Modify: `shared/src/looks.ts` (`GARMENT_COLORS`; `AvatarLook.outfit` validado en `isValidLook`)
- Modify: `shared/src/types.ts` (`AvatarLook.outfit?: Partial<Record<GarmentSlot, Garment>>`; `InventoryItem` como unión)
- Modify: `shared/src/economy.ts` o `shared/src/garments.ts` (helpers, ver Interfaces)
- Modify: `shared/src/reducer.ts` (`SET_LOOK`, `JOIN`, `PLACE_FURNI` rechaza prendas; cualquier otro consumidor de `InventoryItem` que asuma `defId`)
- Modify: `server/src/persistence.ts` (leer/escribir `garment` y `color` de `inventory_items`)
- Modify: `shared/src/index.ts` (exportar `garments.ts`)
- Create: `supabase/migrations/005_clothing.sql`
- Modify: client mínimo para compilar (consumidores de `InventoryItem` que lean `defId`, p. ej. `inventoryWindow.ts`: las prendas se listan con su nombre y color y sin botón "Colocar"; el resto de la UI de prendas es de la Task 4)
- Test: `shared/src/garments.test.ts`

**Interfaces:**
- Produces:
  - `type GarmentSlot = 'head' | 'torso' | 'feet'`; `interface Garment { type: GarmentId; color: string }`
  - `type InventoryItem = FurniInventoryItem | GarmentInventoryItem`, con `FurniInventoryItem = { id: string; defId: FurniId }` y `GarmentInventoryItem = { id: string; garment: GarmentId; color: string }`; `isGarmentItem(item): item is GarmentInventoryItem`
  - `ownsGarment(state, avatarId, garment: Garment): boolean`
  - `dropUnownedOutfit(state, avatarId): GameState` (quita del `outfit` las prendas que ya no tiene; devuelve el mismo `state` si no cambia nada)
  - `SET_LOOK` y `JOIN`: aplican el aspecto y luego `dropUnownedOutfit` (no rechazan el aspecto entero)
- Persistencia: `inventory_items.def_id` pasa a nulo permitido; columnas nuevas `garment text`, `color text`, con check `(def_id is null) <> (garment is null)`; `furniture.garment text` (lo usa la Task 2). `lots_business_check` con `clothing` detrás de `store` (lista completa).

- [ ] **Step 1: Tests que fallan** en `shared/src/garments.test.ts`

```ts
test('look without outfit is valid', () => { assert.ok(isValidLook(DEFAULT_LOOK)); });
test('outfit must use a known garment in its slot and an allowed color', () => {
  // { head: { type: 'cowboy_hat', color: GARMENT_COLORS[0] } } válido
  // ranura equivocada (boots en head), color fuera de GARMENT_COLORS o tipo 'toString' → no válido
});
test('cannot wear a garment you do not own', () => {
  // jugador sin prendas: SET_LOOK con sombrero → el aspecto se aplica sin outfit.head
  // con { id, garment: 'cowboy_hat', color } en el inventario → lo lleva
});
test('join drops unowned garments', () => { /* JOIN con outfit de una prenda que no está en su inventario → avatar sin ella */ });
test('a second identical garment keeps it on', () => {
  // dos sombreros iguales; quitar uno del inventario y llamar dropUnownedOutfit → lo sigue llevando
});
test('garments cannot be placed as furniture', () => { /* PLACE_FURNI con una prenda → mismo state */ });
```

- [ ] **Step 2: `npm test`** → FAIL.
- [ ] **Step 3: Implementar** catálogo, config, tipos, validación y helpers.
- [ ] **Step 4: Persistencia y migración `005_clothing.sql`** (cabecera: qué cambia, que se aplica ANTES de desplegar, y cómo probarla con `begin; … rollback;`).
- [ ] **Step 5: Ajustar los consumidores de `InventoryItem`** hasta que `npm run typecheck` pase, sin UI nueva salvo lo indicado.
- [ ] **Step 6: `npm test`, `npm run typecheck`, `npm run build`** → limpios.
- [ ] **Step 7: Diario y commit** `Prendas: catálogo, inventario y aspecto`.

---

### Task 2: La tienda de ropa en `/shared` y sus estructuras

**Files:**
- Modify: `shared/src/economy.config.ts` (`BusinessKind` con `'clothing'`, `BusinessType` y `BUSINESSES` con `clothing`)
- Modify: `shared/src/catalog.ts` (`sewing_machine`, `clothes_rack` como estructuras)
- Modify: `shared/src/economy.ts` (`STATIONS`; recetas de prendas en la cola; recogida; escaparate; compra; `servesCustomers` incluye `clothing`)
- Modify: `shared/src/actions.ts`, `shared/src/reducer.ts` (`CRAFT` admite prendas con color; `PICKUP_FURNI` de un expositor devuelve la prenda)
- Modify: `shared/src/travelers.ts` (comprar prendas y salir con ellas puestas)
- Create: `client/src/sprites/structures/sewingMachine.ts`, `clothesRack.ts` (el burro es una función de la variante, como `car`, y pinta las prendas colgadas del color de la variante); registrar en `client/src/sprites/furniture/index.ts`
- Modify: `client/src/sprites/structures/shop.ts` (icono de neón de `clothing`: una percha)
- Test: `shared/src/clothing.test.ts`

**Interfaces:**
- Consumes: Task 1 (`Garment`, `GarmentInventoryItem`, `isGarmentItem`, `dropUnownedOutfit`, `garmentRecipes`, `garmentValue`, `GARMENT_COLORS`).
- Produces:
  - `RecipeId = DecorId | MaterialId | GarmentId`; acción `{ type: 'CRAFT'; avatarId; lotId; recipe: RecipeId; color?: string }` (el color es obligatorio y validado contra `GARMENT_COLORS` si la receta es una prenda, e ignorado si no)
  - `CraftJob` con una tercera forma `{ garment: GarmentId; color: string; readyAt: number }`, resuelta en el mismo sitio que las otras dos (`craftJobInfo`); solo una tienda `clothing` fabrica prendas y solo un `workshop` fabrica muebles y materiales
  - `FurniItem.garment?: GarmentId`: un expositor a la venta es `{ defId: 'clothes_rack', variant: <color>, garment, price, … }`
  - `listingValue(item: FurniItem): number` (valor de referencia de un producto: `garmentValue` para expositores, `baseValue` para muebles), usado por los viajeros en lugar de `ECONOMY.baseValue[item.defId]`
  - `LIST_ITEM` en `clothing` solo acepta prendas; en `store`, solo muebles. Al poner a la venta una prenda se llama a `dropUnownedOutfit` del dueño.
  - `BUY_ITEM` de un expositor da al comprador `{ id, garment, color }`.
  - Un viajero que compra una prenda se la pone (`outfit[slot]`).

- [ ] **Step 1: Tests que fallan** en `shared/src/clothing.test.ts`

```ts
test('clothing store crafts a garment in the chosen color', () => {
  // dueño dentro de su tienda 'clothing' con { fabric: 2 }; CRAFT cowboy_hat color GARMENT_COLORS[1];
  // tras readyAt, COLLECT_CRAFTED → inventario con { garment: 'cowboy_hat', color: GARMENT_COLORS[1] } y sin tela
});
test('craft rejects a garment without a valid color, and garments outside a clothing store', () => {});
test('stores only list their own kind', () => {
  // LIST_ITEM de una prenda en 'store' → mismo state; de un mueble en 'clothing' → mismo state
});
test('listing a worn garment takes it off', () => {
  // dueño lleva el sombrero y lo pone a la venta → outfit.head undefined; hay un clothes_rack con garment, variant = color y price
});
test('a player buys a garment and can wear it', () => { /* BUY_ITEM → { garment, color } en el inventario del comprador; SET_LOOK lo pone */ });
test('unlisting returns the garment', () => { /* PICKUP_FURNI del expositor por el dueño → la prenda vuelve a su inventario */ });
test('a traveler buys a garment and wears it', () => {
  // usar la función de decisión/compra de travelers.ts que ya usa la tienda (con el random determinista)
  // tras la compra, el avatar del viajero tiene outfit[slot] con ese tipo y color, y el dueño cobra
});
```

- [ ] **Step 2: `npm test`** → FAIL.
- [ ] **Step 3: Implementar** en `/shared` (cola, escaparate, compra, viajeros, guardas).
- [ ] **Step 4: Estructuras y neón** en el cliente.
- [ ] **Step 5: `npm test`, `npm run typecheck`, `npm run build`** → limpios.
- [ ] **Step 6: Diario y commit** `Tienda de ropa: coser, exponer y vender prendas`.

---

### Task 3: Las prendas en el dibujo del avatar

**Files:**
- Modify: `client/src/sprites/avatar.ts`
- Test: ninguno automático (es dibujo); el controlador lo revisa en el navegador.

**Interfaces:**
- Consumes: `AvatarLook.outfit`, `GARMENTS` (ranura).
- Produces: `getAvatarFrames(look)` dibuja las prendas; la clave de caché incluye el `outfit`.

- [ ] **Step 1: Hueco fijo para sombreros.** Todas las vistas y fotogramas llevan las mismas filas transparentes encima de la cabeza (las que necesite el sombrero más alto, unas 3), y `HIP_ROW` sube en esa misma cantidad, para que sentarse y apoyar los pies no cambien con o sin sombrero. Revisar los usos de la altura del sprite en `client/src/engine/renderer.ts` y bocadillos (`chatBubbles.ts`) por si dependen de ella.
- [ ] **Step 2: Capas de cada prenda** como matrices con dos letras nuevas de la leyenda (`G` color de la prenda, `g` su sombra con `shade`), de frente y de espaldas: sombrero de cowboy (ala ancha), gorra (visera hacia la cara en la vista de frente), chaqueta vaquera (mangas y solapas sobre la camiseta), chaleco (sin mangas, abierto), botas (sustituyen a los zapatos `B`, una fila más altas). Se superponen en orden: cuerpo, torso, cabeza, pies.
- [ ] **Step 3: `npm run typecheck`, `npm run build`** → limpios.
- [ ] **Step 4: Diario y commit** `Las prendas se ven en el avatar`.

---

### Task 4: Interfaz de la ropa

**Files:**
- Modify: `client/src/ui/avatarEditor.ts` (sección "Prendas": por ranura, las prendas que tienes con su color, una para ponértela y "Quitar"; despacha `SET_LOOK`)
- Modify: `client/src/ui/businessWindow.ts` (negocio `clothing`: cola y recetas de prendas con selector de color de `GARMENT_COLORS`, botón "Recoger"; escaparate como en la tienda pero con las prendas del inventario)
- Modify: `client/src/ui/shopWindow.ts` (los expositores muestran nombre y color de la prenda)
- Modify: `client/src/ui/inventoryWindow.ts` (icono de prenda en vez del cuadro simple de la Task 1)
- Modify: `client/src/main.ts` (cableado; `saveLook` guarda también el `outfit`)
- Modify: `client/src/ui/styles.css` solo con los tokens existentes
- Modify: `README.md` (la tienda de ropa y las prendas)

**Interfaces:**
- Consumes: todo lo anterior.

- [ ] **Step 1: Editor de avatar** con la vista previa usando el `outfit`.
- [ ] **Step 2: Ventana de la tienda de ropa** (dueño) y **ventana de compra** (cliente).
- [ ] **Step 3: Inventario** con icono de prenda (reutiliza los sprites de la Task 3 o una muestra de color con el nombre).
- [ ] **Step 4: `npm test`, `npm run typecheck`, `npm run build`** → limpios.
- [ ] **Step 5: Diario y commit** `Interfaz de la tienda de ropa y del vestuario`.

---

## Verificación final (la hace el Claude principal)

- `npm test`, `npm run typecheck`, `npm run build`.
- Navegador, `npm run dev:offline`: alquilar una tienda de ropa; con tela, coser un sombrero rojo y unas botas; recogerlas; ponérselas desde el editor (4 direcciones, andando y sentado); poner el sombrero a la venta y ver que se quita; ver el burro con el color; comprarlo con otro jugador si es posible o ver que un viajero lo compra y sale con él puesto.
