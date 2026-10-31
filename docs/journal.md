# Diario de trabajo

Una entrada por paso: fecha, qué se hizo, decisiones y por qué. Lo más reciente arriba.

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
