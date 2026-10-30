# Diario de trabajo

Una entrada por paso: fecha, qué se hizo, decisiones y por qué. Lo más reciente arriba.

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
