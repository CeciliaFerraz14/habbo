# Diario de trabajo

Una entrada por paso: fecha, qué se hizo, decisiones y por qué. Lo más reciente arriba.

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
