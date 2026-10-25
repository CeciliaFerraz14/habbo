# Pixel Springs

Juego social web en vista isométrica y pixel art retro. Pixel Springs es un
pueblo de carretera en mitad del desierto, casi abandonado: los jugadores
alquilan locales, abren negocios y encienden sus neones para devolverle la vida.

Proyecto de aprendizaje: el render isométrico, el pathfinding, la ordenación de
profundidad y los sprites están hechos a mano, sin motores de juego.

> En desarrollo. Ahora mismo se puede pasear por una sala, colocar muebles,
> sentarse y chatear. Las escenas del pueblo, los negocios y la economía llegarán
> en los próximos pasos.

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

## Controles

| Acción | Cómo |
|---|---|
| Caminar | Clic en el suelo |
| Sentarse | Clic en una silla o sofá |
| Colocar mueble | Inventario → elegir mueble → clic en la sala |
| Girar mueble | `R` o clic derecho (mientras lo colocas), o botón "Girar" |
| Cancelar | `Esc` |
| Chatear | `Enter`, escribir y `Enter` |

## Estructura

```
client/   Cliente: TypeScript + Vite + Canvas 2D
  src/engine/    Matemáticas isométricas, cámara, renderer, ordenación de profundidad
  src/game/      Transport (conexión con el "servidor"), controlador, interpolación
  src/sprites/   Sprites generados por código (matrices de píxeles y cajas 3D)
  src/ui/        Ventanas, barra inferior, chat
shared/   Estado, acciones, reducer, A* y reglas del juego (cliente y servidor)
server/   Servidor Socket.IO (fase 2, todavía vacío)
```

## Cambiar el aspecto

- Nombre del juego: `shared/src/constants.ts` (`GAME_NAME`).
- Colores de los sprites: `client/src/sprites/palette.ts`.
- Colores de la interfaz: variables CSS al principio de `client/src/ui/styles.css`.
- Muebles: un archivo por mueble en `client/src/sprites/furniture/`.
