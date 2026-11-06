# Diario de trabajo

Una entrada por paso: fecha, qué se hizo, decisiones y por qué. Lo más reciente arriba.

## 2026-11-06 · Ventana del dueño para alquilar los locales del Ensanche

**Qué se hizo**
- `landlordWindow.ts`: ventana del dueño de un local construido. Sin condiciones, pone el local en alquiler; en alquiler y libre, guarda condiciones o lo retira; con inquilino, muestra sus datos, las condiciones sin editar, la cuenta atrás del mantenimiento y el nivel del local con "Mejorar".
- `rentWindow`: fianzas con `lotTerms`; en un local ajeno enseña al dueño, el alquiler al día y que la fianza no se devuelve; en uno propio añade "Ponerlo en alquiler". Se cierra si el local ajeno se retira o se suspende, o si el propio pasa a alquilarse.
- `businessWindow`: tres textos al cerrar (ayuntamiento, propio e inquilino); el inquilino ve el nivel sin botón de mejorar.
- `economyUi`: `levelSection` (nivel, coste y cuenta atrás de la obra) y `button`, extraídos de `businessWindow` para usarlos también en la ventana del dueño; `formatTicks` vuelve a dar `23 h 5 min` a partir de una hora.
- Navegación: `goToDoor` abre la ventana del dueño al entrar en un local propio que lleva otro; `openRent` elige entre ventana del dueño, de alquilar o aviso.
- Tablón y ventana de solar en venta explican las dos opciones; README con el Ensanche, `plots` y las nuevas salidas de dinero.

**Decisiones**
- Cantidades y porcentajes de los textos salen de `ECONOMY.plots`, no de números en el código.
- La ventana del dueño no se reconstruye por el dinero cuando hay campos: el estado de los botones y la cuenta atrás se actualizan en su sitio, para no borrar lo que se escribe. Con inquilino no hay campos, y ahí el dinero sí entra en la firma.
- El dueño mejora el local sin tener que estar dentro: paga él y el inquilino solo ve el nivel.
- `rentLot` deja el aviso de apertura ("Local alquilado" / "Negocio abierto") en lugar del toast del cliente: el toast salía aunque el servidor rechazara `RENT_LOT`, y el aviso solo existe si la acción se acepta.

**Pendiente**
- La prueba de guardar y cargar en una base real de pruebas sigue siendo obligatoria antes de producción, y ahora debe incluir la migración `012`.
- Los avisos no llegan a quien estaba desconectado: no se guardan y hay un tope global de 30; un dueño o inquilino ausente no sabe por qué cambió su dinero o perdió el local.
- RENT_LOT no lleva las condiciones vistas: si el dueño las cambia en ese instante se paga lo nuevo.
- Cerrar y volver a alquilar antes del primer cobro reinicia el alquiler.
- Al parar el servidor, `shutdown` no espera a un guardado en marcha: `save` vuelve al instante si ya está guardando y `process.exit` lo corta. Si cae entre el `delete` y el `insert` de un inventario, ese inventario se pierde. El fallo ya existía; hay que arreglarlo antes de reiniciar producción.

**Comprobado**
- `npm test` (145 pruebas), `npm run typecheck` y `npm run build` pasan.
- En Chrome sin interfaz, con dos jugadores, servidor local sin Supabase y un local ya construido: poner en alquiler, cambiar condiciones, retirar, alquilar, entrar como dueño, mejorar, ver la ventana del inquilino y cerrar sin devolución; ventana del dueño a 390 px. Sin errores en la consola.
- Sin probar en el navegador: la obra de construcción real, el botón de mejorar sin sitio para el puesto y el cobro al pasar 24 h (estos dos últimos, por tests o por lectura del código).

## 2026-11-05 · Revisión final antes de desplegar la fusión

**Qué se hizo**
- `Persistence.load` comprueba primero las columnas de la `010` y, si faltan, el servidor no arranca.
- La carga lee `lots`, `furniture`, `profiles` e `inventory_items` por páginas, con `fetchAllRows`, ordenadas por `id`, la clave primaria de las cuatro.
- Cabeceras de `010` y `011`: qué pasa sin la `010`, cómo aplicarlas con `lock_timeout` y `statement_timeout`, y qué comprobar antes de la `011`. Sin cambios en el SQL.
- Spec: la `010` no lleva las columnas de la fase 2, nuevo orden de despliegue, sección de vuelta atrás y "Guardar y cargar de verdad" como requisito.
- README: las mejoras de local piden materiales, el Ensanche y los solares, `lotLevels.upgrades`, `building` y todas las salidas de dinero, con las cifras de `economy.config.ts`.

**Decisiones**
- Un orden de migraciones equivocado tiene que ser un despliegue fallido: sin la `010`, el primer cambio de inventario borraba las filas del jugador y luego no podía insertarlas.
- Sin páginas, Supabase corta en `max_rows` (1000 por defecto) sin avisar, y el siguiente guardado reescribiría un inventario a partir de la lista cortada.
- Páginas de 500, no de 1000: si `max_rows` recortara una página, parecería la última y la carga se quedaría corta sin avisar.
- `load` recibe el cliente de Supabase con el real por defecto, para probar la negativa a arrancar con uno falso.
- Ordenar por `id` puede cambiar el orden del inventario tras reiniciar. Es solo visual: antes tampoco había un orden garantizado.
- La vuelta atrás también se cierra con muebles o materiales nuevos guardados, porque `5539996` no los conoce.

**Pendiente**
- "Guardar y cargar de verdad" en una base de pruebas, con `progress`, `gas_station` y `last_position` no vacíos. Es obligatorio antes de producción.
- Despliegue, en este orden:
  1. Copia de seguridad; anotar el dinero total y los tipos de negocio abiertos.
  2. Probar `010` con `rollback`, con `lock_timeout` y `statement_timeout`.
  3. Aplicar `010`.
  4. Con nadie conectado: desactivar el despliegue automático de Render y Vercel; suspender el servidor o confirmar que la instancia antigua ha terminado; desplegar el servidor y después el cliente; con el cliente publicado, reiniciar el servidor una vez más.
  5. Revisar el log y lo anotado; probar con una cuenta real recoger y colocar un mueble, comprar algo, reiniciar y comprobar.
  6. Con nadie conectado: volver a comprobar `lots` y que el servidor anterior está parado; probar y aplicar `011`.
- Vuelta atrás: al servidor `5539996` solo mientras no se hayan guardado prendas, negocios nuevos, ni muebles o materiales que no conoce, y sin la `011`. Después, solo restaurando la copia de seguridad.

## 2026-11-05 · Documentación de la fusión y plan de la fase 1

**Qué se hizo**
- README: rangos y XP, niveles de local, vecinos vendedores y taller público; la economía enlaza `levels`, `upgrades` y `vendors`. Sin solares de casero.
- Se guardan la spec (`2026-11-05-fusion-y-solares-design.md`) y el plan de la fase 1.

**Decisiones de la fusión (resumen)**
- Talleres públicos: solo muebles. Los materiales no dan XP de fabricación.
- La tienda de ropa nunca es pública; tiene cola y bancos por nivel.
- El proveedor conserva sus 5 materiales: la tela y las fichas no se venden allí.

**Pendiente**
- Fase 2: rehacer los solares de casero sobre el Ensanche.
- Despliegue: el orden y la vuelta atrás están en la entrada de la revisión final, arriba.
- Antes de cualquier `npm run dev`, confirmar que `server/.env` no apunta a producción.
- Las migraciones y el `push` los confirma la usuaria; nada de esto se ha tocado.

## 2026-11-05 · Los negocios nuevos con logo, decoración y niveles

**Qué se hizo**
- Bar, recreativos, campo de algodón y tienda de ropa: logos de neón redibujados y tres muebles de decoración cada uno (40, 90 y 160 $, niveles 1, 2 y 3, como los demás negocios).
- Las máquinas de más de la tienda de ropa pasan a la pared de la puerta, (0,3) y (0,6): en (1,3) le quitaban un hueco de exposición.
- Tests del plano de todos los negocios a cada nivel: puestos sin pisar puerta, huecos ni otros puestos, y todo accesible con la tienda llena.

**Decisiones**
- Los costes de mejora y la XP de abrir son comunes a todos los negocios, así que los nuevos usan los mismos y `levels.ts` no cambia.
- La decoración no tiene sitio fijo: la coloca el dueño, y `canPlaceFurni` impide ponerla sobre la puerta o un puesto.

## 2026-11-05 · Migraciones de la fusión

**Qué se hizo**
- `010`: negocios nuevos, prendas en `inventory_items` y `furniture.garment`. Solo amplía.
- `011`: limpieza de los locales NPC y fuera `next_restock_at`.
- `worldFromRows` y `furnitureChanges`, extraídas de `Persistence`, y `server/src/persistence.test.ts`. `npm test` incluye ya los tests de `server`.
- Comprobado con PGlite (fuera del repo) y filas inventadas con la forma de producción: la cadena 001 a 011 y el `Persistence` real del servidor en producción (`5539996`) y del nuevo.

**Decisiones**
- Orden de despliegue: `010`, servidor nuevo, comprobar el log, `011`. El servidor en producción carga y guarda con la `010`, pero no puede guardar locales tras la `011`, porque aún escribe `next_restock_at`.
- Tras guardar un negocio nuevo no se puede volver a ese servidor: su carga falla con un negocio que no conoce.
- `Persistence.load` fija `saved` antes de liberar los locales NPC: así el primer guardado borra sus muebles.

**Pendiente**
- Aplicar las migraciones en producción; aquí no se ha tocado ninguna base de datos real.

## 2026-11-05 · Fusión de los dos ordenadores

**Qué se hizo**
- Merge de `origin/master` en `master`: entran subvención, gasolinera, rangos, plazas, Ensanche, niveles de local, vecinos vendedores, mejoras móviles, logos y decoración por negocio. Se quedan bar, recreativos, algodón, tienda de ropa, muebles y materiales nuevos y los locales de Elmer y Rosa en alquiler.
- Plano de `world.ts` de `origin/master`. Fuera `setupNpcStores`; `releaseNpcLots` sigue al cargar.
- Fuera `supplierWindow.ts` (el proveedor está en el mostrador de la gasolinera) y las migraciones locales `003`, `004` y `005`, que se reescriben como `010` y `011`.
- Tests nuevos en `shared/src/merge.test.ts`.

**Decisiones**
- En un taller público los demás solo fabrican muebles: la comisión se calcula sobre el valor del mueble y los materiales no tienen valor de referencia. Los materiales siguen siendo solo del dueño.
- La tienda de ropa no se puede abrir a otros, pero sigue la regla de bancos y cola por nivel del taller.
- Recoger materiales fabricados no da XP (`craft` es por mueble); las prendas sí.
- El proveedor solo trata los materiales que vende, también al comprarte y en la oferta del día: la tela y las fichas no entran.
- `normalizeLook` sustituye a `isValidLook` y admite `premium`: un solo sitio para validar colores, sombrero y prendas. El sombrero del rango y las prendas conviven.
- Cerrar un local devuelve cada trabajo de la cola a quien lo encargó, también materiales y prendas.
- Los negocios nuevos llevan lo mínimo por nivel y logo; sin decoración propia todavía.
- La cantidad escrita en el proveedor se conserva al comprar y vender, también en la ventana de la gasolinera: el arreglo se perdió al borrar `supplierWindow.ts` y se recupera en `gasWindow.ts`.

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

## 2026-11-01 · Decoración propia de cada negocio

**Qué se hizo**
- Cada tipo de negocio tiene 3 muebles propios (`ECONOMY.businessDecor`): uno de $40 desde el nivel 1, uno de $90 desde el nivel 2 y uno de $160 desde el nivel 3 del local.
  - Chatarrería: bidón de aceite, motor viejo, robot de chatarra.
  - Pozo: cubo de agua, bomba de mano, molino de viento.
  - Invernadero: sacos de semillas, jardinera de flores, espantapájaros.
  - Taller: caja de herramientas, caballete (sentable), panel de herramientas.
  - Tienda: caja registradora, pila de regalos, maniquí.
  - Diner: pizarra del menú, vitrina de tartas, hamburguesa de neón.
  - Peluquería: poste de barbero, espejo de pie, secador de casco (sentable).
  - Frutería: caja de naranjas, montón de sandías, báscula antigua.
- **Cómo se compran:** solo el dueño de ese tipo de negocio, desde la sección "Decoración del negocio" de su ventana (acción `BUY_DECOR`, `buyBusinessDecor` en `economy.ts`). Los de más nivel salen bloqueados con el nivel que piden.
- **Después de comprar:** van al inventario y se colocan como cualquier mueble, en el local o en la caravana.
- Son exclusivos: no se fabrican, no se venden en las tiendas y Hank no los pide.
- Modelos en `client/src/sprites/furniture/businessDecor.ts`.
- Comprobado con un script (compra, bloqueo por nivel, por negocio y por no ser el dueño) y en Chrome (los 24 dibujos, y comprar y colocar el poste de barbero).

**Decisiones**
- Son solo decoración, sin efecto en las ventas. El dinero que se paga sale de la economía.
- No hace falta migración.

## 2026-11-01 · Niveles de los locales

**Qué se hizo**
- Los locales tienen nivel 1, 2 o 3 (`ECONOMY.lotLevels`, `upgradeLot` en `shared/src/economy.ts`, acción `UPGRADE_LOT`).
- **Cuánto cuesta mejorar:** nivel 2 por $250 + 10 chapa + 10 madera (2 min de obras). Nivel 3 por $600 + 25 chapa + 25 madera + 10 neumáticos (5 min).
- **Obras:** el negocio sigue abierto mientras duran. Al acabar (`finishUpgrades`) aparece el puesto nuevo, el dueño recibe 40 XP y un aviso.
- **Qué da cada nivel:**
  - Servicios: un puesto más (otro sillón, plancha o puesto de fruta). Cada puesto atiende a un viajero durante 12 s; si están todos ocupados, el viajero espera turno (`serviceTurn`, `freeStation` en `travelers.ts`) y, si tarda mucho, se va sin pagar.
  - Productores: otro montón, pozo o bancal; producen y almacenan el doble o el triple.
  - Taller: otro banco. Fabrica varios muebles a la vez y cabe uno más en la cola.
  - Tienda: 2 huecos de venta más por nivel (hay 4 huecos de exposición nuevos).
- **Más viajeros:** cada negocio cuenta tanto como su nivel en la probabilidad de que pare un coche, los coches y el autobús eligen antes los locales de más nivel (`pickStoreDoor`) y caben más viajeros a la vez.
- **Puestos:** van en `station:<local>:<n>`; si un mueble tapa el sitio, se usa el siguiente libre.
- **Cómo se ve:** el cartel de la fachada lleva una estrella dorada por nivel. La ventana del negocio tiene una sección "Nivel del local" con lo que da el siguiente nivel, lo que cuesta y la cuenta atrás de las obras.
- **Al cerrar:** un local alquilado vuelve al nivel 1. Uno construido en un solar conserva su nivel.
- Migración `009_lot_levels.sql`: columnas `level` y `upgrade_ready_at` en `lots`.
- **Comprobado:**
  - Con una simulación: subir a 2 y a 3, puestos nuevos, no pasa de 3, taller con dos bancos a la vez, producción triple, vuelta a nivel 1 al cerrar y cola con un autobús.
  - En 2 h de simulación, la peluquería gana unos $1.270 a nivel 1, $2.600 a nivel 2 y $4.100 a nivel 3. En esa prueba es el único negocio de jugador abierto: en un pueblo con más negocios la ganancia de cada nivel será menor.
  - En Chrome: peluquería con tres sillones, estrellas en la fachada y la sección de nivel en un diner nuevo.

**Decisiones**
- Se gana más sobre todo porque atrae a más gente. La cola solo se nota cuando llegan varios viajeros a la vez (el autobús), porque normalmente no coinciden.

## 2026-11-01 · Exclusivos que venden los vecinos

**Qué se hizo**
- Seis muebles exclusivos nuevos, que solo venden los vecinos (`ECONOMY.vendors`, `shared/src/vendors.ts`):
  - Dolores: flamenco rosa ($150) y lámpara de lava ($240).
  - Abuelo Tito: rueda de carreta ($180) y surtidor antiguo ($360).
  - Nina: cactus de neón ($220) y televisor retro ($280).
- Como los exclusivos de rango, no se fabrican, no se venden en las tiendas y Hank no los pide.
- Al tocar a un vecino que vende, andas a su lado y se abre su ventana (`ui/vendorWindow.ts`). Solo se compra a 2 baldosas o menos (`BUY_FROM_VENDOR`); el dinero sale de la economía.
- Mientras tienen un jugador al lado, los vecinos se quedan quietos atendiéndole. Llevan un cartel rosa: "Nombre · Vende exclusivos".
- El renderer registra a los vecinos vendedores como algo que se puede tocar (`PickTarget` 'vendor').
- Modelos en `client/src/sprites/furniture/vendorItems.ts`.
- Comprobado con un script (lejos no compra, sin dinero no compra, no vende lo de otro vecino, se queda quieto) y en Chrome (tocar a Nina, comprar el televisor, aviso y "¡Gracias!").

**Decisiones**
- No hace falta migración: el inventario guarda `def_id` como texto.

## 2026-11-01 · Andar el doble de rápido

**Qué se hizo**
- Los avatares andan 2 baldosas por tick (`WALK_STEPS_PER_TICK` en `shared/src/constants.ts`): unas 5 baldosas por segundo en vez de 2,5. Esto vale para todos, también los vecinos y los viajeros.
- El cliente (`client/src/game/avatarViews.ts`) anima el paso baldosa a baldosa. Saca las baldosas por las que ha pasado el avatar de su camino anterior y las recorre a la misma velocidad, así que no corta esquinas aunque entre dos estados haya avanzado dos.
- Comprobado con un script a 60 fps sobre un camino con giros: avanza como mucho 0,08 baldosas por fotograma y no se sale del camino en ningún momento.

**Decisiones**
- No se ha acortado el tick (400 ms). Los tiempos guardados (alquiler, obras, fabricación, subvención, día de la XP...) están en ticks, y cambiar su duración los habría descuadrado todos.

## 2026-11-01 · Avenida de las Plazas y mapa del pueblo

**Qué se hizo**
- Las plazas grandes (27x27, con parcelas arriba y a la izquierda) pasan a ser la **Avenida de las Plazas**. Es una copia de la Calle Mayor 14 filas más abajo: edificios en y = 14-17, acera con las puertas en y = 18 y carretera en y = 21-23. Las parcelas van una al lado de otra (`homeLayout`, 11 baldosas cada una).
- Cada 4 parcelas forman una plaza, con su nombre y una plaza pequeña con fuente, bancos y farolas enfrente, al otro lado de la carretera (y = 24-31). El mapa pasa de 41 a 32 filas de fondo.
- Por la izquierda (x = 0-2), una carretera baja de la Calle Mayor a la avenida. El cartel de bienvenida y un cactus se apartan para dejarle sitio.
- Los coches que van a una tienda de la avenida aparcan en su carretera (`laneFor`: tres filas por debajo de la puerta), y el viajero se baja en su bordillo. Antes aparcaban en la Calle Mayor y cruzaban a pie.
- Al volver a entrar, si en tu última posición ahora hay un edificio (porque las parcelas se han movido), entras por tu caravana.
- El cartel de dónde estás dice el nombre de la plaza, o "Avenida de las Plazas".
- **Mapa del pueblo** (botón "Mapa", `ui/mapWindow.ts`): todo el pueblo visto desde arriba. Los locales salen del color de su neón (grises cerrados, amarillos en obras), y tu caravana y tus locales van recuadrados en rosa. Hay un punto por persona (tú en rosa), los coches y los nombres de las zonas. Si tocas un sitio vas andando hasta allí; si tocas un edificio, hasta su puerta y entras (`controller.walkTo`).
- Comprobado: plano en texto con 6 jugadores; simulación (los coches aparcan en la avenida y el diner de la avenida cobra); en Chrome, la avenida, la plaza y el mapa (tocar el diner en el mapa te lleva dentro).

**Decisiones**
- Las parcelas existentes se recolocan solas, porque su posición sale de `home_slot`: no hace falta migración.

## 2026-11-01 · Construir locales: el Ensanche

**Qué se hizo**
- La Calle Mayor sigue pasada la gasolinera por **el Ensanche**: solares en venta (`solar`, 4x4, con su cartel de "SE VENDE"). Siempre hay `ECONOMY.building.freeSolares` (2) libres; al construir en uno, aparece otro al final y la calle se alarga (`ensureSolares` en `shared/src/world.ts`).
- Construir (`BUILD_LOT`, `buildLot`): $300 + 20 de chapa + 20 de madera vieja, 60 XP, sin nivel mínimo. La obra dura 3 minutos (edificio en obras, variante `construction`, con andamio y cartel de OBRAS). Al acabar (`finishConstructions` en el tick), el dueño recibe un aviso y el local aparece cerrado.
- El local es de quien lo construye (`Lot.builtBy`, `readyAt`): abrir un negocio en él no cuesta fianza, no paga alquiler, no se pierde por no venir y, si cierra el negocio, sigue siendo suyo (`closeLot` lo conserva). Solo él puede abrirlo.
- Interfaz: ventana del solar (`ui/buildWindow.ts`) con lo que tienes y lo que hace falta. La ventana de alquiler, en tu local construido, dice "Tu local" y "Abrir". Si tocas un local en obras o un local ajeno cerrado, sale un aviso. El tablón tiene una sección de solares, y el cartel de dónde estás dice "El Ensanche".
- Persistencia: columnas `built_by` y `ready_at` en `lots` (migración 008). Al cargar el mundo, `addBuiltLot` vuelve a poner el edificio, la puerta y el interior de cada local construido.
- Comprobado: script (sin materiales no deja, cobra, abre otro solar, en obras no se abre, al acabar avisa, otro no puede abrirlo, el dueño abre gratis, no paga alquiler, al cerrar sigue siendo suyo) y en Chrome (solares, obra, ventana).

**Decisiones**
- Los solares van al final de la Calle Mayor, no en las plazas: allí no caben más edificios mirando a la cámara, y la calle ya tenía acera y carretera para alargarse.
- Ids `lot-e1`, `lot-e2`... ("Ensanche 1", "Ensanche 2"...), para no chocar con los locales de las parcelas (`lot7`, `lot8`...).

## 2026-11-01 · Logos de neón y fachadas más altas

**Qué se hizo**
- Cada negocio tiene su logo de neón en píxeles (`client/src/sprites/structures/shopLogos.ts`): chatarrería (neumático y llave), pozo (pozo y gota), invernadero (brote y sol), taller (martillo y serrucho), tienda (bolsa con $), diner (hamburguesa y café), peluquería (tijeras y poste) y frutería (manzana y zanahoria). Sustituyen a los iconos pequeños de antes.
- El cartel abierto es oscuro (`SIGN_DARK`), así el neón resalta.
- La fachada falsa sube de 66 a 82 px y el cartel ocupa casi todo su ancho. Los logos se dibujan al doble (`LOGO.scale = 2`) para que se lean desde la calle. La placa del dueño, la puerta y los escaparates no cambian.
- Comprobado en Chrome con los modelos reales de los 8 negocios.

**Decisiones**
- La primera versión del taller parecía "Th" y el $ parecía una S; se redibujaron. Con el cartel pequeño se veía todo diminuto, y a propuesta suya se hizo el edificio más alto (además es muy del Oeste).

## 2026-11-01 · Mensajes más tiempo en pantalla

**Qué se hizo**
- Bocadillos del chat: de 7 a 12 s (`LIFETIME_MS` en `client/src/ui/chatBubbles.ts`).
- Avisos (`client/src/ui/toast.ts`): de 2,5 s fijos a 60 ms por letra, entre 4 y 9 s, para que dé tiempo a leer los largos (subidas de nivel, encargos...).

## 2026-11-01 · Talleres públicos

**Qué se hizo**
- Cualquiera puede fabricar en el taller de otro jugador si este es **público**: usa sus propios materiales y paga al dueño un 7 % del valor de referencia de cada mueble (`workshopFee`, `ECONOMY.workshop.feeRate`; como poco $1, unos $5 de media: neumático $1, jukebox $11). El dueño recibe un aviso.
- El dueño decide si su taller es público o privado (`SET_WORKSHOP_PUBLIC`; `lot.price` = 1 público, 0 privado). Los talleres nuevos empiezan públicos.
- La cola es compartida, pero cada mueble recuerda quién lo encargó (`CraftJob.by` / `byName`): cada uno recoge los suyos (`collectCrafted`), el dueño ve "· de Bea" en su cola, y si el taller cierra (`closeLot`: lo cierra el dueño, no paga o lo abandona), cada mueble vuelve a quien lo encargó (hecho, al inventario; a medias, sus materiales).
- Ventana del negocio en "modo cliente" para un taller ajeno público (solo tus encargos y "Fabricar · $X"); privado: aviso al tocar el banco. El tablón dice qué talleres están abiertos.
- Comprobado: script (precios, cola compartida, cobro y aviso, cada uno recoge lo suyo, privado no deja, al cerrar Bea recupera sus materiales y Ana su neumático) y en Chrome (ventana de cliente en el taller de Bea).

**Decisiones**
- Precio proporcional al valor del mueble (lo pidió así): fabricar algo caro cuesta más. Primera versión con precio fijo puesto por el dueño, descartada.
- Lo que se paga entre jugadores no da XP (como siempre); quien fabrica sí gana la XP de fabricar al recoger.

## 2026-11-01 · Sin límite de locales

**Qué se hizo**
- Fuera el máximo de locales por jugador (`maxLotsPerPlayer`, `extraLots`, `maxLotsOf`, `lotsOwnedBy`) y el aviso de la ventana de alquiler. El rango Comerciante vuelve a dar solo la subvención de $45.
- Comprobado con un script: con $500 se alquilan 3 pozos y luego una tienda.

**Decisiones**
- El límite lo pone el dinero: cada local cuesta su fianza y un alquiler diario, y si no se gana lo bastante se pierde. Además, cada jugador nuevo trae su propio local. Se mantiene la liberación de locales abandonados (7 días).

## 2026-11-01 · Cerrar un negocio y abrir otro

**Qué se hizo**
- Acción `CLOSE_BUSINESS` y `closeBusiness` (`shared/src/economy.ts`): el dueño cierra su negocio y el local vuelve a estar en alquiler. Recupera los muebles de dentro (también los que tenía a la venta), los materiales del almacén, los muebles ya fabricados y los materiales de los que estaban a medias, y la mitad de la fianza (`ECONOMY.rent.closeRefund`).
- Botón rojo "Cerrar el negocio" al final de la ventana del negocio, con confirmación de un segundo toque en 4 s. La confirmación vive fuera del botón: la ventana se reconstruye a menudo (al producir, al cambiar la fachada...).
- Al quedar libre el local, se abre sola su ventana de alquiler para elegir otro negocio.
- La XP de abrir un negocio (+30) solo cuenta la primera vez de cada tipo (`progress.opened`, `addOpenBusinessXp`): así cerrar y abrir no da experiencia gratis.
- Comprobado: script (taller con un mueble hecho y otro a medias; reembolso de $60; tienda con un producto a la venta; XP solo la primera vez; no se puede cerrar un local ajeno) y en Chrome (botón, confirmación que aguanta una reconstrucción de la ventana, cierre y ventana de alquiler abierta sola).

**Decisiones**
- Media fianza y no entera: abrir y cerrar a menudo tiene un coste.
- Primera versión con la confirmación guardada en el propio botón: si la ventana se reconstruía entre los dos toques, el segundo volvía a pedir confirmación.

## 2026-11-01 · Esperar a que despierte el servidor

**Qué se hizo**
- `SocketTransport.connect` (`client/src/game/socketTransport.ts`) ya no se rinde al primer error: cada intento espera hasta 30 s, Socket.IO reintenta solo y solo se abandona a los 3 minutos (`CONNECT_GIVE_UP_MS`). Si el servidor rechaza la sesión ("Sesión no válida"), se abandona enseguida como antes.
- `connection.ts`: nada más arrancar se hace un `fetch` al servidor para despertarlo mientras se inicia sesión.
- Comprobado en Chrome: apuntando a un puerto sin servidor, a los 40 s seguía esperando (antes, "timeout" a los 20 s); al arrancar un servidor local ahí, se conectó solo.
- Borradas en Supabase las cuentas de prueba (246810, Prueba1 y una de hoy), con sus perfiles, inventarios y muebles; el Local 3 de Prueba1 vuelve a estar en alquiler. Solo queda JukeBoxCeci.

**Decisiones**
- 3 minutos de margen: el plan gratuito de Render a veces tarda más de un minuto en despertar.

## 2026-10-31 · Todo el pueblo en un mapa

**Qué se hizo**
- Las plazas dejan de ser escenas aparte: son zonas de la escena de la calle, al otro lado de la carretera (desde y = 14), una al lado de otra desde x = 2 (`plazaOrigin`, `plazaAt` en `shared/src/world.ts`). Al abrir una, el mapa se alarga hacia abajo (hasta 41) y se ensancha si hace falta; la carretera sigue hasta el final.
- `streetGround(width, plazas)` pinta las losas y el barro de cada plaza abierta sobre la arena. Decoración, parcelas y puertas, igual que antes pero con las coordenadas desplazadas a su plaza.
- Fuera los pasos entre escenas, las señales y los nombres de escena de las plazas; `createTrailer` vuelve a no necesitar la escena de fuera. El cartel de dónde estás dice el nombre de la plaza (`areaNameAt`).
- Viajeros: aparcan frente a la puerta de la tienda, también si está en una plaza (cruzan la carretera a pie).
- Comprobado: script (6 jugadores: mapa de 56x41 con dos plazas y ninguna escena aparte, zonas bien detectadas, camino andando de la calle a la plaza, un viajero que compra en el diner de la plaza) y en Chrome (calle y plaza en la misma vista, cartel "Plaza del Pueblo").

**Decisiones**
- Un solo mapa: se ve a la gente de la calle desde la plaza y al revés, sin pantallas de cambio. Sustituye a la versión de plazas en escenas aparte (sin migración: todo sale de `homes`).

## 2026-10-31 · Plazas

**Qué se hizo**
- Las parcelas nuevas ya no alargan la calle: van a **plazas** (`ensurePlaza` y `PLAZA_HOMES` en `shared/src/world.ts`). Cada plaza es una escena exterior de 27x27 con losas, barro cocido alrededor de una **fuente** central, 4 **bancos** (se puede sentar), farolas y cactus. Tiene 4 parcelas (caravana y local): dos arriba (rotación 1) y dos a la izquierda (rotación 0), los lados que la cámara ve de frente.
- La Calle Mayor vuelve a medir 44 y, al final (43, 5), tiene el paso a la Plaza del Pueblo, con una señal. Cada plaza tiene su entrada a la derecha y, cuando se abre la siguiente, una salida al sur. Nombres: Plaza del Pueblo, del Cactus, del Pozo...
- La parcela 0 sigue siendo la caravana del principio de la calle. Los números de local no cambian (el 7 es el de la parcela 1, etc.), así que los locales guardados se mudan solos a su plaza. Puertas renombradas a `door-lotN` y `door-trailer:<id>`.
- Viajeros: van a las tiendas de las plazas (`nextDoorToward` en `movement.ts` busca la siguiente puerta del camino entre escenas): aparcan en la calle (x = 34), cruzan a la plaza y vuelven igual. Paciencia de 20 a 30 decisiones.
- Los coches solo se dibujan en la Calle Mayor. La placa con el nombre del dueño en la fachada pasa a `furniLabels.ts` (funciona en cualquier rotación) y los carteles de las caravanas se ven en cualquier exterior.
- Al volver a entrar, si la posición guardada queda fuera de la escena (el pueblo ha cambiado), entra por la normal.
- Comprobado: script (plazas que se abren con el 2.º y el 6.º jugador, caravanas y locales en su sitio, puertas de vuelta, rutas, un viajero que compra en un diner de la plaza) y en Chrome (plaza con fuente, bancos, cuatro caravanas, locales con su nombre; sentarse en un banco; un viajero cruzando a la plaza).

**Decisiones**
- Plazas en vez de una calle infinita: con la cámara isométrica solo se ven bien dos lados, y una plaza da un punto de encuentro.
- Las plazas, su decoración y las parcelas se generan a partir de `homes`: no hace falta migración.

## 2026-10-31 · La calle crece con el pueblo

**Qué se hizo**
- Cada jugador tiene una **parcela** (`GameState.homes`, `addHome` en `shared/src/world.ts`): su caravana en la calle, con su propia puerta a su caravana por dentro. El primero ocupa la caravana del principio (x = 1); los siguientes, bloques de 11 baldosas pasada la gasolinera, con un **local nuevo** cada uno (7, 8...), una farola y un cactus. La calle se alarga.
- Las caravanas ya no comparten puerta (antes el alias 'trailer' llevaba a cada uno a la suya): ahora **se puede visitar la caravana de otro** (solo su dueño decora).
- Cartelito de madera con el nombre del dueño encima de cada caravana (`ui/lotSigns.ts`).
- **Máximo de locales**: 1 por jugador, 2 desde Comerciante (`ECONOMY.rent.maxLotsPerPlayer` + `extraLots`). La ventana de alquiler explica por qué no deja.
- **Locales abandonados**: si el dueño no entra en 7 días de pueblo en marcha (`abandonSeconds`), el local se libera como al no pagar (`releaseAbandonedLots`). Se usa `progress.lastSeen`, que se apunta al entrar y al salir.
- Guardado: `profiles.home_slot` (migración `007_home_slot.sql`, aplicada en Supabase y comprobada). Al cargar, las parcelas se ponen antes que los locales; quien no tiene parcela recibe la siguiente por antigüedad.
- Comprobado: script (3 jugadores: parcelas 0/1/2, calle de 44 a 66, locales 7 y 8, visitar la caravana de otro, máximo 1 local y 2 con Comerciante, liberación tras 7 días) y en Chrome (calle alargada con las caravanas de Bea y Cris y sus carteles).

**Decisiones**
- Rosa y Elmer no ceden su local: cada jugador nuevo ya trae uno, así que no hacía falta.
- La parcela es de por vida aunque el jugador deje de entrar (solo se libera su local).

## 2026-10-31 · Niveles y rangos (parte 2): recompensas exclusivas

**Qué se hizo**
- Muebles **exclusivos** (`ExclusiveId` y `FurniDef.exclusive` en `catalog.ts`): se colocan como cualquier mueble, pero no se fabrican, no se venden y Hank no los pide (fuera de `DECOR_IDS`; `listItem` los rechaza).
- Nivel 4 (Tendero): **cartel de neón con tu nombre** (`name_sign`). Al colocarlo, su `variant` guarda el nombre de quien lo coloca, y `ui/furniLabels.ts` lo escribe en neón sobre el panel.
- Nivel 7 (Cowboy del asfalto): **sombrero de vaquero** (`AvatarLook.hat`, sprite en `sprites/hat.ts`) y **colores especiales** (`PREMIUM_LOOK_COLORS`), con candado en el editor hasta tener el rango. `SET_LOOK` los valida con el rango y `JOIN` los quita si no se tiene (`sanitizeLook`).
- Nivel 9 (Leyenda de la Ruta): **jukebox dorada** (`golden_jukebox`).
- Nivel 10 (Alcalde): el nombre pasa a `GameState.mayors` y aparece la **estatua del alcalde** en el desierto (16, 11), con los nombres en su placa. Se guarda en `world.gas.mayors` (sin migración) y la estatua se pone al cargar (`withStatue`).
- `furniLabels.ts` es general: gira el plano del texto con el mueble (como `bake.ts`) y lo encaja con una matriz CSS del tamaño real del panel, así las letras no se deforman.
- Comprobado: script (nivel 1 sin aspecto especial; nivel 4 con cartel y nombre al colocarlo; nivel 7 con sombrero y colores; nivel 10 con jukebox, alcalde y estatua; aspecto especial limpiado al entrar sin rango; exclusivos fuera de `DECOR_IDS`) y en Chrome (cartel con "Tú" en neón, jukebox dorada, sombrero, estatua con "Alcalde Tú" y editor con candados).

**Decisiones**
- El cartel lleva el nombre de quien lo coloca (no hace falta guardar nada nuevo: va en la `variant` del mueble).
- Una sola estatua para todos los alcaldes, con todos los nombres en la placa.
- Primera versión del texto del cartel con caja fija de 120x30: las letras salían estiradas; ahora la caja mide lo que el panel.

## 2026-10-31 · Niveles y rangos (parte 1)

**Qué se hizo**
- `shared/src/levels.ts` y `ECONOMY.levels`: experiencia (XP) y 10 rangos del oeste, de Forastero (0 XP) a Alcalde de Pixel Springs (8.000 XP).
- XP por: ventas y servicios a viajeros (+1 cada $10), recoger muebles fabricados (+5), recoger de un productor (+2), encargos de Hank (+25), turnos (+10), abrir negocio (+30) y entrar cada día (+5).
- Recompensas al subir: dinero y muebles (nivel 2: $50 y un cactus). Ventajas que se suman: +1 cola del taller (Vecino), subvención de $45 (Comerciante), +2 huecos en la tienda (Empresario, con 2 sitios de exposición nuevos) y 10 % de descuento con Hank (Magnate). Las de los niveles 4, 7, 9 y 10 se enseñan como "próximamente".
- Al subir: aviso con la recompensa, aviso a los demás jugadores conectados y celebración con chispas y "¡NIVEL N! Rango" sobre el avatar (`ui/levelUp.ts`), que ve todo el que esté en la escena.
- Interfaz: rango y barra de XP en la cartera (al tocarlo se abre "Mi rango", `ui/rankWindow.ts`), insignia de nivel (bronce, plata, oro, neón) junto a cada nombre y "Vecinos de más rango" en el tablón.
- Guardado: `profiles.progress` (XP, último día con XP diaria y nombre), migración `006_progress.sql` (aplicada en Supabase y comprobada). `dayIndex` pasa a `economy.ts`.
- Comprobado: script (XP diaria una vez al día, subida con dinero y cactus, varios rangos de golpe con las ventajas sumadas, descuento de Hank, subvención de $45, XP por ventas del diner) y en Chrome (subida a nivel 2, cartera, ventana "Mi rango" y chispas).

**Decisiones**
- La XP solo sale del "exterior" (viajeros, fabricar, Hank...), nunca de comprar o vender entre jugadores: así no se sube con dos cuentas.
- Los NPC (Rosa, Elmer) no tienen rango ni ventajas.

**Pendiente**
- Parte 2: cartel de neón con tu nombre, sombrero y colores nuevos, jukebox dorada y estatua del alcalde.

## 2026-10-31 · Fachada plegable

**Qué se hizo**
- En la ventana del negocio, la fachada empieza plegada: una línea "Fachada: Clásica" con el botón **Cambiar**, que despliega la vista previa y las plantillas (y pasa a **Ocultar**). `client/src/ui/businessWindow.ts`.
- Se recuerda mientras la ventana sigue abierta (aunque se reconstruya); al volver a abrirla, plegada otra vez.
- Comprobado en Chrome (offline) con un taller: plegada en una línea y desplegada con vista previa y plantillas.

**Decisiones**
- Plegada por defecto: en el móvil la vista previa ocupaba media pantalla y casi nunca hace falta.

## 2026-10-31 · Icono para la pantalla de inicio del móvil

**Qué se hizo**
- App instalable (PWA): `client/public/manifest.webmanifest` con nombre, colores del cielo y `display_override: fullscreen` (al abrirla desde el icono no hay barra del navegador).
- Iconos en `client/public/icons/`: 192 y 512 (logo grande apoyado en el horizonte de arena), 512 "maskable" para Android (logo centrado dentro del círculo del 80 %), 180 para iPhone y favicon de 32.
- `client/index.html`: enlaces al manifiesto, `apple-touch-icon`, favicon, `theme-color` y etiquetas `apple-mobile-web-app-*`.
- Comprobado: build (manifiesto válido e iconos copiados a `dist`) y los iconos vistos uno a uno.

**Decisiones**
- Iconos generados a partir del logo con sharp desde un script fuera del repo (fondo: cielo `--sky`, arena `--sand` y línea `--outline`, como la pantalla de carga). Para regenerarlos: quitar al logo su margen transparente (`trim`) y componerlo sobre ese fondo al 96 % del ancho, con su base en el horizonte (80 % y centrado en el maskable).
- Sin service worker: el juego necesita conexión al servidor, y Chrome ya permite instalar sin él.

**Pendiente**
- Probar "Añadir a pantalla de inicio" en un iPhone y un Android de verdad.

## 2026-10-31 · Números legibles

**Qué se hizo**
- En Pixelify Sans el 5 es igual que la S ("$ 1S", "Te quedan S boletos"). Ahora las cifras salen de VT323: `@font-face` "Pixel Digits" con `unicode-range: U+0030-0039` y `size-adjust: 125%`, delante en `--font-text` (`client/src/ui/styles.css`).
- Fuente en `client/src/assets/fonts/vt323-latin.woff2` (sacada del paquete npm `@fontsource/vt323@5.1.0`) con su licencia OFL al lado.
- Comprobado en Chrome: "Compra $ 15", "Te quedan 5 boletos", "Premios: $ 5, $ 15…" y la cartera, con las letras S intactas.

**Decisiones**
- Solo los números cambian de fuente: el resto del texto conserva Pixelify Sans.
- Fuente incluida en el proyecto (no de Google Fonts): así se puede limitar a las cifras con unicode-range.

## 2026-10-31 · Animación de carga

**Qué se hizo**
- Pantalla de carga animada (`client/index.html` y `styles.css`): un coche pixelado (SVG) que cruza el horizonte a saltos y botando, un matorral rodante en sentido contrario y una barra de 8 bloques que se encienden en bucle.
- `main.ts`: si conectar tarda más de 4 s, el estado va rotando cada 3 s ("Hank está abriendo la gasolinera…", "Encendiendo los neones…"...) y aparece la explicación de que el servidor gratuito se duerme y tarda hasta un minuto en despertar.
- Con el login delante o si falla la conexión (`#splash.failed`), la barra y la explicación se ocultan. Con `prefers-reduced-motion`, todo quieto.
- Comprobado en Chrome superponiendo la pantalla de carga sobre el juego (en modo local conecta al instante).

**Decisiones**
- La animación es HTML y CSS en `index.html`: se mueve desde el primer instante, antes de que cargue el JS.
- Los mensajes solo rotan si tarda: si el servidor ya está despierto, no da tiempo a verlos.

## 2026-10-31 · Más sueldo en la gasolinera

**Qué se hizo**
- `ECONOMY.gasStation.shift`: sueldo de $15 a $40 por turno y propina de $3 a $5 por coche.

**Decisiones**
- Con el descanso de 10 min, como mucho unos $200 por hora de turnos: compensa trabajar sin hacer innecesarios los negocios (el alquiler va de $20 a $45 al día).

## 2026-10-31 · Volver a donde estabas

**Qué se hizo**
- `LEAVE` guarda la última posición del jugador (escena, baldosa y dirección) en `GameState.lastPositions`; `JOIN` lo devuelve ahí en vez de a su caravana (`shared/src/reducer.ts`).
- Si el avatar aún sigue en el mundo al reconectar (el servidor todavía no había notado el corte, típico al bloquear el móvil), `JOIN` respeta su posición actual en vez de sobrescribirla.
- Si esa escena ya no existe, entra por su caravana como siempre.
- Se guarda en `profiles.last_position` (migración `005_last_position.sql`, aplicada en Supabase y comprobada): sobrevive a un reinicio del servidor.
- Comprobado con un script: primera vez en la caravana; reconexión sin salir, salir y volver, ambos en la gasolinera (2,0) mirando a SW; escena inexistente → caravana.

**Decisiones**
- La posición la decide el servidor (reducer), no el cliente: así nadie puede pedir aparecer donde quiera.
- `lastPositions` no va en los parches (el cliente no lo necesita).

## 2026-10-31 · Animación del turno en la gasolinera

**Qué se hizo**
- Al empezar el turno, el avatar camina solo a su puesto detrás del mostrador (`TILL_TILE`, junto a Hank), se gira hacia los clientes y Hank le da la bienvenida en el chat (`shared/src/gasStation.ts`).
- Mientras trabaja: gorra roja de la gasolinera (sprite `WORK_CAP` en `renderer.ts`) y un vaivén de 1 px cada 260 ms, como si cobrara.
- Nuevo `client/src/ui/workTags.ts`: barra del turno encima del nombre y dinero que sube flotando ("+$3" de propina, "+$15" de sueldo). Lo ven todos los que estén en la gasolinera.
- Comprobado en Chrome (offline): el avatar va al puesto y mira a SW, saludo de Hank, gorra, barra avanzando y "+$3" al repostar un coche.

**Decisiones**
- El dinero flotante se detecta en el cliente (sube el dinero de alguien que trabaja o acaba de terminar), sin estado nuevo en el servidor.
- La barra es oscura con relleno mostaza: la primera versión, clara, no se distinguía de la pared.

## 2026-10-31 · Juego bien en el móvil

**Qué se hizo**
- La imagen ya no se estira: `resize()` (`client/src/main.ts`) da al canvas un tamaño en pantalla que es exactamente `scale` veces su resolución en los dos ejes, y usa `visualViewport` (la parte visible, sin la barra del navegador). Antes el CSS lo estiraba al 100 % de la pantalla, que en el móvil no coincide con `innerHeight`.
- Entrada con pointer events (`client/src/engine/input.ts`): arrastrar con el dedo mueve el mapa y pellizcar hace zoom del juego. El hover solo con ratón. Margen de arrastre mayor con el dedo (10 px).
- Sin zoom de página: `touch-action: none` en el canvas, `manipulation` en los botones y `user-scalable=no` en el viewport. Sin rebote ni resaltado azul al tocar.
- Comprobado en Chrome con un iframe de 387x684: escala exacta 2x2 (y 4x4 tras pellizcar), arrastre y pellizco con eventos táctiles simulados.

**Decisiones**
- Escala entera y redondeo hacia arriba: lo que sobra (menos de un píxel del juego) queda fuera de la pantalla en vez de deformar la imagen.
- El zoom de página se desactiva porque el juego ya tiene el suyo (botones, rueda y pellizco).

**Pendiente**
- Probarlo en un móvil de verdad (iOS y Android): solo se ha simulado.

## 2026-10-30 · La gasolinera de Hank

**Qué se hizo**
- Interior nuevo, el minimarket (escena `gas`, tema `minimart`), con puerta en la acera (x = 39). Dentro: Hank (NPC `npc-hank`, rol `clerk`) tras su mostrador, dos estanterías, máquina de refrescos, máquina recreativa y tablón de anuncios (sprites nuevos en `client/src/sprites/structures/`).
- `shared/src/gasStation.ts`: proveedor de compra y venta con oferta del día, encargos de Hank, turnos en la caja (sueldo y propinas), rasca y gana, refresco en la mano y partida en la recreativa con récord. Acciones nuevas: `SELL_MATERIAL`, `DELIVER_ORDER`, `START_SHIFT`, `BUY_SCRATCH`, `BUY_SODA`, `PLAY_PINBALL`; `BUY_MATERIAL` pasa a pedir estar dentro.
- `travelers.ts`: coches de paso que paran a repostar (`toPump` / `fueling`) y autobús de turistas (`kind: 'bus'`, 3 baldosas) que deja varios viajeros y avisa a todos.
- Interfaz: ventana del mostrador con pestañas (`ui/gasWindow.ts`, sustituye a `supplierWindow.ts`) y tablón del pueblo (`ui/boardWindow.ts`). La lata se dibuja junto a la mano del avatar.
- Fachada de la gasolinera "reabierta": escaparate iluminado, neón OPEN y cartel de precios con luz. Los vecinos ya no dicen que está cerrada.
- Guardado: `profiles.gas_station` (boletos del día, descanso entre turnos) y `world.gas` (encargos y récord), migración `004_gas_station.sql` (aplicada en Supabase y comprobada).
- Comprobado: typecheck, build, un script con la lógica (compra solo dentro, venta, encargo, turno con propina, límite de 5 boletos, refresco que caduca, récord, coches repostando y autobús) y en Chrome offline cada pestaña, las máquinas, el tablón, un coche repostando y el sprite del autobús.

**Decisiones**
- Todo con ticks y la semilla del estado, como el resto de la economía. La oferta del día sale del número de día, así es igual para todos sin guardarla.
- El proveedor paga el 30 % de su precio: los productores fabrican gratis y, si pagara más, vender materiales rendiría más que abrir tiendas.
- Encargos compartidos por todo el pueblo (el primero que entrega cobra) y que caducan en un día.
- El autobús solo se programa al arrancar el servidor, no llega en el acto: Render se reinicia a menudo.
- Hank se llama así; el viajero que se llamaba Hank pasa a ser Earl.

**Pendiente**
- El autobús llegando a la calle no se ha visto en el juego (tarda 20–40 min); sí el sprite y la lógica en el script.
- La recreativa y el refresco no tienen animación propia; el turno es "quedarse dentro", sin minijuego.

## 2026-10-30 · Cartera sin tapar el logo

**Qué se hizo**
- `#wallet` tiene `max-width: calc(50vw - 150px)`: nunca llega al centro, donde están el logo y el cartel de la escena; si no cabe, los materiales bajan de fila.
- Por debajo de 900 px: la cartera ocupa el ancho de arriba, el logo se oculta, el cartel de la escena baja justo encima de la barra inferior y los avisos (`#toast`) suben para no pisarlo.
- Comprobado en Chrome con iframes de 362, 502, 642, 871 y 999 px: nada se solapa.

**Decisiones**
- Corte en 900 px y no en 640: entre 640 y 900, la cartera junto al logo quedaba tan estrecha que el botón de la subvención se partía en tres líneas.

## 2026-10-30 · Barra inferior en el móvil

**Qué se hizo**
- Por debajo de 760 px, `#hud` ocupa el ancho de la pantalla menos el hueco de los botones de zoom: el chat arriba a todo lo ancho y los botones repartidos debajo, con letra más pequeña.
- El comentario de la capa de bocadillos vuelve junto a su regla en `styles.css`.
- Comprobado en Chrome con iframes de 355, 595 y 775 px: la barra cabe sin salirse ni tapar el zoom.

**Decisiones**
- Corte en 760 px y no en 640: con sesión iniciada hay un cuarto botón ("Salir") y la barra de escritorio mide unos 720 px.

**Pendiente**
- En el móvil, la cartera (arriba a la izquierda) sigue tapando el logo y el cartel de la escena.

## 2026-10-30 · Ventanas con scroll y responsive

**Qué se hizo**
- `.win` tiene alto máximo (`100dvh - 16px`) y es una columna: la barra de título queda fija y `.win-body` hace scroll (barra en ocre y crema).
- `PixelWindow.fitToScreen()` (`client/src/ui/window.ts`): al abrir una ventana y al cambiar el tamaño de la pantalla, la recoloca para que quepa entera.
- Por debajo de 480 px, las opciones (`.option`) ponen el botón debajo del texto.
- Ventana de alquiler: el texto de ayuda va arriba, antes de la lista.
- Comprobado en Chrome: a 1536x695, la ventana de alquiler (8 negocios) sube y hace scroll; en un iframe de 386x686 cabe a lo ancho, con botones debajo y scroll hasta la Frutería.

**Decisiones**
- El arreglo va en la ventana base, así sirve para todas (negocio, tienda, inventario...), no solo para la de alquiler.

**Pendiente**
- A ancho de móvil, la barra inferior (chat y botones) se sale por la derecha.

## 2026-10-30 · Nombre del dueño en los locales

**Qué se hizo**
- Fachada: placa crema nueva en el sprite del local (`OWNER_PLATE` en `client/src/sprites/structures/shop.ts`), entre el escaparate y el cartel. El cartel de neón y su icono suben 4 px para dejarle sitio.
- Nuevo `client/src/ui/lotSigns.ts`: escribe en HTML el nombre del dueño sobre la placa de cada local abierto (también Rosa y Elmer) y, dentro del local, un cartel de madera "Local de ‹nombre›" en la pared del fondo.
- Los carteles se inclinan con `skewY(26,57°)` (pendiente 1/2 de las paredes isométricas) y el tamaño de letra se ajusta para que el nombre quepa.
- Comprobado en Chrome (offline), de día y con zoom: "Rosa" en su fachada, "Tú" en un diner y una tienda alquilados, y el cartel dentro del diner.

**Decisiones**
- Texto en HTML, como nombres y precios: nítido a cualquier zoom. La placa sí va en el sprite, para que la fachada tenga su sitio aunque no haya texto.
- Las posiciones salen de las mismas medidas del sprite (`OWNER_PLATE`), así no se desalinean si se retoca la fachada.

**Pendiente**
- Al ser HTML, el texto se dibuja por encima de lo que pase por delante (un avatar o una farola) y no se oscurece de noche, igual que las etiquetas de precio.

## 2026-10-30 · Nombre encima de los jugadores

**Qué se hizo**
- Nuevo `client/src/ui/nameTags.ts`: etiqueta HTML con el nombre de usuario encima de la cabeza de cada avatar que no es bot, recolocada en cada fotograma (como bocadillos y precios).
- Tu propio nombre sale en mostaza (`.name-tag.me`); los demás, en crema sobre fondo oscuro semitransparente.
- Los bocadillos de chat de los jugadores empiezan `NAME_TAG_SPACE` px más arriba para no tapar el nombre.
- Comprobado en Chrome (offline): nombre sobre el jugador, NPC sin nombre y bocadillo por encima.

**Decisiones**
- HTML y no dibujado en el canvas: el texto sale nítido a cualquier zoom, igual que el resto de etiquetas.
- `textContent`: el nombre lo elige el jugador y nunca se interpreta como HTML.

## 2026-10-30 · Siete muebles nuevos

**Qué se hizo**
- Hogar: **Cama** (1x2, sentable), **Sofá** (1x2, sentable), **Radio antigua** (dial que da luz) y **Mecedora** (sentable).
- Diner y desierto: **Cartel de neón OPEN** (da luz), **Máquina de batidos** y **Calavera de vaca**.
- Cada uno: id en `DecorId` y `CATALOG` (`shared/src/catalog.ts`), receta y valor en `shared/src/economy.config.ts`, modelo en `client/src/sprites/furniture/` y registro en su `index.ts`.
- Comprobado: typecheck, build y los sprites dibujados en Chrome en las cuatro rotaciones (se retocaron la calavera, que salía pequeña, y el cabecero de la cama, que tapaba la almohada).

**Decisiones**
- Solo materiales que ya existen; recetas y valores siguiendo la proporción de los muebles actuales (calavera $30 … cama y máquina de batidos $90).
- La cama es un asiento más: el motor todavía no tiene postura tumbada.
- Las tiendas de Rosa y Elmer también los venderán, porque reponen al azar entre todos los `DECOR_IDS`.

**Pendiente**
- No se ha probado sentarse en la cama, el sofá y la mecedora dentro del juego (usan el mismo sistema que el sillón de diner).

## 2026-10-30 · Vista previa de la fachada

**Qué se hizo**
- En la ventana del negocio, encima de los botones de fachada, se dibuja el local tal como se ve desde la calle (mismo sprite `shop`, rotación 1, a doble tamaño).
- Al pasar el ratón (o el foco del teclado) por una plantilla, la vista previa la muestra ("Vista previa: Boutique"); al salir vuelve a la actual. El clic la aplica, como antes.
- `furniIcon()` (`client/src/ui/icons.ts`) acepta rotación y variante.
- Comprobado en Chrome en modo offline: diner con fachada Diner, vista previa de Boutique y vuelta a la actual.

**Decisiones**
- La variante se calcula con `buildingVariant()` de shared, así la vista previa es exactamente lo que se pintará en la calle (neón e icono del negocio incluidos).
- Aumento entero (`PREVIEW_SCALE = 2`) para que los píxeles no se deformen.
- En pantallas táctiles no hay hover: la vista previa muestra la fachada actual y cambia al tocar una opción (que ya la aplica).

## 2026-10-30 · Una sesión por pestaña

**Qué se hizo**
- `client/src/game/auth.ts`: el cliente de Supabase guarda la sesión en `sessionStorage` en vez de `localStorage`.

**Decisiones**
- Con `localStorage` todas las pestañas del navegador compartían cuenta, y el servidor echa la conexión anterior de una misma cuenta: solo se podía probar con dos jugadores (ventana normal + incógnito).
- Contrapartida: al cerrar la pestaña hay que volver a iniciar sesión (recargar sí la conserva).

## 2026-10-29 · Subvención del pueblo

**Qué se hizo**
- Nueva entrada fija de dinero: `ECONOMY.subsidy` ($30 cada 24 h) en `shared/src/economy.config.ts`.
- Acción `CLAIM_SUBSIDY` y lógica `claimSubsidy` / `subsidyTicksLeft` en `shared/src/economy.ts`; nuevo `GameState.subsidies` (tick en que vuelve a estar disponible), sincronizado con los clientes.
- Botón en la cartera: "Recoger subvención +$30" o "Subvención en 5 h".
- Se guarda en `profiles.next_subsidy_at` (migración `supabase/migrations/003_subsidy.sql`).
- Comprobado: typecheck, build y un script que reclama dos veces seguidas (solo cobra la primera) y otra tras un día.
- Migración 003 aplicada en Supabase (columna comprobada).

**Decisiones**
- Se recoge a mano y no se acumula: premia entrar a jugar y no regala dinero a cuentas abandonadas.
- Medida en ticks, como el alquiler: así la subvención y el alquiler avanzan al mismo ritmo aunque el servidor se apague.
- $30, parecida al alquiler más barato: es una red de seguridad, no un sueldo que haga innecesarios a los viajeros.
- Un jugador nuevo puede recogerla nada más entrar.

**Pendiente**
- El botón de la cartera no se ha probado en el navegador.

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

