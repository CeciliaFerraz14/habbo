# Pixel Springs

> Para las reglas generales, ver el CLAUDE.md global (`~/.claude/CLAUDE.md`).
> Para jugar, controles y cómo ajustar la economía, ver `README.md`.

## Qué es

Juego social web en vista isométrica con estética pixel art retro y ambientación de pueblo de carretera estilo Ruta 66.
Pixel Springs es un pueblo casi abandonado: los jugadores alquilan locales, abren negocios y lo reviven. Cada negocio abierto enciende su neón.
Los jugadores compran en los negocios de otros para decorar su casa (caravana) o abastecer su propio negocio. Por la carretera pasan viajeros NPC que compran; cuantos más negocios abiertos, más viajeros.

Partes:
- **Calle**: vista del pueblo con locales, gasolinera, farolas, cactus y la caravana del jugador.
- **Interiores**: salas isométricas de locales y caravana, con muebles colocables.
- **Avatares**: sistema por capas (cuerpo, ropa, pelo, complementos) en 4 direcciones diagonales.
- **Negocios y economía**: alquiler, producción (chatarrería, pozo, invernadero, algodón), taller con recetas, tienda de decoración, servicios (diner, bar, recreativos, peluquería, frutería), tienda de ropa, campo de algodón, niveles de local, solares del Ensanche (abrir negocio o alquilar a otros jugadores), precios, venta automática y viajeros.
- **Chat**: bocadillos pixel encima del avatar.

Fase actual: 2, multijugador.
- Hecho: servidor Socket.IO que ejecuta la simulación compartida (F2-1), una caravana propia por jugador (F2-2), login con Supabase Auth (F2-3), persistencia en Supabase (F2-4) y fusión de los dos ordenadores con los locales en alquiler, en producción desde el 2026-11-06.
- El modo local sigue disponible (`npm run dev:offline`): el navegador simula el mundo él solo con `LocalTransport`.

Todo el contenido es original. No usar nombres, personajes ni assets de juegos o películas existentes.

## Datos

- **Servidor (autoridad)**: ejecuta el reducer y el tick de `/shared`. Carga el mundo de Supabase al arrancar y guarda cada 10 s solo lo que ha cambiado, y también al parar (`server/src/persistence.ts`).
- **Supabase (Postgres)**: tablas `profiles`, `inventory_items`, `furniture`, `lots` y `world`. RLS activado sin políticas: solo accede el servidor con la `service_role`. Migraciones en `supabase/migrations/` (de `001_init.sql` a `012_lot_rental.sql`, todas aplicadas en producción). El servidor no arranca si faltan las columnas de la `010` o la `012` (`requireMigrations`).
- **Sin Supabase configurado**: el servidor funciona con jugadores invitados y sin guardar.
- **Navegador**: `localStorage` solo guarda el aspecto del avatar (clave `pixel-springs:look`) y la sesión de Supabase Auth.
- **No tocar nunca sin autorización expresa**: la base de datos de Supabase de producción. Los cambios de esquema van siempre como migración nueva en `supabase/migrations/`; no editar migraciones ya aplicadas.

## Stack

Versiones instaladas (rangos en los `package.json`):

- TypeScript 7.0.2
- Vite 8.3.5
- Canvas 2D, sin motores de juego (ni Phaser ni similares)
- Node.js 20 o superior (probado con 24)
- Socket.IO 4.8.4 (`socket.io` y `socket.io-client`)
- Supabase JS 2.118.0 (Auth y Postgres)
- tsx 4.23.15 (ejecuta el servidor sin compilar)
- concurrently 10 (arranca servidor y cliente a la vez)

Monorepo con npm workspaces: `shared`, `client` y `server` (paquetes `@juego/*`).

## Mapa

```
/client/src/main.ts         Arranque: canvas, UI, conexión y bucle de render
/client/src/engine          Matemáticas isométricas, cámara, renderer, profundidad, día/noche, iluminación, input
/client/src/game            Transportes (local y Socket.IO), conexión, auth, controlador, interpolación de avatares, coches y puertas
/client/src/sprites         Paleta, avatar (matrices de píxeles), cajas 3D horneadas a pixel art
/client/src/sprites/furniture   Un archivo por mueble
/client/src/sprites/structures  Edificios, puestos de trabajo y elementos de la calle
/client/src/ui              Ventanas, HUD, chat, login, negocios, tiendas, proveedor, editor de avatar, styles.css
/server/src                 index.ts (Socket.IO), gameServer.ts, auth.ts, persistence.ts
/shared/src                 Tipos, acciones, reducer, simulación, escenas, mundo, NPC, viajeros, pathfinding A*, sync
/shared/src/economy.config.ts   Configuración única de la economía
/supabase/migrations        Migraciones SQL
```

## Comandos

```bash
npm install            # tras cada pull
npm run dev            # servidor (http://localhost:3001) + cliente (http://localhost:5173)
npm run dev:offline    # solo cliente, sin servidor (LocalTransport)
npm run build          # build del cliente (tsc + vite), ~10 s
npm run typecheck      # tsc en client y server, ~7 s
npm test               # tests de /shared y /server (node:test + tsx)
```

Los tests se ejecutan con `npm test` (node:test + tsx, ficheros `shared/src/**/*.test.ts` y `server/src/**/*.test.ts`). Todavía no hay linter ni formateador.

En desarrollo, en la consola del navegador: `game.state` para ver el estado y `game.dispatch({...})` para lanzar acciones.

## Convenciones

- **Estado separado del render**: el render solo lee el estado; nunca lo modifica.
- **Todo cambio pasa por una acción** (`MOVE`, `SAY`, `RENT_LOT`, `CRAFT`, `LIST_ITEM`, `BUY_ITEM`, `STOCK_LOT`, `SET_SERVICE_PRICE`…) que viaja por el transporte (Socket.IO o local). No se modifica el estado por otra vía.
- **La economía vive en `/shared` y es determinista**: el tiempo se mide en ticks (`state.tick`) y el azar sale de una semilla guardada en el estado (`shared/src/random.ts`). Nada de `Math.random()` ni `Date.now()` en la lógica.
- **Todos los valores de economía** (precios, alquileres, tiempos de producción, frecuencia de viajeros) están en `shared/src/economy.config.ts`, en segundos. No poner números mágicos en otros sitios.
- **Comentarios en español**, sobre todo en matemáticas isométricas, pathfinding, composición de avatares y economía. Es un proyecto de aprendizaje (DAM).
- **Trabajo por pasos**: cada cambio deja el juego funcionando con `npm run dev`. Enseñar un plan antes de cambios grandes.
- Ficheros de ejemplo a imitar: `shared/src/pathfinding.ts` para lógica (cabecera que explica el algoritmo, función pura y tipada) y `client/src/ui/rentWindow.ts` para interfaz (`PixelWindow`, clases CSS existentes, valores de `ECONOMY`, acción por callback). Los muebles no sirven de modelo: tienen colores hex fijos en vez de `PALETTE`.
- **Diario de trabajo** en `docs/journal.md`: fecha, qué se hizo, decisiones y por qué. Añadir una entrada al terminar cada paso.

## Diseño

- **Pixel art retro**: contornos oscuros de 1-2 px, paleta limitada, sin suavizado (`image-rendering: pixelated`, `imageSmoothingEnabled = false`). En la UI, nada de `border-radius` ni sombras difuminadas: bordes y sombras duras, esquinas con escalón de 2 px (`clip-path`).
- **Paleta**: día con arena, ocre, terracota y cielo turquesa; noche con azul oscuro y neones rosa, cian y amarillo.
- **Ciclo día/noche** ligado a la hora real (tecla `N` para forzarlo en depuración).
- **Sprites por código**, generados en un canvas offscreen al arrancar: avatares como matrices de píxeles con paleta; muebles y edificios como cajas 3D horneadas a pixel art. Nada de imágenes externas.
- **Avatares**: vista diagonal isométrica, sprite base de unos 14x24 px lógicos, cabeza de aproximadamente 1/3 de la altura. Capas apiladas y colores por sustitución de paleta, con caché en canvas offscreen. Colores permitidos en `shared/src/looks.ts`.
- **Fuentes** (Google Fonts, en `client/index.html`): títulos con "Press Start 2P" (`--font-title`); texto con "Pixelify Sans" y "VT323" de respaldo (`--font-text`).
- **Logo**: `client/src/assets/pixel-springs-logo.png` (única imagen externa). Se usa en la pantalla de carga (`#splash` en `client/index.html`, donde también se monta el login) y arriba en el juego (`#logo`). Se dibuja con suavizado normal, no `pixelated`, porque se muestra reducido.
- **`styles.css` se enlaza desde `client/index.html`**, no se importa desde `main.ts`, para que la pantalla de carga tenga estilo antes de que se ejecute el JS.
- **Tokens**: colores de interfaz como variables CSS al principio de `client/src/ui/styles.css`; colores de sprites en `client/src/sprites/palette.ts`. Componente base de ventana en `client/src/ui/window.ts`.

## Entorno

Variables de entorno (solo nombres). Plantillas en los `.env.example`; los `.env` reales no se suben.

- `server/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (secreta, solo servidor), `PORT` (3001 por defecto), `CLIENT_ORIGIN` (`http://localhost:5173` por defecto).
- `client/.env.development.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (pública).
- `client/.env.development` y `client/.env.offline` (en git, sin secretos): `VITE_SERVER_URL`. Vacía = modo local.

## Git

- Remoto: `https://github.com/CeciliaFerraz14/habbo.git`
- Rama principal: `master`
- Ramas de trabajo: no se usan; todo se hace directamente en `master`
- Worktrees: no se usan
- Despliegue: cada `push` a `master` despliega solo el servidor (Render, plan gratuito) y el cliente (Vercel). Con una migración nueva, aplicarla antes del `push`, ensayada con `rollback`, y desplegar con nadie conectado. Un commit solo de documentación lleva `[skip render]` para no reiniciar el servidor.
- Formato de commit: título en español, en presente y sin prefijo de tipo (`Más negocios: pozo, invernadero…`); las tareas de fase llevan prefijo (`Fase 2 · F2-3: login con Supabase Auth`). Cuerpo con viñetas de lo que cambia.

## Errores conocidos

- **Ordenación de profundidad**: el avatar y los muebles deben ordenarse por posición isométrica, o el avatar se dibuja encima de objetos que tiene delante.
- **Suavizado del canvas**: si los sprites salen borrosos, revisar `imageSmoothingEnabled = false` tras cada redimensionado del canvas, porque se reinicia.
- **Inflación de la economía**: si entra más dinero del que sale, los precios pierden sentido. Mantener las salidas de dinero (alquiler, comisión, compras al proveedor).
- **`package-lock.json` cambia al hacer `npm install`** con otra versión de npm (quita campos `libc`). Es ruido: no commitearlo salvo que cambien dependencias.
- **Dos instancias al desplegar**: Render arranca la nueva antes de parar la anterior, y lo que haga un jugador en esos segundos puede perderse. Desplegar con nadie conectado.
- **Los avisos no llegan a quien está desconectado**: no se guardan y hay un tope global de 30.
- TODO: añadir aquí cada problema que vuelva a pasar.
