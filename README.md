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
   Cada jugador nuevo hace crecer el pueblo: recibe su parcela con **su caravana**
   (con su nombre encima; cualquiera puede entrar de visita) y un **local nuevo**,
   en las **plazas** que hay al otro lado de la carretera, en el mismo mapa (con
   fuente y bancos para sentarse). Caben 4 parcelas por plaza; cuando se llena,
   se abre la siguiente a su derecha.
2. Haz clic en un **local con tablones** para alquilarlo y elige el negocio (puedes
   tener los que puedas pagar). Si dejas de entrar 7 días, el local se libera:
   - **Chatarrería**: produce chapa, madera vieja y neumáticos cada pocos segundos.
   - **Pozo**: produce agua.
   - **Invernadero**: produce fruta.
   - **Campo de algodón**: produce tela.
   - **Taller de muebles**: convierte materiales en muebles según recetas y fabrica
     fichas (con chapa) para los recreativos.
   - **Tienda de decoración**: pones muebles a la venta con el precio que quieras.
   - **Tienda de ropa**: coses prendas con tela (sombrero de cowboy, gorra, chaqueta
     vaquera, chaleco y botas) en el color que elijas, y las pones a la venta en
     burros de ropa. Los viajeros que compran una prenda se van con ella puesta.
   - **Diner**, **Bar**, **Recreativos**, **Peluquería** y **Frutería**: los viajeros
     pagan por el servicio (menú del día, ronda, partida, corte de pelo, bolsa de
     fruta). Gastan agua, fruta o fichas (las fichas se fabrican en el taller), que
     dejas en el almacén del local con "Reponer", y tú pones el precio.
3. Dentro de cada local, haz clic en su **puesto de trabajo** (montón de chatarra,
   pozo, bancal, algodonal, banco de trabajo, mostrador, máquina de coser, plancha,
   barra con grifo, cambio de fichas, sillón de barbero o puesto de fruta) para
   gestionarlo. Desde ahí
   también eliges la **plantilla de fachada** (Clásica, Diner, Garaje, Boutique,
   Saloon o Recreativos); el cartel de neón muestra el icono del negocio para que se
   sepa desde la calle qué es cada local.
4. Los **viajeros** paran con sus coches, entran en las tiendas abiertas y compran
   si el precio les parece bien. Tu tienda vende aunque no estés.
5. Una vez al día se cobra el **alquiler** de tus locales. Si no puedes pagarlo,
   pierdes el local (lo que había dentro vuelve a tu inventario).
   Para no quedarte nunca a cero, una vez al día puedes recoger la **subvención
   del pueblo** con el botón de la cartera (no se acumula si no la recoges).
6. Al final de la calle está la **gasolinera de Hank**. Dentro:
   - En el **mostrador**: comprar y vender materiales (con una oferta distinta
     cada día), los **encargos** de Hank (muebles que paga por encima de su
     valor; el primero que los entrega se lo lleva), **turnos** en la caja
     (sueldo más propinas por cada coche que reposta) y **rasca y gana**.
   - La **máquina de refrescos** (tu avatar lleva la lata en la mano un rato),
     la **máquina recreativa** (con récord del pueblo) y el **tablón de
     anuncios**, con todos los negocios, los encargos y la oferta del día.
   - De vez en cuando para un **autobús de turistas** y bajan varios viajeros a la vez.
   Los muebles también se compran en las tiendas de otros jugadores.
7. **Niveles y rangos**: ganas experiencia (XP) vendiendo, fabricando, recogiendo
   materiales, entregando encargos, trabajando en la gasolinera, abriendo negocios
   nuevos y entrando a jugar cada día. Con la XP subes de rango (de Forastero a
   Alcalde de Pixel Springs) y cada rango da una recompensa: dinero, muebles, más
   huecos en el taller y la tienda, más subvención o descuento con Hank. El rango
   Cowboy del asfalto desbloquea el sombrero de vaquero y colores nuevos.
   Cada local también tiene **nivel**: se mejora con dinero y da más huecos, y cada
   negocio tiene decoración propia en tres niveles.
   En un **taller público** los demás solo pueden fabricar muebles; los materiales y
   la tienda de ropa son siempre solo del dueño.
8. Algunos **vecinos venden muebles exclusivos**: tócalos estando cerca de ellos.
9. Decora tu caravana con lo que compres o fabriques.
10. **Prendas**: las que cosas o compres van al inventario. Desde el botón "Avatar"
   te las pones (una por ranura: cabeza, torso y pies) o te las quitas. Si vendes la
   última prenda de un tipo y color que llevas puesta, se te quita.

## Controles

| Acción | Cómo |
|---|---|
| Caminar | Clic en el suelo |
| Mover el mapa | Arrastrar con el ratón (la cámara vuelve al jugador al caminar) |
| Zoom | Rueda del ratón, botones `+` / `−` (abajo a la derecha) o teclas `+` y `-` |
| Entrar en un edificio | Clic en el edificio o en su puerta |
| Sentarse | Clic en un sillón o taburete |
| Colocar mueble | Inventario → elegir mueble → clic en la sala (solo en tu caravana y tus locales) |
| Girar mueble | `R` o clic derecho (mientras lo colocas), o botón "Girar" |
| Cancelar | `Esc` |
| Chatear | `Enter`, escribir y `Enter` (prueba a saludar a los vecinos) |
| Cambiar tu aspecto y ponerte prendas | Botón "Avatar" |
| Comprar en una tienda ajena | Clic en su mostrador, su máquina de coser o en un producto |
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
| Fianza, alquiler, color del neón y fachada inicial de cada negocio | `BUSINESSES` |
| Qué y cada cuánto produce cada productor (chatarrería, pozo, invernadero, campo de algodón) | `production` de cada negocio |
| Qué gasta y cuánto vale cada servicio (diner, bar, recreativos, peluquería, frutería) | `service` de cada negocio |
| Cuánto cabe en el almacén de un servicio y límites de precio | `services` |
| Nombre y colores de las plantillas de fachada | `FACADES` (el dibujo, en `client/src/sprites/structures/shop.ts`) |
| Cada cuánto se cobra el alquiler | `rent.periodSeconds` |
| Cuánto da la subvención del pueblo y cada cuánto | `subsidy` |
| Recetas del taller (materiales y tiempo): muebles y fichas | `recipes`, `materialRecipes` |
| Recetas de la tienda de ropa (tela y tiempo de cada prenda) | `garmentRecipes` |
| Valor de referencia de cada mueble y de cada prenda | `baseValue`, `garmentValue` (precio sugerido y referencia de los viajeros) |
| Tamaño de las tiendas y comisión por venta | `store` |
| XP, rangos y recompensas, y mejoras de local | `levels`, `upgrades` |
| Vecinos que venden muebles exclusivos | `vendors` |
| Precios del proveedor, lo que paga al comprarte y la oferta del día | `supplier` |
| Encargos de Hank, turnos, rasca y gana, máquinas, coches que repostan y autobús | `gasStation` |
| Frecuencia de coches, probabilidad de parar y forma de comprar de los viajeros | `travelers` |

Cómo fluye el dinero:

- **Entra** con los **viajeros**: traen dinero de fuera y lo gastan en las tiendas.
  También con la **subvención** diaria, los **encargos** y **turnos** de la
  gasolinera y lo que paga el proveedor por tus materiales.
- **Sale** con el **alquiler** de los locales, la **comisión** de cada venta, las
  compras al **proveedor** de materiales, el **rasca y gana** (de media devuelve
  menos de lo que cuesta) y las máquinas de la gasolinera.
- **Circula** entre jugadores cuando unos compran a otros.

Pistas para equilibrar:

- Si los jugadores acumulan dinero demasiado rápido: sube `rent`, la comisión o
  `maxPriceRatio` más bajo (viajeros más exigentes).
- Los viajeros se reparten entre todas las tiendas y servicios abiertos: con
  muchos negocios, cada uno recibe menos clientes.
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
server/   Servidor Socket.IO: simulación compartida, login y guardado en Supabase
supabase/ Migraciones de la base de datos
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
- Colores permitidos para los avatares y para las prendas: `shared/src/looks.ts` (`GARMENT_COLORS`).
- Prendas (nombre y ranura): `shared/src/garments.ts`; su dibujo, en `client/src/sprites/avatar.ts`.
