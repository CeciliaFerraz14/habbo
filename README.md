# Pixel Springs

Juego social web en vista isométrica y pixel art retro. Pixel Springs es un
pueblo de carretera en mitad del desierto, casi abandonado: los jugadores
alquilan locales, abren negocios y encienden sus neones para devolverle la vida.
Por la carretera pasan viajeros, y cuanto más vivo está el pueblo, más paran a
comprar.

Proyecto de aprendizaje: el render isométrico, el pathfinding, la ordenación de
profundidad, la iluminación y los sprites están hechos a mano, sin motores de juego.

## Requisitos

- Node.js 20 o superior (probado con Node 24)

## Arrancar

```bash
npm install
npm run dev
```

Abre http://localhost:5173

> En Windows, si PowerShell dice que "la ejecución de scripts está deshabilitada",
> ejecuta una vez `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
> o usa `npm.cmd run dev`.

## Cómo se juega

1. Empiezas en **tu caravana** con 500 $ y unos muebles. Sal por la puerta a la **Calle Mayor**.
2. Haz clic en un **local con tablones** para alquilarlo y elige el negocio:
   - **Chatarrería**: produce chapa, madera vieja y neumáticos cada pocos segundos.
   - **Taller de muebles**: convierte materiales en muebles según recetas.
   - **Tienda de decoración**: pones muebles a la venta con el precio que quieras.
3. Dentro de cada local, haz clic en su **puesto de trabajo** (montón de chatarra,
   banco de trabajo o mostrador) para gestionarlo.
4. Los **viajeros** paran con sus coches, entran en las tiendas abiertas y compran
   si el precio les parece bien. Tu tienda vende aunque no estés.
5. Cada 2 minutos se cobra el **alquiler** de tus locales. Si no puedes pagarlo,
   pierdes el local (lo que había dentro vuelve a tu inventario).
6. También puedes comprar materiales en la **gasolinera** (proveedor) y muebles en
   las tiendas de los vecinos Rosa y Elmer.
7. Decora tu caravana con lo que compres o fabriques.

## Controles

| Acción | Cómo |
|---|---|
| Caminar | Clic en el suelo |
| Entrar en un edificio | Clic en el edificio o en su puerta |
| Sentarse | Clic en un sillón o taburete |
| Colocar mueble | Inventario → elegir mueble → clic en la sala (solo en tu caravana y tus locales) |
| Girar mueble | `R` o clic derecho (mientras lo colocas), o botón "Girar" |
| Cancelar | `Esc` |
| Chatear | `Enter`, escribir y `Enter` (prueba a saludar a los vecinos) |
| Cambiar tu aspecto | Botón "Avatar" |
| Forzar día / atardecer / noche / amanecer (depuración) | `N` (otra vez para volver a la hora real) |

En desarrollo, el estado del juego está disponible en la consola del navegador:
`game.state` para verlo y `game.dispatch({...})` para lanzar acciones a mano.

## Ajustar la economía

**Todos los números de la economía están en un solo archivo:
[`shared/src/economy.config.ts`](shared/src/economy.config.ts).** Los tiempos se
escriben en segundos.

| Quiero cambiar... | Dónde (dentro de `ECONOMY`) |
|---|---|
| Dinero inicial / kit de muebles inicial | `startingMoney`, `starterInventory` |
| Fianza, alquiler y color del neón de cada negocio | `businesses` |
| Cada cuánto se cobra el alquiler | `rent.periodSeconds` |
| Qué y cada cuánto produce la chatarrería | `scrapyard` |
| Recetas del taller (materiales y tiempo) | `recipes` |
| Valor de referencia de cada mueble | `baseValue` (precio sugerido y referencia de los viajeros) |
| Tamaño de las tiendas y comisión por venta | `store` |
| Tiendas de los NPC y su reposición | `npcStores`, `npcRestock` |
| Precios del proveedor de materiales | `supplier` |
| Frecuencia de coches, probabilidad de parar y forma de comprar de los viajeros | `travelers` |

Cómo fluye el dinero:

- **Entra** con los **viajeros**: traen dinero de fuera y lo gastan en las tiendas.
- **Sale** con el **alquiler** de los locales, la **comisión** de cada venta y las
  compras al **proveedor** de materiales.
- **Circula** entre jugadores (y tiendas de NPC) cuando unos compran a otros.

Pistas para equilibrar:

- Si los jugadores acumulan dinero demasiado rápido: sube `rent`, la comisión o
  `maxPriceRatio` más bajo (viajeros más exigentes).
- Si nadie consigue ganar dinero: baja `carIntervalSeconds` (más coches), sube
  `stopChancePerBusiness` o `budget`.
- La probabilidad de que un coche pare es
  `baseStopChance + stopChancePerBusiness × negocios abiertos` (con tope en `maxStopChance`).
- La de que un viajero compre es
  `baseBuyChance + varietyBonus × tipos distintos a la venta + bargainBonus × (1 - precio / valor)`.

Toda la lógica de economía (`shared/src/economy.ts`, `travelers.ts`, `npcs.ts`) es
**determinista**: el tiempo se mide en ticks (`state.tick`) y el azar sale de una
semilla guardada en el estado (`random.ts`). Así, en la fase 2, el servidor podrá
ejecutar exactamente el mismo código para validar lo que hacen los jugadores.

## Estructura

```
client/   Cliente: TypeScript + Vite + Canvas 2D
  src/engine/    Matemáticas isométricas, cámara, renderer, profundidad, día/noche e iluminación
  src/game/      Transport (conexión con el "servidor"), controlador, interpolación de avatares y coches
  src/sprites/   Sprites generados por código: avatares (matrices de píxeles), muebles y
                 edificios (cajas 3D horneadas a pixel art), paleta de colores
  src/ui/        Ventanas, barra inferior, chat, cartera, negocios, tiendas, editor de avatar
shared/   Todo lo que también ejecutará el servidor:
  src/scene.ts, world.ts       Escenas (calle, caravana, locales) y mundo inicial
  src/actions.ts, reducer.ts   Acciones y cómo cambian el estado
  src/simulation.ts            El tick: economía, NPC, coches y movimiento
  src/economy*.ts              Negocios, tiendas, alquiler y configuración
  src/npcs.ts, travelers.ts    Vecinos, viajeros y coches
  src/pathfinding.ts           A*
server/   Servidor Socket.IO (fase 2, todavía vacío)
```

## Arquitectura

```
Interfaz / NPC ──acción──▶ Transport ──▶ reducer + tick (en /shared)
                                              │
Renderer ◀──────────── nuevo estado ──────────┘
```

- El estado del juego es inmutable y solo cambia con **acciones** (`MOVE`, `SAY`,
  `RENT_LOT`, `CRAFT`, `LIST_ITEM`, `BUY_ITEM`...).
- `LocalTransport` simula el servidor dentro del navegador. En la fase 2 se
  sustituirá por un transporte con Socket.IO sin tocar el resto del cliente.
- El renderer solo lee el estado y dibuja la escena en la que está el jugador.

## Cambiar el aspecto

- Nombre del juego: `shared/src/constants.ts` (`GAME_NAME`).
- Colores de los sprites: `client/src/sprites/palette.ts`.
- Colores de la interfaz: variables CSS al principio de `client/src/ui/styles.css`.
- Muebles: un archivo por mueble en `client/src/sprites/furniture/`.
- Edificios y elementos de la calle: `client/src/sprites/structures/`.
- Colores permitidos para los avatares: `shared/src/looks.ts`.
