# Negocios nuevos, ropa y parcelas · Diseño

Fecha: 2026-11-03 · Estado: borrador para revisar

## Intención

Pixel Springs es un pueblo que reviven los jugadores abriendo negocios. Este
trabajo amplía lo que pueden hacer:

- Más tipos de negocio para abrir: **bar**, **recreativos** y **tienda de ropa**.
- Más cosas que fabricar y comprar: materiales nuevos, muebles nuevos y, por
  primera vez, **ropa** que se pone el avatar.
- Más sitio y más papeles: los dos locales de los NPC (Elmer y Rosa) pasan a
  estar en alquiler, y los jugadores pueden **construir locales nuevos** y
  alquilarlos a otros como caseros.

El porqué: más variedad de negocios y cadenas de suministro entre jugadores
(el bar necesita al pozo y al invernadero, la tienda de ropa al campo de
algodón, los recreativos al taller), y un papel nuevo, el de casero, para
quien prefiera invertir en vez de llevar un negocio.

## Objetivos

1. Quitar las tiendas NPC de Elmer (`lot6`) y Rosa (`lot4`). Los 6 locales
   empiezan en alquiler.
2. Bar y recreativos como negocios de servicio para viajeros.
3. Campo de algodón (productor de tela) y fichas fabricadas en el taller.
4. Muebles nuevos para los negocios nuevos.
5. Tienda de ropa híbrida que fabrica prendas y las vende a jugadores y a
   viajeros, con prendas que cambian la forma del avatar.
6. Parcelas: solares al otro lado de la carretera donde un jugador construye
   un local y lo alquila a otros.

## Fuera de alcance

- Prendas gratis: las prendas nuevas solo se ponen si se tienen.
- Que el casero se alquile su propio local.
- Vender o traspasar parcelas entre jugadores, o derribarlas.
- Que el proveedor de la gasolinera venda muebles (decisión de la usuaria:
  sin Elmer ni Rosa, al empezar no hay muebles a la venta, y está bien).

## Cosas que serían un fracaso aunque funcionen

- Romper partidas guardadas: el mundo de Supabase debe cargar sin errores
  tras las migraciones (locales de Elmer y Rosa incluidos).
- Inflación: el alquiler entre jugadores no saca dinero de la economía, así
  que la construcción y la comisión del ayuntamiento deben compensarlo.
- Avatares que se ven mal en alguna de las 4 direcciones o con alguna
  combinación de prendas.
- Assets o nombres de juegos existentes. Todo original, dibujado por código.

## Restricciones del proyecto

Las de `CLAUDE.md`. Las más relevantes aquí:

- Toda la economía en `shared/src/economy.config.ts`, en segundos. Nada de
  números mágicos fuera.
- Todo cambio de estado por una acción del reducer. Lógica determinista
  (`state.tick`, `random.ts`), sin `Math.random()` ni `Date.now()`.
- Sprites por código. Avatares por capas con sustitución de paleta y colores
  de `shared/src/looks.ts`. Muebles nuevos con colores de `PALETTE`, no hex
  fijos.
- UI con `PixelWindow` y las clases CSS existentes, sin colores fijos.
- Esquema: solo migraciones nuevas en `supabase/migrations/`. No editar
  `001` ni `002`. No tocar la base de datos de producción.
- Cada paso deja el juego funcionando con `npm run dev` y `npm run dev:offline`.
- Hay tests con `npm test` (node:test + tsx): cada paso se comprueba con
  `npm test`, `npm run typecheck`, `npm run build` y prueba manual en el
  navegador.

## Diseño por partes

Las partes van en este orden; cada una es un paso que se puede entregar solo.

### 1. Liberar los locales de Elmer y Rosa

- Se borra `ECONOMY.npcStores`, `ECONOMY.npcRestock`, `setupNpcStores`,
  `restockNpcStores` y el campo `Lot.nextRestockAt` con todo lo que solo usan
  ellos (no dejar código muerto).
- Mundos guardados: un local cuyo dueño es un NPC (`npc-` delante) se resetea
  a en alquiler y sus productos a la venta se eliminan. No hay proyecto de
  Supabase de desarrollo (respuesta de la usuaria), así que se hacen las dos
  cosas:
  - **Red de seguridad en el servidor**: al cargar el mundo
    (`server/src/persistence.ts`), cualquier local con dueño `npc-` se pone en
    alquiler y se quitan sus productos. Así el juego funciona aunque la
    migración aún no se haya aplicado, y se puede probar con un mundo
    guardado real.
  - **Migración SQL nueva** que la usuaria aplica a mano (resetear las
  filas de `lots` con `owner_id like 'npc-%'` y borrar sus muebles a la venta
  dentro de esos locales; el dinero de los NPC nunca se guardó en
  `profiles`, así que no hay nada más que borrar). Se escribe para poder
  probarla dentro de una transacción con `ROLLBACK` y se indica en el
  resumen cómo aplicarla. La columna `next_restock_at` se elimina en la
  misma migración.
- Regla para todas las migraciones de este trabajo: el servidor debe
  arrancar y guardar bien tanto antes como después de aplicarlas.
- Los vecinos que pasean (Dolores, Nina, Tito) no cambian.

### 2. Bar y recreativos

Dos negocios `service` nuevos en `BUSINESSES`, con su puesto de trabajo
(`STATIONS`), su icono de neón y su fachada.

| Negocio | Servicio | Gasta | Fachada |
|---|---|---|---|
| Bar (`bar`) | "Una ronda" | agua 1, fruta 1 | nueva: `saloon` (madera, neón ámbar) |
| Recreativos (`arcade`) | "Una partida" | fichas 2 | nueva: `arcade` (oscura con neones) |

Los números concretos (fianza, alquiler, `baseValue`, consumos) son mi
propuesta inicial y se ajustan en `economy.config.ts`.

### 3. Materiales nuevos

- **Tela** (`fabric`): la produce un productor nuevo, el **campo de algodón**
  (`cotton_field`), como el invernadero produce fruta. Necesita puesto de
  trabajo propio (planta de algodón o telar).
- **Fichas** (`tokens`): se fabrican en el **taller** a partir de chapa. Hoy
  el taller solo fabrica muebles (`recipes: Record<DecorId, Recipe>` y
  `CraftJob` con `defId`), así que las recetas pasan a poder producir un
  mueble o un material. Al recoger, un mueble va al inventario y un material
  al almacén de materiales del jugador.
- Ninguno de los dos se vende en el proveedor (mi decisión: así cada uno
  depende de un negocio de jugador).

### 4. Muebles nuevos

Todos fabricables en el taller, con receta y `baseValue`: barra de bar,
barril, diana, máquina recreativa y pinball. Mi decisión: empezar con estos
cinco. Un archivo por mueble en `client/src/sprites/furniture/`, con
`PALETTE`.

### 5. Tienda de ropa

Negocio nuevo (`clothing`) con un tipo de funcionamiento nuevo que combina
el taller y la tienda:

- **Fabrica** prendas con recetas de tela (cola como el taller).
- **Escaparate**: las prendas fabricadas se ponen a la venta con precio
  del dueño (como la tienda de decoración, con su máximo de productos y la
  comisión del ayuntamiento).
- **Jugadores**: entran, compran una prenda y va a su inventario.
- **Viajeros**: compran prendas del escaparate con las mismas reglas que en
  la tienda de decoración (presupuesto, valor de referencia, ganga) y se van
  con la prenda puesta.

**Prendas**

- Piezas nuevas que cambian la forma del avatar: sombreros, chaquetas, botas
  y similares. Mi decisión: empezar con 5 (sombrero de cowboy, gorra,
  chaqueta vaquera, chaleco y botas).
- **Color**: lo elige el sastre al fabricarla, de una lista permitida en
  `looks.ts` (respuesta de la usuaria). El color forma parte del objeto: un
  sombrero rojo y uno azul son productos distintos en el escaparate, y la
  receta se pide con color. Hace falta guardar el color en el objeto de
  inventario (columna nueva en `inventory_items`).
- Se ponen desde el editor de avatar, que pasa a mostrar las prendas que
  tienes, cada una con su color. El jugador no puede cambiar el color.
- **Inventario** (mi decisión): las prendas van en el mismo inventario que
  los muebles, pero no se pueden colocar en una sala y solo se pueden poner
  a la venta en una tienda de ropa, lo haya fabricado ese local o no. Si un
  jugador vende o pone a la venta una prenda que lleva puesta, se le quita en
  ese momento.
- Ranuras: cabeza, torso (encima de la camiseta) y pies. Una prenda por
  ranura.
- Los colores básicos (pelo, piel, camiseta, pantalón) siguen gratis en el
  editor.
- Capas nuevas del avatar en las 4 direcciones, con caché como las actuales.
- El aspecto con prendas viaja por `SET_LOOK`; el reducer comprueba que el
  jugador tiene cada prenda que se pone (el objeto concreto, con su color).
- Persistencia: el aspecto se guarda donde hoy (`localStorage`) y las prendas
  en el inventario de Supabase. Al cargar, si el jugador ya no tiene una
  prenda que lleva puesta, se le quita.

### 6. Parcelas

- **Solares**: un número fijo de solares vacíos en el desierto, al otro lado
  de la carretera (y = 10-13), enfrente de los locales. Mi decisión: 6, con
  el mismo tamaño de 4x4 que los locales, y la carretera y la acera de ese
  lado ajustadas para que haya puerta y paso.
- **Construir**: un jugador hace clic en un solar libre y paga dinero y
  materiales (chapa, madera vieja y neumáticos; números en
  `economy.config.ts`). El solar pasa a ser un local con su interior, igual
  que los 6 de siempre. El dinero de la construcción sale de la economía.
- **Casero**: quien construye es el casero (`landlordId`, distinto del
  inquilino `ownerId`). Pone la fianza y el alquiler diario entre un mínimo y
  un máximo de la configuración, y puede cambiarlos solo cuando el local está
  libre.
- **Alquilar**: otro jugador lo alquila y abre cualquier negocio, como en un
  local normal. La fianza y el alquiler del casero **sustituyen** a los del
  tipo de negocio (respuesta de la usuaria): el inquilino solo paga al
  casero. Cada pago le llega al casero menos una comisión del ayuntamiento
  (mi decisión: la misma idea que `store.commissionRate`, con su propio
  valor).
- **Mantenimiento** (respuesta de la usuaria): el casero paga cada día un
  mantenimiento fijo por cada local construido, esté alquilado o no. Es la
  salida de dinero que compensa que el alquiler se quede entre jugadores. Si
  no puede pagarlo, mi decisión: el local deja de admitir inquilinos nuevos
  hasta que pague, pero no se derriba ni echa al inquilino actual.
- **Impago**: si el inquilino no puede pagar, pierde el local como ahora y
  vuelve a quedar en alquiler.
- El casero no puede alquilar su propio local.
- **Persistencia**: migración nueva con las columnas de casero y precios en
  `lots`, y las filas de los locales construidos.

## Qué queda a criterio de quien lo construye

- Nombres exactos de ids, acciones y funciones, siguiendo la nomenclatura
  existente.
- Dibujo de las fachadas, puestos de trabajo, muebles y prendas, dentro del
  estilo y la paleta.
- Números iniciales de la economía, siempre en `economy.config.ts`.
- Cómo se reparte la UI nueva entre ventanas existentes y nuevas, usando
  `PixelWindow` y las clases CSS que ya hay (preguntar antes de crear un
  componente nuevo).
