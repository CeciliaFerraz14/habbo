# Diario de trabajo

Una entrada por paso: fecha, qué se hizo, decisiones y por qué. Lo más reciente arriba.

## 2026-11-05 · Se retiran los solares de casero

**Qué se hizo**
- Fuera `plots.ts`, sus tests, `plotWindow.ts`, `plotSite.ts`, la migración `006_plots.sql`, las acciones `BUILD_PLOT` y `SET_PLOT_TERMS`, `ECONOMY.plots` y los campos de casero de `Lot`.
- La calle vuelve al plano anterior a los solares: 14 de fondo, con sus farolas, cactus y paseo de vecinos de entonces.
- `rentLot`, `chargeRent` y `closeLot` quedan como antes de los solares; el toast de "Local alquilado" vuelve a `main.ts`.

**Decisiones**
- Se retiran porque chocan con el plano de `origin/master`. Vuelven en la fase 2 sobre el Ensanche; el código sigue en el historial.
- Se quedan los arreglos que no son de solares: ventanas con desplazamiento, ventana de alquiler con firma y las utilidades `formatTicks`, `numberInput`, `readNumber`, `text`, `isIntegerBetween` y `lotBuildingId`.
- `006_plots.sql` se puede borrar porque nunca se aplicó.

## 2026-11-05 · Las ventanas altas se pueden desplazar

**Qué se hizo**
- `styles.css`: el cuerpo de las ventanas del juego tiene una altura máxima según la pantalla y se desplaza; se quita el límite interior de `.recipes`, que ya no hace falta.
- `rentWindow.ts`: las condiciones van encima de la lista de negocios.
- La farola de la fila A pasa de (36,15) a (38,15): tapaba la ventana y el cartel del Solar 3.

**Decisiones**
- El límite va en CSS con un margen fijo. Una ventana arrastrada hacia abajo puede salirse por abajo hasta que se la sube; ajustarlo al arrastrar no compensa.
- `.chat-log` conserva su propio desplazamiento porque el historial se pega al último mensaje. El login queda fuera: ahí se desplaza la pantalla de carga.

## 2026-11-05 · Solares en dos filas y correcciones de la revisión

**Qué se hizo**
- Plano: la calle pasa a 25 de fondo, con la fila A de solares en y 11-14 (puertas en y 15) y la fila B en y 17-20 (puertas en y 21). `PLOT_SITES` lleva x e y por sitio; la puerta está en `y + 4` y la salida en `y + 5`.
- `plot_site` (`client/src/sprites/structures/plotSite.ts`) sustituye a `plot_sign`: estructura fija de 4x4 con losa, valla y cartel. Clic en cualquier parte abre la ventana de construir y `restorePlot` la quita.
- Farolas también en las aceras y 15 e y 21, cactus redistribuidos y vecinos paseando por y 21.
- El casero abre su ventana con clic en el edificio aunque el solar esté alquilado; por la puerta, si hay inquilino, entra como cliente.
- La ventana de alquiler se reconstruye con una firma (condiciones, suspensión, casero y dinero) y se cierra si alquilan el local mientras está abierta.
- Los toasts de éxito de `main.ts` pasan a avisos del reducer (`buildPlot`, `setPlotTerms`, `rentLot`), y el casero recibe aviso de un inquilino nuevo (también con fianza 0) y de cuando lo pierde.
- Fianza o alquiler vacíos ya no se guardan como 0, la cuenta atrás del mantenimiento se oculta si está suspendido y `text()` vive en `economyUi.ts`. Limpieza en `rowToLot` y `landlordMode`.

**Decisiones**
- La fila B está desplazada 7 baldosas para que sus edificios no tapen las fachadas de la A. Como el solar sin construir no se puede pisar, nadie puede quedar dentro cuando aparece el edificio.
- Las farolas de y 21 no usan las x de las otras aceras: en x 16 quedarían delante de una fachada y junto a su puerta. Los cactus evitan las líneas de vista de las fachadas y la columna x = 43, que es el paso de una baldosa junto a la fila B.
- El aviso de un inquilino nuevo va aparte del de la fianza: con fianza 0 no hay cobro que avisar, y así el casero siempre sabe quién es.
- La firma de `plotWindow` y `rentWindow` sigue el mismo patrón; los avisos son autoritativos, así que no hay toast de éxito si el servidor rechaza la acción.

## 2026-11-04 · Interfaz para construir y gestionar solares

**Qué se hizo**
- `client/src/ui/plotWindow.ts`: ventana del solar con dos modos. "Construir" (solar libre): coste en dinero y materiales (en rojo lo que no alcanza), botón deshabilitado si no alcanza, y aviso del mantenimiento y la comisión. "Tu solar" (casero): inquilino o "Libre", campos de fianza y alquiler con los límites de `ECONOMY.plots`, "Guardar" deshabilitado con inquilino o con valores fuera de límites, mantenimiento con la cuenta atrás del próximo cobro y aviso si está suspendido. Se cierra al salir de la calle o si el solar lo construye otro.
- `client/src/ui/rentWindow.ts`: en un solar enseña el casero, su fianza y su alquiler; si está suspendido lo dice y deshabilita los botones.
- `client/src/game/controller.ts`: clic en un cartel de solar → ventana de construir; clic en el edificio o la puerta de tu propio solar libre → ventana del casero (en `goToDoor`, que ya decidía la ventana de alquiler, así cubre edificio, puerta y suelo de la puerta). El resto, igual que los locales.
- `client/src/main.ts`: cableado de `BUILD_PLOT` y `SET_PLOT_TERMS` y actualización de la ventana con cada estado.
- Compartido: `plotOfSign(itemId)` (world.ts) da el solar de un cartel, como `lotOfStation`; `lotTerms(lot, business)` (economy.ts) es la única regla de "en un solar, las condiciones del casero": la usan `rentLot`, `chargeRent` y la ventana de alquiler. Tests de las dos.
- `client/src/ui/economyUi.ts`: `formatTicks` (ahora con horas para el mantenimiento diario), `numberInput` y `readNumber` salen de la ventana de negocio para usarlos también en la del solar.
- README: los solares y el papel de casero.

**Decisiones**
- La ventana del casero solo se abre con el solar libre, como pide el plan: con inquilino, el clic lleva a la puerta y se entra en el negocio del inquilino.
- El cliente valida los límites solo para deshabilitar "Guardar"; quien decide sigue siendo el reducer.

## 2026-11-04 · Los solares se guardan en Supabase

**Qué se hizo**
- `supabase/migrations/006_plots.sql`: columnas `landlord_id`, `landlord_name`, `terms` (jsonb), `next_upkeep_at` y `suspended` en `lots`, todas nulas o con valor por defecto. Se aplica ANTES de desplegar el servidor nuevo; con el servidor antiguo es segura, pero una vez guardados solares no se puede volver a él.
- `server/src/persistence.ts`: `rowToLot` y `lotToRow` leen y escriben las columnas nuevas. Al cargar, `restoreSavedPlots` pone en la calle cada solar guardado.
- `shared/src/plots.ts`: `restoreSavedPlots(state)` llama a `restorePlot` por cada solar con casero y descarta (lot y muebles) los guardados sin casero: son filas de antes de la 006 y, restauradas, bloquearían el sitio para siempre; el solar vuelve a tener su cartel.
- `plotSite(id)` (world.ts) sustituye los tres recorridos de `PLOT_SITES`; `isPlotId` se apoya en él. `lotBuildingId` pasa a `world.ids.ts` y lo usan `closeLot`, `restorePlot`, el cambio de fachada y el cargador.
- `shared/src/npcs.ts`: los vecinos también pasean por la acera sur (y 10) y la trasera de los solares (y 15). Las filas son una lista fija y el azar sigue saliendo de la semilla.
- Tests: carga de un solar guardado (mismas escenas, puertas y edificio que al construir) y descarte de uno sin casero.

**Decisiones**
- La limpieza de solares sin casero va después de fijar `saved`, igual que `releaseNpcLots`: el primer guardado borra de Supabase sus muebles huérfanos. La fila de `lots` se queda y se sobrescribe al volver a construir.
- No se redefine `lots_business_check`: los solares usan los mismos negocios.

## 2026-11-04 · Solares: construir, alquilar como casero y mantenimiento

**Qué se hizo**
- `shared/src/world.ts`: la calle pasa a 19 filas: acera sur (y 10, con farolas en x 6, 16, 26 y 36), solares de 4x4 en y 11-14 (`PLOT_SITES`, ids `lot7`…`lot12`, "Solar 1"…"Solar 6", en las x de los locales), acera trasera (y 15) con sus puertas y desierto en y 16-18, adonde se mueven los cactus del sur y el cartel de bienvenida. Cada solar sin construir tiene un cartel `plot_sign` en `(x + 3, 14)`. La puerta, el interior y el edificio de un local salen de `lotStreetDoor`, `lotInterior` y `lotBuilding`, que usan los locales del ayuntamiento y `restorePlot`.
- `restorePlot(state, lot)` (world.ts): la única función que pone las piezas de un solar construido (interior, edificio `shop` con rotación 1 y su variante, puerta con `lotId`) y quita el cartel. Es idempotente para que el servidor la llame al cargar.
- `shared/src/plots.ts`: `buildPlot` (acción `BUILD_PLOT`: en la calle, solar libre, dinero y materiales de `ECONOMY.plots.buildCost`, que salen de la economía) y `setPlotTerms` (acción `SET_PLOT_TERMS`: solo el casero, solo sin inquilino, enteros dentro de los límites).
- `shared/src/economy.ts`: `Lot` gana `landlordId`, `landlordName`, `terms`, `nextUpkeepAt` y `suspended`. En un solar, `rentLot` cobra la fianza del casero y se la paga menos `ECONOMY.plots.commissionRate`, rechaza al casero y un solar suspendido; `chargeRent` cobra el alquiler del casero y se lo paga igual; `closeLot` conserva el casero. `chargeUpkeep`, en el tick junto a `chargeRent`, cobra el mantenimiento diario. `isIntegerBetween` sustituye las tres comprobaciones de enteros que había (precios, servicio, proveedor). `payOwner` recibe la comisión.
- `shared/src/economy.config.ts`: `ECONOMY.plots`. `catalog.ts`: estructura `plot_sign` (1x1). Cliente: `structures/plotSign.ts` con `PALETTE`. Servidor: `BUILD_PLOT` y `SET_PLOT_TERMS` en `CLIENT_ACTIONS`; `rowToLot` parte de `createLot` para que compile (las columnas de casero llegan con la migración 006).
- Tests: `plots.test.ts` (10).

**Decisiones**
- Un solar sin construir no está en `state.lots`: así no cuenta como negocio, no hay que guardarlo y el casero aparece solo al construir.
- `buildPlot` y `setPlotTerms` van en `plots.ts` y `restorePlot` en `world.ts`, no en `economy.ts`: `world.ts` ya importa de `economy.ts`, y al revés sería una importación circular.
- Si el casero no puede pagar el mantenimiento, el solar queda suspendido y se le vuelve a cobrar en cada tick hasta que pague (un solo aviso), en vez de esperar al día siguiente: "no admite inquilinos hasta que pague".
- `closeLot` copia siempre los campos de casero: en un local del ayuntamiento son los de `createLot`, así que no hace falta distinguirlos.
- Una fianza de 0 no le manda al casero un aviso de "$0".

## 2026-11-04 · Arreglos de la revisión final de la parte 4

**Qué se hizo**
- `shared/src/reducer.ts`: JOIN normaliza el aspecto (`normalizeLook` o `DEFAULT_LOOK`) antes de quitar las prendas que no son suyas; cubre handshake, perfil guardado y modo local.
- `shared/src/garments.ts`: `garmentKey` (clave tipo+color) y `withOutfit` (la única regla de "sin prendas, sin `outfit`"), usados por `normalizeLook`, `dropUnownedOutfit` y la interfaz.
- `shared/src/economy.ts`: `listingValue` devuelve 0 para un producto que no es prenda ni mueble de decoración.
- Cliente: el color del escaparate de ropa entra en la firma de `businessWindow` (ya no se pierde el precio escrito); "Quitar" va en la cabecera de cada ranura del editor; colores de estructuras en `PALETTE`.
- Migración 005: aviso de que, con prendas guardadas, volver al servidor anterior no es seguro.

## 2026-11-04 · Interfaz de la tienda de ropa y del vestuario

**Qué se hizo**
- `client/src/ui/avatarEditor.ts`: sección "Prendas": por ranura (cabeza, torso, pies), las prendas que tienes (cada tipo y color una vez, con su icono); clic para ponértela y "Quitar" para dejar la ranura vacía. Cada cambio manda `SET_LOOK` con colores y prendas. "Al azar" solo cambia los colores. `update(look, items)` compara el aspecto entero (prendas incluidas) y el inventario.
- `client/src/ui/businessWindow.ts`: la tienda de ropa tiene cola de costura, muestras de `GARMENT_COLORS`, recetas de prendas en el color elegido y, debajo, el escaparate de la tienda. La cola (`buildCraftQueue`) y la fila de receta (`recipeRow`) salen del taller y las usan los dos. `craft` lleva el color.
- `client/src/ui/shopWindow.ts`: sirve para las dos tiendas (`sellsProducts`); los burros se ven con el icono de su prenda.
- `client/src/game/controller.ts`: el producto de una tienda ajena (mueble o burro, que es una estructura fija) se mira antes que las estructuras fijas, y el puesto de una tienda ajena (mostrador o máquina de coser) abre la tienda con `sellsProducts`.
- `client/src/sprites/avatar.ts`: `getGarmentSprite`, la capa de una prenda de frente, recortada y con contorno. `client/src/ui/icons.ts`: `garmentIcon` (ampliado x2) y `productIcon`; `furniIcon` ya no recibe variante.
- `client/src/ui/inventoryWindow.ts`: las prendas con su icono en vez del cuadro de color. `client/src/main.ts`: cableado del color y del inventario del editor. README: tienda de ropa y prendas.

**Decisiones**
- Icono de prenda dibujado con la misma capa que lleva el avatar, en vez de una muestra de color: así se distingue un sombrero de una gorra. Suelta le falta el contorno que pone el cuerpo (chaleco, botas), por eso se le añade uno al hornear el icono.
- Los botones de prenda del editor reutilizan `.facade-option` (botón con icono, nombre y marca de elegido) en lugar de crear un componente nuevo.
- `saveLook` ya guardaba el aspecto completo; ahora el editor siempre manda las prendas. Al entrar, `JOIN` quita las que ya no tengas.

## 2026-11-04 · Las prendas se ven en el avatar

**Qué se hizo**
- `client/src/sprites/avatar.ts`: cada fotograma lleva `HEADROOM` (3) filas vacías encima de la cabeza para los sombreros. `HIP_ROW` se calcula (`TORSO_ROW + TORSO.length`) y sube esas 3 filas. Capas de prenda con dos letras nuevas de la leyenda (`G` y su sombra `g`): sombrero de cowboy (simétrico, una sola matriz), gorra (copa compartida; visera hacia la cara de frente y cierre de espaldas), chaqueta vaquera y chaleco (frente y espalda) y botas, que se sacan de las piernas de cada fotograma (`bootsFor`). Se apilan en orden torso, cabeza, pies encima del cuerpo. La clave de caché incluye tipo y color de cada ranura.
- `client/src/sprites/canvas.ts`: `stackSprites` apila capas sobre un sprite; `createSprite` y ella comparten `offscreen`.
- Comentarios en `renderer.ts` (`avatarHeadPosition`) y `avatarEditor.ts` (`PREVIEW_H`).

**Decisiones**
- Hueco fijo en vez de altura variable: de pie el sprite se apoya por abajo y sentado por `HIP_ROW`, así que los pies y el asiento no se mueven, con sombrero o sin él.
- Cada capa se hornea con su propia paleta y se apila con `drawImage`: así cada prenda puede tener su color sin inventar letras por ranura.
- Las botas no se dibujan a mano por fotograma: se derivan de las piernas (zapatos y el píxel de pantalón de encima), y siguen la animación y la postura de sentado.
- Tras la revisión: la chaqueta de frente tenía píxeles `T` (camiseta) que no están en la paleta de una capa y rompían el horneado; ahora son transparentes y se ve la camiseta del cuerpo. Todas las capas usan solo `O`, `G`, `g` y `.`.
- Los bocadillos se anclan al borde de arriba del sprite (3 px más arriba que antes sin sombrero) para no tapar nunca un sombrero. La vista previa del editor (28 px de alto) ya cabe el sprite de 27 px.

## 2026-11-04 · Tienda de ropa: coser, exponer y vender prendas

**Qué se hizo**
- `shared/src/economy.config.ts`: negocio `clothing` ("Tienda de ropa", tipo `clothing`, fachada `boutique`, neón `#ffb3d9`, fianza 140, alquiler 40) detrás de `store`. `RecipeId` incluye las prendas.
- `shared/src/catalog.ts`: estructuras `sewing_machine` (puesto de la tienda de ropa, 1x2) y `clothes_rack` (expositor de una prenda, 1x1). `FurniItem.garment`: la prenda de un burro; su color va en `variant`, como el del coche.
- `shared/src/economy.ts`: `CraftJob` con una tercera forma `{ garment, color, readyAt }`, resuelta en `craftJobInfo`. `craftOrder` decide qué fabrica cada negocio (el taller, muebles y materiales; la tienda de ropa, prendas de un color de `GARMENT_COLORS`) y `CRAFT` lleva `color`. `collectCrafted` entrega también prendas. `LIST_ITEM` acepta en cada tienda solo lo suyo y, al poner a la venta una prenda, llama a `dropUnownedOutfit`. `productName` y `listingValue` (valor de referencia de un producto, mueble o prenda) para avisos y viajeros. `sellsProducts` agrupa las dos tiendas.
- `shared/src/furniture.ts`: `isPickable` e `inventoryItemOf`, usados por `PICKUP_FURNI`, `BUY_ITEM` y el cierre de un local: retirar, comprar o perder el local devuelve la prenda del burro, no el burro. `shared/src/garments.ts`: `isGarmentDisplay`. `shared/src/looks.ts`: `isGarmentColor`, la misma comprobación que ya usaba `normalizeLook`.
- `shared/src/travelers.ts`: el precio se compara con `listingValue`; la variedad cuenta prendas distintas; un viajero que compra una prenda se la pone (`restyle`, compartido con la peluquería).
- `server/src/persistence.ts`: lee y escribe `furniture.garment` (columna de la migración `005`).
- Cliente: modelos `sewingMachine.ts` y `clothesRack.ts` (función de la variante, que pinta la prenda colgada) y neón de percha en `shop.ts`. La ventana del negocio usa `productName`; para `clothing` sigue saliendo la sección de la tienda hasta la Task 4.
- Tests: `clothing.test.ts` (8). `withBusiness` pasa a `testHelpers.ts` para compartirlo con `businesses.test.ts`.

**Decisiones**
- El burro es una estructura fija: no se mueve como un mueble, pero sí se recoge (`isPickable`), y entonces vuelve la prenda.
- Un color que no es de `GARMENT_COLORS` (o que falta) rechaza el `CRAFT` de una prenda; en el taller el color se ignora.
- La variedad de los viajeros cuenta tipos de prenda: si no, una tienda de ropa siempre tendría variedad 1.
- Tras la revisión: `sellsItem(lot, item)` es la única regla de qué vende cada tienda (la usan `listItem` y la ventana del negocio, que en la tienda de ropa ya ofrece solo prendas); `craftsGoods(lot)` dice qué negocios tienen cola; `isGarmentDisplay` comprueba que la prenda existe; `furniIcon` acepta la variante (el burro sale de su color) y la ventana de compra usa `productName`.

## 2026-11-04 · Prendas: catálogo, inventario y aspecto

**Qué se hizo**
- `shared/src/garments.ts`: catálogo de prendas (`cowboy_hat`, `cap`, `denim_jacket`, `vest`, `boots`) con nombre y ranura (`head`, `torso`, `feet`), `isGarmentId`, `isGarmentItem`, `ownsGarment` y `dropUnownedOutfit`.
- `shared/src/economy.config.ts`: `garmentRecipes` y `garmentValue`. `shared/src/looks.ts`: `GARMENT_COLORS`; `normalizeLook` sustituye a `isValidLook`: valida colores y `outfit` (prenda que existe, en su ranura y con un color permitido) y devuelve una copia solo con los campos conocidos, o null. La usan `SET_LOOK`, el servidor al conectar y `loadLook` del cliente.
- `shared/src/types.ts`: `AvatarLook.outfit`, `LookPart`, e `InventoryItem` pasa a ser `FurniInventoryItem | GarmentInventoryItem`.
- Reducer: `SET_LOOK` y `JOIN` aplican el aspecto y quitan las prendas que no tiene; `PLACE_FURNI` y `LIST_ITEM` ignoran prendas.
- `server/src/persistence.ts`: lee y escribe `garment` y `color` en `inventory_items`.
- `supabase/migrations/005_clothing.sql`: `inventory_items.def_id` admite null, columnas `garment` y `color` con check de que la fila es mueble o prenda, `furniture.garment` (para la tienda de ropa) y `clothing` en `lots_business_check`.
- Cliente mínimo: el inventario lista las prendas con nombre y color, sin colocarlas; la tienda de decoración no ofrece prendas.
- `shared/src/testHelpers.ts`: el jugador de prueba que repetían `workshop.test.ts` y `businesses.test.ts`. 10 tests nuevos en `garments.test.ts`.

**Decisiones**
- Llevar una prenda no la saca del inventario: el aspecto guarda tipo y color, y basta con tener una prenda igual. Si se pierde (venta), `dropUnownedOutfit` la quita de encima.
- Una prenda que no tienes no invalida el aspecto entero: se quita y el resto se aplica. Un color no permitido sí rechaza el aspecto, como antes.
- El aspecto se normaliza en vez de solo validarse: si no, un campo de más (dentro de una prenda, por ejemplo) se enviaba a todos y se guardaba en `profiles.look`. Sin prendas, el aspecto no lleva `outfit` (nunca `{}`).
- La migración exige que una prenda tenga color: `(garment is null) = (color is null)`.
- La migración `005` incluye ya lo que necesita la tienda de ropa (`furniture.garment` y `clothing`), para que la parte 4 tenga una sola migración. Se aplica ANTES de desplegar el servidor nuevo (probar antes con `begin; ... rollback;`); con el servidor antiguo es segura porque solo amplía.

## 2026-11-04 · Diana, barril y neón del algodón más legibles

**Qué se hizo**
- `dartboard.ts`: tablero mayor con anillos escalonados que sobresalen 1 unidad cada uno, para que el contorno de `bake.ts` no se coma el color.
- `beerBarrel.ts`: barril en pie de madera con panza escalonada, dos aros y grifo.
- `shared/src/economy.config.ts`: el neón del campo de algodón pasa de `#f6e7c8` a `#9fe8ff`, que de día no se perdía en el cartel claro de la fachada.

## 2026-11-04 · Cinco muebles nuevos: bar y recreativos

**Qué se hizo**
- `shared/src/catalog.ts` y `economy.config.ts`: `bar_counter`, `beer_barrel`, `dartboard`, `arcade_machine` y `pinball`, con receta, tiempo y valor de referencia.
- Cliente: un modelo por mueble en `client/src/sprites/furniture/`, registrados en `MODELS`. Recreativa y pinball tienen pantalla/tablero emisivos y charco de luz de neón.
- 2 tests: recetas y valores en `economy.test.ts`; la recreativa exige fichas en `workshop.test.ts`.

**Decisiones**
- Recreativa y pinball piden 2 fichas: así las fichas del taller tienen salida más allá del servicio de los recreativos.
- El taller y las tiendas los listan solos porque recorren `DECOR_IDS`.

## 2026-11-03 · Revisión final de la parte 2

**Qué se hizo**
- `shared/src/economy.config.ts`: `isOwnKey`, `isFurnitureRecipe` e `isMaterialRecipe` (claves propias con `Object.hasOwn`); desaparece `MATERIAL_RECIPES`.
- `shared/src/economy.ts`: `CRAFT`, `BUY_MATERIAL`, `SET_FACADE` y `RENT_LOT` ignoran claves como `toString` (antes `CRAFT` tiraba el servidor). Nueva `craftJobInfo`, usada por el reducer y por la ventana del taller. `collectCrafted` solo toca los materiales si recogió alguno.
- Cliente: `planter.ts` comparte el bancal entre invernadero y algodón; `materialSwatch` se usa en las recetas de material; la máquina de fichas usa `PALETTE.neonPink`.
- Textos del taller, README y comentarios al día; 6 tests nuevos.

**Decisiones**
- Un trabajo cuya receta ya no existe se ignora en todas partes (`craftJobInfo` devuelve null).
- La migración `004` se aplica ANTES de desplegar el servidor nuevo: si no, `Persistence.save` falla a medias y se pierde dinero guardado a medias.

## 2026-11-03 · Campo de algodón, bar y recreativos

**Qué se hizo**
- `shared/src/economy.config.ts`: negocios `cotton_field` (productor de tela), `bar` y `arcade` (servicios) en el orden de la ventana de alquiler, y fachadas `saloon` y `arcade`.
- `shared/src/catalog.ts` y `economy.ts`: estructuras `cotton_bed`, `bar_tap` y `token_machine` como puestos de trabajo (`STATIONS`).
- `shared/src/travelers.ts`: frases de los viajeros al pagar en el bar y en los recreativos.
- Cliente: modelos de los tres puestos, iconos de neón (copo, jarra, joystick) y fachadas saloon y recreativos en `shop.ts`.
- `supabase/migrations/004_bar_arcade_cotton.sql`: amplía `lots_business_check`.
- `shared/src/businesses.test.ts`: 4 tests. README y CLAUDE.md actualizados.

**Decisiones**
- Bar y recreativos usan el camino genérico de servicios: no hizo falta tocar la simulación ni las ventanas.
- La migración `004` está pendiente de aplicar a mano por la usuaria (probar antes con `begin; ... rollback;`). Hay que aplicarla ANTES de desplegar el servidor nuevo: sin ella el guardado de locales falla a medias (se guarda el dinero, los inventarios y los muebles, pero no el mundo ni `next_id`). Con el servidor antiguo es segura.

## 2026-11-03 · Tela, fichas y recetas de materiales en el taller

**Qué se hizo**
- `shared/src/economy.config.ts`: materiales `fabric` (tela) y `tokens` (fichas), `MaterialRecipe`, `ECONOMY.materialRecipes` (fichas: 1 chapa, 15 s, 5 fichas), `RecipeId`, `MATERIAL_RECIPES` y `SUPPLIER_MATERIAL_IDS`. El proveedor ya no exige precio para todos los materiales.
- `shared/src/economy.ts`: `CraftJob` admite trabajos de material; `startCraft` acepta un `RecipeId` y `collectCrafted` reparte muebles al inventario y materiales al almacén del jugador.
- La acción `CRAFT` pasa de `defId` a `recipe` (reducer, `main.ts`).
- Cliente: colores de las dos fichas, el proveedor solo lista sus materiales, y el taller muestra las recetas de materiales, el nombre de cada trabajo y un botón "Recoger" genérico.
- `shared/src/workshop.test.ts`: 5 tests.

**Decisiones**
- Los trabajos de mueble conservan la forma `{ defId, readyAt }`: lo ya guardado en `lots.jobs` se sigue leyendo sin migración.
- La tela y las fichas no se compran en la gasolinera: la tela vendrá del campo de algodón y las fichas del taller.

## 2026-11-03 · Liberar los locales NPC de los mundos guardados

**Qué se hizo**
- `shared/src/economy.ts`: nueva `releaseNpcLots`, que devuelve a alquiler los locales de un NPC (reusa `closeLot`) y borra su inventario y su dinero. Si no hay ninguno, devuelve el mismo estado. También se reajusta el comentario de `openBusiness`.
- `server/src/persistence.ts`: `Persistence.load` la aplica tras fijar `saved`, así el primer guardado escribe los locales reseteados y borra sus muebles.
- `supabase/migrations/003_free_npc_lots.sql`: libera los locales NPC en la base y elimina la columna `next_restock_at`.
- 3 tests nuevos en `shared/src/economy.test.ts`.

**Decisiones**
- Se libera en el servidor al cargar y también hay migración: así funciona antes y después de aplicarla.
- La migración `003` está pendiente de aplicar a mano por la usuaria (probar antes con `begin; ... rollback;` en el SQL Editor).

## 2026-11-03 · Locales de Elmer y Rosa en alquiler desde el principio

**Qué se hizo**
- `shared/src/economy.ts` y `economy.config.ts`: fuera las tiendas NPC (`npcStores`, `npcRestock`, reposición, `Lot.nextRestockAt`) y sus ramas en nombre de escena, cobro de ventas y alquiler.
- `shared/src/world.ts`: el mundo inicial deja los 6 locales en alquiler.
- `server/src/persistence.ts`: ya no se lee ni se guarda `next_restock_at` (la columna sigue en la base con su valor por defecto).
- `shared/src/economy.test.ts` y script `npm test` (`node:test` con `tsx`, sin dependencias nuevas).
- `client/tsconfig.json` excluye los tests de `shared`: el cliente no tiene los tipos de Node.

**Decisiones**
- `isNpcId` se mantiene exportada: la siguiente tarea la usa para liberar los locales NPC de mundos ya guardados.
- Sin migración: la columna `next_restock_at` tiene valor por defecto, así que no hace falta tocar el esquema.

## 2026-11-03 · Girar un taburete con el avatar sentado congelaba el juego

**Qué se hizo**
- `client/src/sprites/furniture/bake.ts`: `getEmissiveSprite` pasa a ser `getPartSprite(defId, rotation, part, variant)`, que devuelve null si el mueble no tiene cajas de esa parte (respaldo o luces).
- `client/src/engine/renderer.ts`: el respaldo de un asiento girado hacia el fondo se repinta solo si existe.

**Decisiones**
- Al seleccionar un asiento el avatar se sienta. Si después se giraba un taburete (sin respaldo) hacia NW o NE, el renderer pedía hornear su respaldo con cero cajas: el tamaño salía NaN, `new Array(NaN)` lanzaba `RangeError` y el bucle de render se paraba. El juego parecía no dejar girar.
- Una sola función para respaldo y luces en vez de dos casi iguales.

## 2026-11-03 · La cantidad del proveedor se conserva tras comprar

**Qué se hizo**
- `client/src/ui/supplierWindow.ts`: las filas de materiales se crean una sola vez; al cambiar el dinero solo se actualizan los botones y la nota.

**Decisiones**
- Antes la ventana se reconstruía entera cada vez que cambiaba el dinero, así que tras cada compra los inputs volvían a 5. Construir el DOM una vez evita perder lo que escribe el jugador sin tener que guardar las cantidades aparte.
- Quitadas las comprobaciones `onStreet` que no podían fallar: la ventana ya se cierra fuera de la calle antes de llegar ahí.

## 2026-10-27 · Alquiler una vez al día

**Qué se hizo**
- `rent.periodSeconds` pasa de 120 s a 24 h (`shared/src/economy.config.ts`) y se actualiza el `README.md`.

**Decisiones**
- Cobrar cada 2 minutos era demasiado exigente: con pozo e invernadero salían unos $1.260 por hora.
- El tiempo de juego solo avanza con el servidor encendido: el "día" son 24 h de servidor en marcha, no de calendario.

**Pendiente**
- Con el alquiler casi simbólico sale mucho menos dinero: vigilar la inflación y, si hace falta, subir la cuota de cada negocio o la comisión de venta.
- Los locales ya alquilados pagan una vez más en la fecha que tenían guardada; desde ahí, una vez al día.

## 2026-10-27 · Fundido al cambiar de escena

**Qué se hizo**
- `client/index.html`: nueva capa `<div id="fade">` entre el canvas y la interfaz.
- `client/src/ui/styles.css`: estilo de `#fade` (fija, a pantalla completa, color `--outline`, transparente y sin capturar el ratón).
- `client/src/main.ts`: en `refreshUi()`, al cambiar de escena se anima la capa de opaca a transparente durante `SCENE_FADE_MS` (400 ms).

**Decisiones**
- Solo fundido de entrada: el servidor cambia de escena al instante al pisar la puerta, así que no hay tiempo para oscurecer antes.
- Web Animations API con `steps(4, end)` para un aspecto retro a saltos, sin clases ni keyframes en CSS.
- Color `--outline` y capa solo sobre el canvas, para que el HUD siga visible durante el fundido.
- No se reproduce con la primera escena al cargar ni con `prefers-reduced-motion`.

## 2026-10-27 · Servidor en Render

**Qué se hizo**
- El cliente de Vercel se compilaba sin `VITE_SERVER_URL` y funcionaba en modo local (nada se guardaba).
- Servidor desplegado en Render (`https://pixelsprings.onrender.com`, build `npm ci`, start `npm start -w server`); variables de Vercel actualizadas y redeploy.
- Arreglado `CLIENT_ORIGIN`, que tenía texto de más y rompía CORS ("xhr poll error").

**Decisiones**
- Render y no Vercel para el servidor: la simulación necesita un proceso permanente con el mundo en memoria; en Vercel las funciones no guardan estado y se apagan.

**Pendiente**
- El plan gratuito de Render se apaga tras 15 min sin conexiones: el pueblo se congela hasta que alguien entra.

## 2026-10-26 · Logo del juego

**Qué se hizo**
- Añadido el logo (`client/src/assets/pixel-springs-logo.png`) en tres sitios: pantalla de carga, login y arriba en el juego (sustituye a la marquesina de texto).
- Pantalla de carga nueva (`#splash`) escrita en `client/index.html`: cielo, franja de arena, logo y una línea de estado ("Cargando…", "Conectando…" o el error de conexión). `main.ts` la quita tras el primer render.
- El login se monta dentro de la pantalla de carga, debajo del logo: `showLoginScreen(parent)` y `connect(look, loginParent)` reciben el contenedor.
- Nuevo token `--sky` para el color del cielo, que estaba fijo en `body`.
- Comprobado: typecheck, build y capturas en Chrome sin interfaz (juego offline a 1280 y 390 px, login a 1280 y 1024 px).

**Decisiones**
- La pantalla de carga va en el HTML y `styles.css` se enlaza desde ahí: así se ve con estilo desde el primer instante, mientras el JS genera los sprites. Importada desde `main.ts`, no aparecería hasta que terminara esa carga.
- El logo se dibuja con suavizado normal: el PNG es de 1823 px y se ve a 160-520 px; con `pixelated` las letras saldrían dentadas.
- Mientras está el login, la línea de estado se oculta con `:has(.login)`, sin JS.

**Pendiente**
- En ventanas de menos de unos 1260 px de ancho, la cartera (arriba a la izquierda) tapa parte del logo. La marquesina de texto anterior ya se solapaba por debajo de unos 1350 px.
- El login con Supabase real no se ha probado de punta a punta (no hay `.env` en local); su maqueta sí.

## 2026-10-26 · Puesta en marcha

**Qué se hizo**
- Clonado el repo (`origin/master`, último commit `b3ece4c`) en la carpeta del proyecto, que ya tenía el `CLAUDE.md`.
- Actualizado el `CLAUDE.md` con el estado real del repo: fase 2, Supabase, versiones, mapa de carpetas, comandos con duraciones, fuentes, tokens, variables de entorno y formato de commit.
- Comprobado que `npm run typecheck` (~7 s) y `npm run build` (~10 s) pasan.
- Creado este diario.

**Decisiones**
- La base de datos es Supabase (Postgres), no SQLite como decía el `CLAUDE.md` original: es lo que ya está implementado en `server/src/persistence.ts` y `supabase/migrations/`.
- Todo se trabaja en `master`, sin ramas ni worktrees.
- Ficheros de ejemplo: `shared/src/pathfinding.ts` (lógica) y `client/src/ui/rentWindow.ts` (interfaz), porque siguen las convenciones del proyecto sin colores fijos ni números mágicos.
- Los cambios de `package-lock.json` tras `npm install` (quita campos `libc`) se descartan: vienen de otra versión de npm, no de cambios de dependencias.

**Pendiente**
- No hay linter, formateador ni tests.
- Los sprites de muebles usan colores hex fijos en vez de `PALETTE`.

