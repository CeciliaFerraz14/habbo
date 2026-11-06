# Fusión de los dos `master` y solares unificados · Diseño

Fecha: 2026-11-05 · Estado: borrador para revisar

## Intención

La misma persona ha trabajado desde dos ordenadores y las historias se han
separado desde `a43bb81`:

- **Este PC (`master` local, 32 commits, sin subir):** bar, recreativos, campo
  de algodón, tienda de ropa, muebles y materiales nuevos, tiendas de Elmer y
  Rosa liberadas, solares con casero. Migraciones `003_free_npc_lots`,
  `004_bar_arcade_cotton`, `005_clothing` y `006_plots`, nunca aplicadas (solo
  se probaron con `rollback`). Tiene tests en `shared/src/**/*.test.ts`.
- **PC de casa (`origin/master`, 35 commits, autor `ivanu`):** subvención,
  gasolinera, progreso y rangos, plazas y parcelas, Ensanche, niveles de local,
  vendedores de exclusivos y mejoras móviles. Migraciones `003` a `009`, ya
  aplicadas en producción. Está todo subido.

El objetivo es tener una sola versión del juego con todo lo anterior, sin que
los jugadores pierdan lo que tienen, y con un solo sistema de solares.

Por qué dos tipos de propiedad son uno solo: el jugador quiere ampliar su juego.
Lleva un negocio y construye más locales para alquilarlos y ganar dinero sin
atenderlos.

## Objetivos

1. Fusionar `origin/master` en `master` con un merge commit, conservando las
   funciones de los dos lados.
2. Unificar los solares sobre el Ensanche, con la opción de alquilar.
3. Escribir migraciones nuevas, numeradas desde 010, que lleven el esquema de
   producción al que necesita el código fusionado.
4. Dejar el camino de despliegue escrito y probado, en un orden seguro.

## Lo que no se busca

- Rediseñar la economía o reequilibrar precios más allá de las reglas de aquí.
- Funciones nuevas que no estén en este documento.
- Reescribir historia: sin `rebase` de lo publicado ni `push --force`.

## Lo que sería un fracaso aunque funcione

- Un jugador pierde dinero, inventario, progreso, nivel de local o un local que
  le pertenece.
- Un guardado falla a medias en producción por desplegar en el orden incorrecto.
- Quedan dos formas de construir o código muerto del sistema descartado.

## Estado real de producción (consultado el 2026-11-05, solo lectura)

- Migraciones aplicadas: las de `origin/master` hasta `lot_levels`. Ninguna de
  las 003 a 006 locales.
- Un único mundo compartido, 2 perfiles, 313 objetos de inventario, 110 muebles
  y 13 locales.
- Locales: `lot1`, `lot2`, `lot3`, `lot5` y `lot7` son de jugadores, con negocio
  y nivel 3. `lot7` es un invernadero, "Local 7", de una parcela de la Avenida.
- `lot4` y `lot6` son tiendas de NPC.
- `lot-e1` a `lot-e6` están construidos (`built_by`). Cinco tienen negocio y
  nivel 3; `lot-e3` está cerrado y sigue siendo de quien lo construyó.
- `lots.next_restock_at` existe, no admite nulos y el servidor de `origin/master`
  la lee y la escribe. Por eso no se puede eliminar hasta que el servidor nuevo
  esté en marcha.

## Solares: decisiones de la usuaria

- Un solo tipo de solar: el del Ensanche. Se conservan los 6 locales existentes.
- Quien construye es dueño para siempre y elige entre abrir su negocio o alquilar
  el local.
- Para alquilar un local, tiene que estar cerrado. Un local nunca tiene a la vez
  negocio del dueño e inquilino.
- El mantenimiento solo se paga si el local se alquila.
- El mantenimiento se cobra mientras el local esté en alquiler, también si está
  vacío. El dueño lo evita retirándolo del alquiler.
- En un local alquilado, las mejoras de nivel solo las paga el dueño. El nivel se
  queda en el local cuando se va el inquilino.
- Si el inquilino cierra el negocio por su cuenta, no recupera nada: la fianza se
  la queda el dueño y `closeBusiness` no crea dinero (`closeRefund` solo se aplica
  a los locales del ayuntamiento).
- Las tiendas de Elmer y Rosa desaparecen y sus locales quedan en alquiler.
- En producción ya hay gente jugando: es lo que hay que proteger. Los datos de un
  entorno local se pueden perder sin problema.

## Solares: decisiones del diseñador (pendientes de que las revise la usuaria)

- **Ubicación:** la del Ensanche. Las dos filas de solares del `master` local no
  caben, porque la Avenida de las Plazas ocupa ese espacio (y 14-31). Se eliminan
  `PLOT_SITES`, `plot_site`, las aceras y el plano asociados, salvo lo que el
  Ensanche necesite.
- **Ids:** `lot-eN`. Los `lot7` a `lot12` del `master` local chocan con las
  parcelas, por lo que dejan de existir como solares.
- **Coste de construir:** el del Ensanche, $300, 20 de chapa, 20 de madera vieja,
  3 minutos de obra y 60 XP. Desaparece `ECONOMY.plots.buildCost`.
- **Condiciones:** el dueño fija fianza y alquiler dentro de los límites de
  `ECONOMY.plots` (fianza 0-400, alquiler 10-120; iniciales 100 y 40), solo con el
  local libre. El ayuntamiento se queda el 10 % de cada cobro.
- **Poner en alquiler:** es un estado explícito del local. Mientras está en
  alquiler, el dueño no abre negocio ahí; con el local libre, puede retirarlo y
  abrirlo. Un local construido no se ofrece a nadie hasta que el dueño lo decida,
  así que los 6 existentes empiezan como hoy, sin mantenimiento.
- **Mantenimiento:** $12 por periodo (`ECONOMY.plots.upkeep`). Si el dueño no puede
  pagar, queda suspendido y no admite inquilinos nuevos; el inquilino actual sigue.
  El comportamiento de cobro es el de `chargeUpkeep`.
- **Inquilino:** paga como en un local del ayuntamiento. Si no paga, abandona o
  cierra, pierde el local, que vuelve libre y en alquiler al dueño, con aviso. Lo
  que el negocio tenga se trata como en `closeLot`.
- **Quién mejora:** en un local construido, `upgradeLot` lo autoriza el dueño
  (`builtBy`), también con inquilino. En un local del ayuntamiento sigue siendo
  quien lo lleva. Si no hay negocio abierto no se puede mejorar, como hoy.
- **Interior:** el dueño entra como cliente si hay inquilino.

## Modelo de datos

`builtBy` y `readyAt` del Ensanche siguen siendo la propiedad. De los campos de
casero se conservan `terms`, `nextUpkeepAt` y `suspended`. `landlordId` y
`landlordName` desaparecen: duplican `builtBy`. Si la interfaz necesita el nombre
del dueño, se decide cómo obtenerlo sin duplicar datos; una columna solo si no
hay otra forma.

`ownerId` sigue siendo quien lleva el negocio: el dueño o el inquilino.
`isOwnLot(lot, ownerId)` distingue los dos casos, y las reglas de exención de
alquiler y de abandono dejan de aplicarse al inquilino por sí solas.

## Fusión: criterios

- Los dos lados conservan sus funciones. Ante un conflicto, se combinan; no se
  elige una versión entera de un archivo.
- `shared/src/world.ts` usa el plano de `origin/master`.
- Elmer y Rosa: se elimina `setupNpcStores` y queda `releaseNpcLots` al cargar.
  Los vecinos vendedores de exclusivos se mantienen: son otra cosa.
- Los negocios nuevos entran en lo que `origin/master` añadió por negocio (logos
  de neón, decoración propia, requisitos de nivel, puestos por nivel). Cada uno
  necesita su logo y su decoración, hechos con `PALETTE`.
- `docs/journal.md` y `README.md` conservan el contenido de los dos lados, en orden
  por fecha.
- `CLAUDE.md` se actualiza para reflejar el resultado. Hoy el fichero está sin
  seguimiento en git, y no se añade sin que la usuaria lo decida.
- Los tests locales se mantienen y se adaptan solo si una regla decidida aquí los
  contradice, explicando por qué. Los de solares se reescriben para el modelo
  nuevo.
- Se conservan todas las migraciones de `origin/master` tal cual. Las locales
  `003`, `004`, `005` y `006`, que nunca se aplicaron, se sustituyen por las nuevas.

## Migraciones

Las tres son nuevas y no se edita ninguna ya aplicada.

- **`010`, antes de desplegar, solo amplía:** `lots_business_check` con los
  negocios nuevos; `inventory_items` y `furniture` con prendas, como la `005`
  local. No añade `terms`, `next_upkeep_at` ni `suspended`: esas columnas van en la
  `012`. Es segura con el servidor actual. Sin ella, todos los
  guardados de inventario o de muebles del servidor nuevo fallan, así que ese
  servidor se niega a arrancar.
- **`012`, antes de desplegar, solo amplía:** `lots.terms`, `lots.next_upkeep_at` y
  `lots.suspended`, las condiciones de alquiler de los locales del Ensanche. Es
  segura con el servidor actual (las filas toman los valores por defecto) y no
  depende de la `011`: se aplica con la `010`, antes que el servidor, aunque su
  número sea posterior. Sin ella, los guardados de locales del servidor nuevo
  fallan, así que se niega a arrancar.
- **`011`, después de desplegar y comprobar el guardado, limpia:** elimina
  `next_restock_at` y limpia lo que quede de los locales de NPC. No debe ejecutarse
  antes de que el servidor nuevo esté funcionando.

Hay que comprobar antes que el servidor actual tolera los cambios de la `010`. Las
migraciones, comprobadas contra una copia del esquema real con datos de la forma
de producción.

## Despliegue

Las migraciones se aplican siempre con `begin; set local lock_timeout = '5s'; set
local statement_timeout = '30s'; ...; commit;`, y se ensayan igual con `rollback`:
`alter table` puede bloquear los guardados mientras espera su bloqueo.

1. Copia de seguridad de los datos de producción. Anotar el dinero total de los
   jugadores y los tipos de negocio abiertos, para compararlos en el paso 5.
2. Probar `010` y `012` con `rollback` en producción.
3. Aplicar `010` y `012`.
4. Desplegar, a mano y en un momento sin jugadores conectados:
   1. Desactivar el despliegue automático de Render y Vercel, si está activo, antes
      del `push`.
   2. Suspender el servicio del servidor antes de desplegar, o confirmar que la
      instancia antigua ha terminado. Dos instancias a la vez pueden guardar las dos,
      y la reposición de NPC de la antigua puede reescribir `lot4` y `lot6`.
   3. Desplegar el servidor y, cuando esté en marcha, el cliente. Así no hay un
      cliente nuevo hablando con el servidor antiguo.
   4. Con el cliente nuevo publicado, reiniciar el servidor una vez más, con nadie
      conectado. Una pestaña que se reconecte en el intervalo recarga el cliente
      antiguo y se queda en él, y ese cliente falla con los negocios y las prendas
      nuevos.
5. Comprobar en el log que el mundo se carga y se guarda sin errores, y que los
   jugadores conservan lo suyo: el dinero y los negocios anotados, salvo las tiendas
   de NPC, que ya no existen. Después, probar con una cuenta real: recoger y colocar
   un mueble, comprar algo, reiniciar el servidor y comprobar que todo sigue igual.
6. Solo después de lo anterior y con nadie conectado: volver a comprobar `lots` y que
   el servidor anterior está parado, probar `011` con `rollback` y aplicarla.

### Vuelta atrás

Se puede volver al servidor `5539996`, y a su cliente, mientras no se haya guardado
ninguna prenda ni negocio nuevo, ningún local en alquiler, ni ningún mueble o
material que ese servidor no conoce, y `011` no esté aplicada. Las tiendas de NPC no vuelven: `lot4` y `lot6` se
quedan libres desde el primer guardado del servidor nuevo. Pasado ese punto, la única
vuelta atrás es restaurar la copia de seguridad.

**Autorización:** el `CLAUDE.md` del proyecto prohíbe tocar la base de producción y
el MCP está en solo lectura. Las migraciones se aplican a mano por la usuaria o, si
lo autoriza expresamente en ese momento, activando la escritura solo para ello. El
`push` a `master` también necesita su confirmación, porque puede desplegar por sí
solo.

**Aislar producción:** ningún servidor con el código fusionado arranca contra
producción antes del paso 4. Antes de cualquier `npm run dev` hay que confirmar
que `server/.env` no apunta a producción. Si apunta, se cambia primero: el
servidor fusionado liberaría `lot4` y `lot6` y borraría sus muebles en el primer
guardado.

## Comprobación

- `npm test`, `npm run typecheck` y `npm run build` limpios.
- Test de carga con una copia de la forma de producción: los `lot-e*`, `lot7` y sus
  niveles se conservan, los de NPC quedan libres y un jugador conserva dinero,
  inventario y progreso.
- Tests de la unificación: construir, poner en alquiler, retirar, alquilar, cobrar
  con comisión, mantenimiento con el local vacío y ocupado, suspensión, pérdida por
  impago y por abandono, cierre por el inquilino sin devolución, mejora por el dueño
  y rechazo de la mejora por el inquilino.
- En un navegador, con servidor local sin Supabase (jugadores invitados): Ensanche,
  poner en alquiler, alquilar desde una segunda sesión, mejorar, y los negocios
  nuevos con sus logos. También en ancho de móvil.
- Guardar y cargar de verdad, en una base de pruebas que no sea producción: aplicar
  todas las migraciones desde 001, cargar datos con la forma de producción, con filas
  que tengan `progress`, `gas_station` y `last_position` no vacíos, arrancar el
  servidor fusionado y comprobar que un reinicio conserva todo. Es obligatorio antes
  de producción: sin esto no se despliega.

## Lo que queda a quien construya

Orden de resolución de conflictos, reparto de `plots.ts`, nombres de la acción de
poner en alquiler y de sus campos, y forma exacta de la ventana, siempre con
`PixelWindow`, las clases CSS existentes y los valores de `ECONOMY`.
